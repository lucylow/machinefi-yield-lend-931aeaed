// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./HardwareNFT.sol";
import "./YieldToken.sol";
import "./RevenueTypes.sol";
import "./interfaces/IRevenueRouter.sol";
import "./interfaces/IFeeDiscountModule.sol";
import "./interfaces/IComplianceHook.sol";
import "./interfaces/IDePINClassRegistry.sol";
import "./interfaces/IYieldUpdateMirror.sol";
import "./interfaces/IEmergencyControls.sol";
import "./libraries/LendingAccountingLib.sol";

/**
 * @title LendingPool
 * @notice DePIN hardware-backed lending with explicit protocol risk modes, collateral reference TTL,
 *         optional `IDePINClassRegistry` haircuts, liquidator role gating, on-chain health factor (WAD),
 *         partial repayment, and deterministic interest accrual via `LendingAccountingLib`.
 *
 * TRUST BOUNDARIES:
 * - Collateral value: internal anchors from registry (if set) or legacy class constants; never raw off-chain input on borrow.
 * - Oracle `updateCollateralValue(nftId, value)` is privileged; stale references block liquidation unless governance enables override.
 * - Device gate: `HardwareNFT.canUseAsCollateral` for new borrows; `riskAdjustedCollateralWad` for LTV; bond/release hooks on escrow.
 * - Compliance hook: optional institutional gating; zero address = disabled.
 * - BNB stack: optional `IYieldUpdateMirror` applies conservative haircuts from opBNB↔BSC sync + Greenfield anchors (§15).
 *
 * GOVERNANCE (§14): protocol configuration uses `GOVERNOR_ROLE` (intended holder: TimelockController).
 * `PAUSER_ROLE` is narrow emergency stop; `LIQUIDATOR_ROLE` gates liquidations when restricted.
 * Global `Pausable` blocks new risk (borrow / liquidate / oracle pushes) but repayment stays available (§14.7).
 */
contract LendingPool is ReentrancyGuard, AccessControl, Pausable, IEmergencyControls {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Incident / stress states (conservative borrow + liquidation policy). See `IEmergencyControls`.
    uint256 public liquidationThreshold = 7500;
    uint256 public maxInitialLTV = 7000;
    uint256 public constant LIQUIDATION_BONUS = 105;
    uint256 public constant GRACE_PERIOD = 24 hours;
    /// @notice Max age of `lastCollateralRefAt` for liquidation when override is disabled (deterministic oracle staleness guard).
    uint256 public constant MAX_COLLATERAL_REF_STALE = 48 hours;
    /// @notice Under elevated risk, proof must be newer than this (seconds).
    uint256 public constant ELEVATED_RISK_MAX_PROOF_AGE = 3 days;
    /// @notice Hard cap on origination-fee discount from `IFeeDiscountModule` (bps shaved off class origination rate).
    uint16 public constant MAX_ORIGINATION_DISCOUNT_BPS = 25;

    IERC20 public stablecoin;
    HardwareNFT public hardwareNFT;
    address public oracle;
    address public revenueRouter;
    /// @notice Optional `MACHStaking` (or other `IFeeDiscountModule`) for origination fee reduction.
    address public feeDiscountModule;
    address public complianceHook;
    IDePINClassRegistry public classRegistry;
    /// @notice BSC mirror of opBNB epoch summaries + Greenfield anchors; zero = disabled (legacy deploys).
    IYieldUpdateMirror public yieldUpdateMirror;

    IEmergencyControls.ProtocolRiskMode public riskMode;
    /// @notice When true, oracle-driven collateral pushes are rejected (BSC settlement safety); governance clears after review.
    bool public oracleUpdatesPaused;
    /// @notice If true, only `LIQUIDATOR_ROLE` may call `liquidate`.
    bool public restrictLiquidationToLiquidatorRole;
    /// @notice If true, allow liquidation even when collateral reference is older than `MAX_COLLATERAL_REF_STALE` (governance emergency).
    bool public allowLiquidationWithStaleCollateralRef;
    /// @notice Emergency: blocks `repay` / `repayPartial` when true (global `pause` still allows repayment).
    bool public repayPaused;
    /// @notice Minimum health factor (1e18 = at liquidation line) required right after origination.
    uint256 public minPostBorrowHealthFactorWad;
    /// @notice HF band: Healthy if HF >= this WAD (default 1.05e18).
    uint256 public cautionHealthMinWad;
    /// @notice HF band: Caution if HF in [atRiskHealthMinWad, cautionHealthMinWad).
    uint256 public atRiskHealthMinWad;

    /// @notice HF scale: 1e18 means exactly at governance liquidation LTV line (before grace period).
    uint256 public constant HEALTH_FACTOR_ONE = 1e18;
    /// @notice NFT collateral is indivisible: liquidation seizes the device NFT atomically. Close factor reserved for future share-wrapped collateral.
    uint16 public constant LIQUIDATION_CLOSE_FACTOR_BPS = 10000;

    uint256 public totalDebt;
    uint256 public totalCollateral;

    struct ClassFees {
        uint16 originationFeeBps;
        uint16 verificationFeeBps;
        uint16 borrowerAprBps;
        uint16 lenderAprBps;
        uint16 liquidationFeeBps;
    }

    mapping(uint8 => ClassFees) public classFees;

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    modifier whenOracleUpdatesNotPaused() {
        if (oracleUpdatesPaused) revert OracleUpdatesPaused();
        _;
    }

    modifier whenRepayNotPaused() {
        if (repayPaused) revert RepayPaused();
        _;
    }

    struct Position {
        uint256 debt;
        uint256 collateralValue;
        uint256 ltv;
        uint256 yieldPercentage;
        address yieldToken;
        address borrower;
        uint256 lastUpdateTimestamp;
        uint256 accruedLpInterest;
        uint256 accruedProtocolInterest;
        uint256 liquidationEligibleAt;
        uint64 lastCollateralRefAt;
    }

    mapping(uint256 => Position) public positions;

    error ZeroAddress();
    error NotOracle();
    error BorrowNotAllowed();
    error LiquidationNotAllowed();
    error CollateralRefStale();
    error NotLiquidator();
    error InvalidThreshold();
    error NoPosition();
    error MaxLtvOutOfBounds();
    error MaxLtvNotBelowLiquidation();
    error OracleUpdatesPaused();
    error UnsafeBorrowHealth();
    error InvalidRepayAmount();
    error RepayPaused();
    error HealthBandBounds();
    error MinPostBorrowHealthOutOfBounds();

    event Deposited(
        address indexed borrower,
        uint256 indexed nftId,
        uint256 principal,
        uint256 originationFee,
        uint256 verificationFee,
        uint256 netToBorrower,
        uint256 yieldPercentage
    );
    event Repaid(
        address indexed borrower,
        uint256 indexed nftId,
        uint256 principalPaid,
        uint256 lpInterestPaid,
        uint256 protocolInterestPaid,
        uint256 remainingPrincipal,
        uint256 remainingAccruedInterest
    );
    event LoanRepayment(
        address indexed payer,
        uint256 indexed nftId,
        uint256 protocolInterestPaid,
        uint256 lpInterestPaid,
        uint256 principalPaid,
        uint256 remainingDebt,
        uint256 remainingAccruedInterest,
        bool fullClose
    );
    event BorrowOpened(
        address indexed borrower,
        uint256 indexed nftId,
        uint256 principal,
        uint256 collateralValueWad,
        uint256 maxLtvBps,
        uint256 liquidationThresholdBps,
        uint256 healthFactorWad,
        uint8 healthBand,
        uint8 deviceClass,
        uint64 lastCollateralRefAt
    );
    event HealthFactorUpdated(
        uint256 indexed nftId, uint256 hfWad, uint8 band, uint256 totalOwed, uint256 collateralWad
    );
    event PositionStateChanged(uint256 indexed nftId, uint8 band);
    event CollateralReleasedFromLoan(uint256 indexed nftId, address indexed borrower, bool fullClose);
    event RepayPausedUpdated(bool paused);
    event MinPostBorrowHealthFactorUpdated(uint256 wad);
    event HealthBandParamsUpdated(uint256 cautionMinWad, uint256 atRiskMinWad);
    event Liquidated(address indexed liquidator, uint256 indexed nftId, uint256 amountRecovered, uint256 protocolLiquidationFee);
    event LiquidationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event CollateralUpdated(uint256 indexed nftId, uint256 oldValue, uint256 newValue, uint256 newLtv);
    event LiquidationWarning(uint256 indexed nftId, uint256 ltv, uint256 eligibleAt);
    event InterestAccrued(uint256 indexed nftId, uint256 borrowerInterestDelta, uint256 totalDebtPlusInterest);
    event FeeCharged(
        RevenueSource indexed feeSource,
        uint256 indexed nftId,
        address indexed payer,
        uint256 amount
    );
    event FeeDiscountApplied(
        address indexed borrower,
        uint256 indexed nftId,
        uint16 discountBps,
        uint256 originationSaved
    );
    event FeeDiscountModuleUpdated(address indexed module);
    event RevenueRouterUpdated(address indexed router);
    event ClassFeesUpdated(uint8 indexed deviceClass, ClassFees fees);
    event ComplianceHookUpdated(address indexed hook);
    event ClassRegistryUpdated(address indexed registry);
    event ProtocolRiskModeUpdated(IEmergencyControls.ProtocolRiskMode indexed mode);
    event OracleUpdatesPausedUpdated(bool paused);
    event MaxInitialLTVUpdated(uint256 oldBps, uint256 newBps);
    event RestrictLiquidationToRoleUpdated(bool restricted);
    event AllowStaleCollateralLiquidationUpdated(bool allowed);
    event YieldUpdateMirrorUpdated(address indexed mirror);

    constructor(address _stablecoin, address _hardwareNFT) {
        if (_stablecoin == address(0) || _hardwareNFT == address(0)) revert ZeroAddress();
        stablecoin = IERC20(_stablecoin);
        hardwareNFT = HardwareNFT(_hardwareNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender);

        classFees[0] = ClassFees(60, 25, 900, 720, 80);
        classFees[1] = ClassFees(45, 20, 800, 680, 60);
        classFees[2] = ClassFees(30, 15, 650, 580, 45);
        classFees[3] = ClassFees(50, 25, 800, 650, 70);

        minPostBorrowHealthFactorWad = 1.01e18;
        cautionHealthMinWad = 1.05e18;
        atRiskHealthMinWad = 1.02e18;
    }

    function _deviceClass(uint256 nftId) internal view returns (uint8) {
        return hardwareNFT.deviceClass(nftId);
    }

    function _classFeeStruct(uint256 nftId) internal view returns (ClassFees memory) {
        return classFees[_deviceClass(nftId)];
    }

    function _riskAllowsBorrow() internal view {
        IEmergencyControls.ProtocolRiskMode m = riskMode;
        if (
            m == IEmergencyControls.ProtocolRiskMode.Frozen || m == IEmergencyControls.ProtocolRiskMode.EmergencyPause
                || m == IEmergencyControls.ProtocolRiskMode.StaleData
        ) {
            revert BorrowNotAllowed();
        }
        /// @dev RecoveryMode: unwind/repay only; no new risk to the pool (§16.10 incident ladder).
        if (m == IEmergencyControls.ProtocolRiskMode.RecoveryMode) {
            revert BorrowNotAllowed();
        }
    }

    function _riskAllowsLiquidation() internal view {
        if (
            riskMode == IEmergencyControls.ProtocolRiskMode.Frozen
                || riskMode == IEmergencyControls.ProtocolRiskMode.EmergencyPause
        ) {
            revert LiquidationNotAllowed();
        }
    }

    function _onlyLiquidator() internal view {
        if (restrictLiquidationToLiquidatorRole && !hasRole(LIQUIDATOR_ROLE, msg.sender)) {
            revert NotLiquidator();
        }
    }

    function _collateralRefFresh(uint64 lastRef) internal view returns (bool) {
        return block.timestamp <= uint256(lastRef) + MAX_COLLATERAL_REF_STALE;
    }

    /// @dev Tighter of pool governance threshold and class registry (more conservative for lenders).
    function _effectiveLiquidationThreshold(uint256 nftId) internal view returns (uint256 thr) {
        thr = liquidationThreshold;
        if (address(classRegistry) != address(0)) {
            uint16 lt = classRegistry.getClassConfig(_deviceClass(nftId)).liquidationThresholdBps;
            if (lt > 0 && lt < thr) thr = lt;
        }
    }

    function _viewTotalOwed(uint256 nftId, Position storage pos) internal view returns (uint256) {
        if (pos.debt == 0) return 0;
        uint256 elapsed = block.timestamp - pos.lastUpdateTimestamp;
        ClassFees memory cf = _classFeeStruct(nftId);
        (uint256 lenderChunk, uint256 protocolChunk, ) =
            LendingAccountingLib.accrueInterestChunks(pos.debt, cf.borrowerAprBps, cf.lenderAprBps, elapsed);
        return pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest + lenderChunk + protocolChunk;
    }

    function _healthFactorView(uint256 nftId, Position storage pos) internal view returns (uint256 hfWad) {
        if (pos.yieldToken == address(0)) return type(uint256).max;
        uint256 owed = _viewTotalOwed(nftId, pos);
        return LendingAccountingLib.healthFactorWad(pos.collateralValue, owed, _effectiveLiquidationThreshold(nftId));
    }

    function _emitHealth(uint256 nftId, Position storage pos) internal {
        if (pos.yieldToken == address(0)) return;
        uint256 owed = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
        uint256 liqThr = _effectiveLiquidationThreshold(nftId);
        uint256 hf = LendingAccountingLib.healthFactorWad(pos.collateralValue, owed, liqThr);
        uint8 band = LendingAccountingLib.healthBand(hf, cautionHealthMinWad, atRiskHealthMinWad, HEALTH_FACTOR_ONE);
        emit HealthFactorUpdated(nftId, hf, band, owed, pos.collateralValue);
        emit PositionStateChanged(nftId, band);
    }

    // --- Admin / governance (Timelock-holding GOVERNOR_ROLE) ---
    function setGovernor(address _governor) external onlyRole(GOVERNOR_ROLE) {
        _grantRole(GOVERNOR_ROLE, _governor);
    }

    function setLiquidator(address _liquidator) external onlyRole(GOVERNOR_ROLE) {
        _grantRole(LIQUIDATOR_ROLE, _liquidator);
    }

    function setLiquidationThreshold(uint256 newThreshold) external onlyRole(GOVERNOR_ROLE) {
        if (newThreshold <= maxInitialLTV || newThreshold > 9500) revert InvalidThreshold();
        emit LiquidationThresholdUpdated(liquidationThreshold, newThreshold);
        liquidationThreshold = newThreshold;
    }

    function setOracle(address _oracle) external onlyRole(GOVERNOR_ROLE) {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
    }

    function setRevenueRouter(address _router) external onlyRole(GOVERNOR_ROLE) {
        if (revenueRouter != address(0)) {
            stablecoin.safeApprove(revenueRouter, 0);
        }
        revenueRouter = _router;
        if (_router != address(0)) {
            stablecoin.safeApprove(_router, type(uint256).max);
        }
        emit RevenueRouterUpdated(_router);
    }

    function setFeeDiscountModule(address module) external onlyRole(GOVERNOR_ROLE) {
        feeDiscountModule = module;
        emit FeeDiscountModuleUpdated(module);
    }

    function setClassFees(uint8 deviceClass, ClassFees calldata fees) external onlyRole(GOVERNOR_ROLE) {
        require(fees.borrowerAprBps >= fees.lenderAprBps, "Spread");
        require(fees.borrowerAprBps <= 5000 && fees.lenderAprBps <= 5000, "Apr cap");
        classFees[deviceClass] = fees;
        emit ClassFeesUpdated(deviceClass, fees);
    }

    function setComplianceHook(address _hook) external onlyRole(GOVERNOR_ROLE) {
        complianceHook = _hook;
        emit ComplianceHookUpdated(_hook);
    }

    /// @notice Bounded initial LTV cap (bps). Must stay below `liquidationThreshold` (§14.4 / §14.6).
    function setMaxInitialLTV(uint256 bps) external onlyRole(GOVERNOR_ROLE) {
        if (bps < 3000 || bps > 9000) revert MaxLtvOutOfBounds();
        if (bps >= liquidationThreshold) revert MaxLtvNotBelowLiquidation();
        emit MaxInitialLTVUpdated(maxInitialLTV, bps);
        maxInitialLTV = bps;
    }

    function setClassRegistry(address registry) external onlyRole(GOVERNOR_ROLE) {
        classRegistry = IDePINClassRegistry(registry);
        emit ClassRegistryUpdated(registry);
    }

    function setProtocolRiskMode(IEmergencyControls.ProtocolRiskMode mode) external onlyRole(GOVERNOR_ROLE) {
        riskMode = mode;
        emit ProtocolRiskModeUpdated(mode);
    }

    function setOracleUpdatesPaused(bool paused) external onlyRole(GOVERNOR_ROLE) {
        oracleUpdatesPaused = paused;
        emit OracleUpdatesPausedUpdated(paused);
    }

    function setRestrictLiquidationToLiquidatorRole(bool restricted) external onlyRole(GOVERNOR_ROLE) {
        restrictLiquidationToLiquidatorRole = restricted;
        emit RestrictLiquidationToRoleUpdated(restricted);
    }

    function setAllowLiquidationWithStaleCollateralRef(bool allowed) external onlyRole(GOVERNOR_ROLE) {
        allowLiquidationWithStaleCollateralRef = allowed;
        emit AllowStaleCollateralLiquidationUpdated(allowed);
    }

    function setYieldUpdateMirror(address mirror) external onlyRole(GOVERNOR_ROLE) {
        yieldUpdateMirror = IYieldUpdateMirror(mirror);
        emit YieldUpdateMirrorUpdated(mirror);
    }

    function setRepayPaused(bool paused) external onlyRole(GOVERNOR_ROLE) {
        repayPaused = paused;
        emit RepayPausedUpdated(paused);
    }

    /// @notice Lower bound on post-origination HF (WAD). Keeps a buffer vs the liquidation line.
    function setMinPostBorrowHealthFactorWad(uint256 wad) external onlyRole(GOVERNOR_ROLE) {
        if (wad < HEALTH_FACTOR_ONE || wad > HEALTH_FACTOR_ONE * 15 / 10) revert MinPostBorrowHealthOutOfBounds();
        minPostBorrowHealthFactorWad = wad;
        emit MinPostBorrowHealthFactorUpdated(wad);
    }

    /// @notice Band thresholds for analytics / UI; must satisfy `caution > atRisk > 1e18`.
    function setHealthBandThresholds(uint256 cautionMinWad, uint256 atRiskMinWad) external onlyRole(GOVERNOR_ROLE) {
        if (cautionMinWad <= atRiskMinWad || atRiskMinWad <= HEALTH_FACTOR_ONE) revert HealthBandBounds();
        if (cautionMinWad > HEALTH_FACTOR_ONE * 2) revert HealthBandBounds();
        cautionHealthMinWad = cautionMinWad;
        atRiskHealthMinWad = atRiskMinWad;
        emit HealthBandParamsUpdated(cautionMinWad, atRiskMinWad);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // --- Core ---
    function deposit(uint256 nftId, uint256 yieldPercentage, uint256 borrowAmount) external nonReentrant whenNotPaused {
        _riskAllowsBorrow();
        if (riskMode == IEmergencyControls.ProtocolRiskMode.ElevatedRisk) {
            if (block.timestamp > hardwareNFT.lastProofAt(nftId) + ELEVATED_RISK_MAX_PROOF_AGE) revert BorrowNotAllowed();
        }

        if (hardwareNFT.ownerOf(nftId) != msg.sender) revert BorrowNotAllowed();
        if (positions[nftId].debt != 0) revert BorrowNotAllowed();
        if (yieldPercentage == 0 || yieldPercentage > 100) revert BorrowNotAllowed();
        if (borrowAmount == 0) revert BorrowNotAllowed();
        if (!hardwareNFT.canUseAsCollateral(nftId)) revert BorrowNotAllowed();
        if (address(yieldUpdateMirror) != address(0) && !yieldUpdateMirror.isBorrowAllowed(nftId)) {
            revert BorrowNotAllowed();
        }

        if (complianceHook != address(0)) {
            (bool ok, ) = IComplianceHook(complianceHook).canOpenPosition(nftId, msg.sender);
            if (!ok) revert BorrowNotAllowed();
        }

        hardwareNFT.transferFrom(msg.sender, address(this), nftId);
        hardwareNFT.onCollateralBond(nftId, nftId);

        string memory name = string(abi.encodePacked("YieldToken_", Strings.toString(nftId)));
        string memory symbol = string(abi.encodePacked("yTKN_", Strings.toString(nftId)));
        YieldToken yToken = new YieldToken(
            name,
            symbol,
            address(this),
            address(hardwareNFT),
            yieldPercentage,
            address(stablecoin)
        );

        (uint256 collateral, uint256 maxLtvBps) = _calculateCollateralAndMaxLtv(nftId);
        if (collateral == 0) revert BorrowNotAllowed();

        if (address(classRegistry) != address(0)) {
            uint8 classId = _deviceClass(nftId);
            IDePINClassRegistry.ClassConfig memory cfg = classRegistry.getClassConfig(classId);
            if (hardwareNFT.yieldConfidenceTier(nftId) < cfg.minConfidenceToBorrow) revert BorrowNotAllowed();
        }

        uint256 maxBorrow = (collateral * maxLtvBps) / 10000;
        if (borrowAmount > maxBorrow) revert BorrowNotAllowed();

        ClassFees memory cf = _classFeeStruct(nftId);
        uint16 discountBps = 0;
        if (feeDiscountModule != address(0)) {
            discountBps = IFeeDiscountModule(feeDiscountModule).originationDiscountBps(msg.sender);
            if (discountBps > MAX_ORIGINATION_DISCOUNT_BPS) {
                discountBps = MAX_ORIGINATION_DISCOUNT_BPS;
            }
        }
        uint256 baseOrigBps = cf.originationFeeBps;
        uint256 effOrigBps = baseOrigBps > discountBps ? baseOrigBps - discountBps : 0;
        uint256 originationFee = (borrowAmount * effOrigBps) / 10000;
        uint256 verificationFee = (borrowAmount * cf.verificationFeeBps) / 10000;
        uint256 feeTotal = originationFee + verificationFee;
        if (borrowAmount <= feeTotal) revert BorrowNotAllowed();
        uint256 netToBorrower = borrowAmount - feeTotal;
        if (discountBps > 0) {
            uint256 origWithoutDiscount = (borrowAmount * baseOrigBps) / 10000;
            uint256 saved = origWithoutDiscount > originationFee ? origWithoutDiscount - originationFee : 0;
            emit FeeDiscountApplied(msg.sender, nftId, discountBps, saved);
        }

        if (stablecoin.balanceOf(address(this)) < borrowAmount) revert BorrowNotAllowed();

        uint256 liqThrOpen = _effectiveLiquidationThreshold(nftId);
        uint256 hfOpen = LendingAccountingLib.healthFactorWad(collateral, borrowAmount, liqThrOpen);
        if (hfOpen < minPostBorrowHealthFactorWad) revert UnsafeBorrowHealth();

        // Checks-effects-interactions: commit position before external calls.
        positions[nftId] = Position({
            debt: borrowAmount,
            collateralValue: collateral,
            ltv: (borrowAmount * 10000) / collateral,
            yieldPercentage: yieldPercentage,
            yieldToken: address(yToken),
            borrower: msg.sender,
            lastUpdateTimestamp: block.timestamp,
            accruedLpInterest: 0,
            accruedProtocolInterest: 0,
            liquidationEligibleAt: 0,
            lastCollateralRefAt: uint64(block.timestamp)
        });
        totalDebt += borrowAmount;
        totalCollateral += collateral;

        yToken.mint(address(this), collateral);
        stablecoin.safeTransfer(msg.sender, netToBorrower);

        if (revenueRouter != address(0)) {
            if (originationFee > 0) {
                emit FeeCharged(RevenueSource.Origination, nftId, msg.sender, originationFee);
                IRevenueRouter(revenueRouter).routeFee(RevenueSource.Origination, originationFee);
            }
            if (verificationFee > 0) {
                emit FeeCharged(RevenueSource.Verification, nftId, msg.sender, verificationFee);
                IRevenueRouter(revenueRouter).routeFee(RevenueSource.Verification, verificationFee);
            }
        }

        emit Deposited(msg.sender, nftId, borrowAmount, originationFee, verificationFee, netToBorrower, yieldPercentage);

        uint8 bandOpen =
            LendingAccountingLib.healthBand(hfOpen, cautionHealthMinWad, atRiskHealthMinWad, HEALTH_FACTOR_ONE);
        emit BorrowOpened(
            msg.sender,
            nftId,
            borrowAmount,
            collateral,
            maxLtvBps,
            liqThrOpen,
            hfOpen,
            bandOpen,
            _deviceClass(nftId),
            uint64(block.timestamp)
        );
        _emitHealth(nftId, positions[nftId]);
    }

    /// @notice Full repayment: closes position and releases hardware NFT when debt and accrued interest are zero.
    function repay(uint256 nftId) external nonReentrant whenRepayNotPaused {
        _repay(nftId, type(uint256).max, msg.sender);
    }

    /// @notice Partial repayment: applies protocol interest, then LP interest, then principal. Never blocked by stale proof.
    function repayPartial(uint256 nftId, uint256 amount) external nonReentrant whenRepayNotPaused {
        if (amount == 0) revert InvalidRepayAmount();
        _repay(nftId, amount, msg.sender);
    }

    function _repay(uint256 nftId, uint256 maxPayment, address payer) internal {
        Position storage pos = positions[nftId];
        if (pos.yieldToken == address(0)) revert NoPosition();

        _accrueInterest(nftId);

        uint256 totalOwed = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
        if (totalOwed == 0) revert NoPosition();

        uint256 payment = maxPayment >= totalOwed ? totalOwed : maxPayment;
        if (payment == 0) revert InvalidRepayAmount();

        address borrower = pos.borrower;
        stablecoin.safeTransferFrom(payer, address(this), payment);

        uint256 rem = payment;
        uint256 piPaid;
        uint256 liPaid;
        uint256 prPaid;

        if (rem > 0 && pos.accruedProtocolInterest > 0) {
            piPaid = rem < pos.accruedProtocolInterest ? rem : pos.accruedProtocolInterest;
            pos.accruedProtocolInterest -= piPaid;
            rem -= piPaid;
        }
        if (rem > 0 && pos.accruedLpInterest > 0) {
            liPaid = rem < pos.accruedLpInterest ? rem : pos.accruedLpInterest;
            pos.accruedLpInterest -= liPaid;
            rem -= liPaid;
        }
        if (rem > 0 && pos.debt > 0) {
            prPaid = rem < pos.debt ? rem : pos.debt;
            pos.debt -= prPaid;
            totalDebt -= prPaid;
            rem -= prPaid;
        }

        if (revenueRouter != address(0) && piPaid > 0) {
            emit FeeCharged(RevenueSource.InterestSpread, nftId, payer, piPaid);
            IRevenueRouter(revenueRouter).routeFee(RevenueSource.InterestSpread, piPaid);
        }

        uint256 remainingInt = pos.accruedLpInterest + pos.accruedProtocolInterest;
        bool fullClose = pos.debt == 0 && remainingInt == 0;

        emit LoanRepayment(payer, nftId, piPaid, liPaid, prPaid, pos.debt, remainingInt, fullClose);
        emit Repaid(borrower, nftId, prPaid, liPaid, piPaid, pos.debt, remainingInt);

        if (fullClose) {
            YieldToken(pos.yieldToken).burn(address(this), pos.collateralValue);
            hardwareNFT.onCollateralRelease(nftId, false);
            hardwareNFT.transferFrom(address(this), borrower, nftId);
            totalCollateral -= pos.collateralValue;
            delete positions[nftId];
            emit CollateralReleasedFromLoan(nftId, borrower, true);
        } else {
            uint256 owedAfter = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
            pos.ltv = pos.collateralValue > 0 ? (owedAfter * 10000) / pos.collateralValue : type(uint256).max;
            _syncLiquidationGrace(nftId, pos);
            _emitHealth(nftId, pos);
            emit CollateralReleasedFromLoan(nftId, borrower, false);
        }
    }

    function liquidate(uint256 nftId) external nonReentrant whenNotPaused {
        _riskAllowsLiquidation();
        _onlyLiquidator();

        Position storage pos = positions[nftId];
        if (pos.debt == 0) revert LiquidationNotAllowed();

        if (!allowLiquidationWithStaleCollateralRef && !_collateralRefFresh(pos.lastCollateralRefAt)) {
            revert CollateralRefStale();
        }

        _accrueInterest(nftId);
        _emitHealth(nftId, pos);

        uint256 currentCollateral = _effectiveCollateralWad(nftId);
        if (currentCollateral == 0) {
            currentCollateral = pos.collateralValue;
        }
        if (currentCollateral == 0) revert LiquidationNotAllowed();
        uint256 totalOwed = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
        uint256 currentLTV = (totalOwed * 10000) / currentCollateral;
        uint256 liqThr = _effectiveLiquidationThreshold(nftId);
        if (currentLTV < liqThr) revert LiquidationNotAllowed();

        if (pos.liquidationEligibleAt == 0) {
            pos.liquidationEligibleAt = block.timestamp + GRACE_PERIOD;
            emit LiquidationWarning(nftId, currentLTV, pos.liquidationEligibleAt);
            return;
        }
        if (block.timestamp < pos.liquidationEligibleAt) revert LiquidationNotAllowed();

        uint256 liquidationAmount = (totalOwed * LIQUIDATION_BONUS) / 100;
        ClassFees memory cf = _classFeeStruct(nftId);
        uint256 protocolLiqFee = (totalOwed * cf.liquidationFeeBps) / 10000;
        if (protocolLiqFee > liquidationAmount) {
            protocolLiqFee = liquidationAmount;
        }

        stablecoin.safeTransferFrom(msg.sender, address(this), liquidationAmount);

        if (revenueRouter != address(0) && protocolLiqFee > 0) {
            emit FeeCharged(RevenueSource.Liquidation, nftId, msg.sender, protocolLiqFee);
            IRevenueRouter(revenueRouter).routeFee(RevenueSource.Liquidation, protocolLiqFee);
        }

        YieldToken(pos.yieldToken).burn(address(this), pos.collateralValue);
        hardwareNFT.onCollateralRelease(nftId, true);
        hardwareNFT.transferFrom(address(this), msg.sender, nftId);

        totalDebt -= pos.debt;
        totalCollateral -= pos.collateralValue;

        delete positions[nftId];

        emit Liquidated(msg.sender, nftId, totalOwed, protocolLiqFee);
    }

    function _accrueInterest(uint256 nftId) internal {
        Position storage pos = positions[nftId];
        if (pos.debt == 0) return;

        uint256 timeElapsed = block.timestamp - pos.lastUpdateTimestamp;
        if (timeElapsed == 0) return;

        ClassFees memory cf = _classFeeStruct(nftId);
        (uint256 lenderChunk, uint256 protocolChunk, uint256 borrowerChunk) =
            LendingAccountingLib.accrueInterestChunks(pos.debt, cf.borrowerAprBps, cf.lenderAprBps, timeElapsed);

        pos.accruedLpInterest += lenderChunk;
        pos.accruedProtocolInterest += protocolChunk;
        pos.lastUpdateTimestamp = block.timestamp;

        uint256 totalInt = pos.accruedLpInterest + pos.accruedProtocolInterest;
        emit InterestAccrued(nftId, borrowerChunk, pos.debt + totalInt);
    }

    function accrueInterest(uint256 nftId) external nonReentrant {
        _accrueInterest(nftId);
    }

    /// @return collateralWad post-haircut value, maxLtvBps effective initial LTV cap for this device
    function _calculateCollateralAndMaxLtv(uint256 nftId) internal view returns (uint256 collateralWad, uint256 maxLtvBps) {
        collateralWad = _effectiveCollateralWad(nftId);
        maxLtvBps = maxInitialLTV;
        if (address(classRegistry) != address(0)) {
            uint8 classId = _deviceClass(nftId);
            IDePINClassRegistry.ClassConfig memory cfg = classRegistry.getClassConfig(classId);
            if (cfg.classLtvBps > 0 && cfg.classLtvBps < maxLtvBps) {
                maxLtvBps = cfg.classLtvBps;
            }
        }
    }

    /// @dev Single source of truth: HardwareNFT DePIN risk engine (class base × proof × confidence × binding-aware).
    function _calculateCollateralValue(uint256 nftId) internal view returns (uint256) {
        return hardwareNFT.riskAdjustedCollateralWad(nftId);
    }

    /// @dev NFT risk engine × optional mirror borrowSafetyBps (never increases power vs base).
    function _effectiveCollateralWad(uint256 nftId) internal view returns (uint256) {
        uint256 base = _calculateCollateralValue(nftId);
        if (address(yieldUpdateMirror) == address(0)) return base;
        uint256 bps = yieldUpdateMirror.borrowSafetyBps(nftId);
        return (base * bps) / 10000;
    }

    function updateCollateralValue(uint256 nftId) external nonReentrant whenNotPaused whenOracleUpdatesNotPaused {
        Position storage pos = positions[nftId];
        if (pos.debt == 0) revert NoPosition();

        _accrueInterest(nftId);

        uint256 oldCollateral = pos.collateralValue;
        uint256 newCollateral = _effectiveCollateralWad(nftId);
        pos.collateralValue = newCollateral;
        pos.lastCollateralRefAt = uint64(block.timestamp);
        uint256 totalOwed = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
        pos.ltv = newCollateral > 0 ? (totalOwed * 10000) / newCollateral : type(uint256).max;

        _syncLiquidationGrace(nftId, pos);
        _emitHealth(nftId, pos);

        emit CollateralUpdated(nftId, oldCollateral, newCollateral, pos.ltv);
    }

    function updateCollateralValue(uint256 nftId, uint256 newCollateral)
        external
        nonReentrant
        whenNotPaused
        whenOracleUpdatesNotPaused
        onlyOracle
    {
        if (newCollateral == 0) revert NoPosition();
        Position storage pos = positions[nftId];
        if (pos.debt == 0) revert NoPosition();

        _accrueInterest(nftId);

        uint256 oldCollateral = pos.collateralValue;
        uint256 cap = _effectiveCollateralWad(nftId);
        uint256 settled = newCollateral < cap ? newCollateral : cap;
        pos.collateralValue = settled;
        pos.lastCollateralRefAt = uint64(block.timestamp);
        uint256 totalOwed = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
        pos.ltv = settled > 0 ? (totalOwed * 10000) / settled : type(uint256).max;

        _syncLiquidationGrace(nftId, pos);
        _emitHealth(nftId, pos);

        emit CollateralUpdated(nftId, oldCollateral, settled, pos.ltv);
    }

    /// @notice Amortizes oracle gas over many devices (opBNB relay → BSC). Skips zero-debt keys; caps via `_effectiveCollateralWad`.
    function batchUpdateCollateralValueFromOracle(uint256[] calldata nftIds, uint256[] calldata newCollaterals)
        external
        nonReentrant
        whenNotPaused
        whenOracleUpdatesNotPaused
        onlyOracle
    {
        require(nftIds.length == newCollaterals.length, "len");
        uint256 n = nftIds.length;
        for (uint256 i; i < n; ++i) {
            uint256 nftId = nftIds[i];
            uint256 newCollateral = newCollaterals[i];
            if (newCollateral == 0) continue;
            Position storage pos = positions[nftId];
            if (pos.debt == 0) continue;

            _accrueInterest(nftId);

            uint256 oldCollateral = pos.collateralValue;
            uint256 cap = _effectiveCollateralWad(nftId);
            uint256 settled = newCollateral < cap ? newCollateral : cap;
            pos.collateralValue = settled;
            pos.lastCollateralRefAt = uint64(block.timestamp);
            uint256 totalOwed = pos.debt + pos.accruedLpInterest + pos.accruedProtocolInterest;
            pos.ltv = settled > 0 ? (totalOwed * 10000) / settled : type(uint256).max;

            _syncLiquidationGrace(nftId, pos);
            _emitHealth(nftId, pos);

            emit CollateralUpdated(nftId, oldCollateral, settled, pos.ltv);
        }
    }

    function _syncLiquidationGrace(uint256 nftId, Position storage pos) internal {
        uint256 liqThr = _effectiveLiquidationThreshold(nftId);
        if (pos.ltv >= liqThr && pos.liquidationEligibleAt == 0) {
            pos.liquidationEligibleAt = block.timestamp + GRACE_PERIOD;
            emit LiquidationWarning(nftId, pos.ltv, pos.liquidationEligibleAt);
        } else if (pos.ltv < liqThr) {
            pos.liquidationEligibleAt = 0;
        }
    }

    function getPosition(uint256 nftId)
        external
        view
        returns (uint256 debt, uint256 collateralValue, uint256 ltv, uint256 yieldPercentage, address yieldToken)
    {
        Position storage pos = positions[nftId];
        return (pos.debt, pos.collateralValue, pos.ltv, pos.yieldPercentage, pos.yieldToken);
    }

    function getPositionFull(uint256 nftId)
        external
        view
        returns (
            uint256 debt,
            uint256 accruedInterest,
            uint256 collateralValue,
            uint256 ltv,
            address borrower,
            uint256 liquidationEligibleAt,
            uint64 lastCollateralRefAt
        )
    {
        Position storage pos = positions[nftId];
        uint256 pendingLp = pos.accruedLpInterest;
        uint256 pendingProto = pos.accruedProtocolInterest;
        if (pos.debt > 0) {
            uint256 elapsed = block.timestamp - pos.lastUpdateTimestamp;
            ClassFees memory cf = _classFeeStruct(nftId);
            (uint256 lenderChunk, uint256 protocolChunk, ) =
                LendingAccountingLib.accrueInterestChunks(pos.debt, cf.borrowerAprBps, cf.lenderAprBps, elapsed);
            pendingLp += lenderChunk;
            pendingProto += protocolChunk;
        }
        uint256 totalInterest = pendingLp + pendingProto;
        uint256 totalOwed = pos.debt + totalInterest;
        uint256 currentLtv = pos.collateralValue > 0 ? (totalOwed * 10000) / pos.collateralValue : 0;
        return (
            pos.debt,
            totalInterest,
            pos.collateralValue,
            currentLtv,
            pos.borrower,
            pos.liquidationEligibleAt,
            pos.lastCollateralRefAt
        );
    }

    /// @notice Fee preview for a new borrow (same math as `deposit`); does not check collateral gates or pool liquidity.
    function previewOpenPositionFees(uint256 nftId, uint256 borrowAmount, address borrower)
        external
        view
        returns (
            uint256 originationFee,
            uint256 verificationFee,
            uint256 netToBorrower,
            uint16 discountBps,
            uint16 effectiveOriginationFeeBps
        )
    {
        ClassFees memory cf = _classFeeStruct(nftId);
        uint16 d = 0;
        if (feeDiscountModule != address(0)) {
            d = IFeeDiscountModule(feeDiscountModule).originationDiscountBps(borrower);
            if (d > MAX_ORIGINATION_DISCOUNT_BPS) d = MAX_ORIGINATION_DISCOUNT_BPS;
        }
        uint256 baseOrigBps = cf.originationFeeBps;
        uint256 effOrigBps = baseOrigBps > d ? baseOrigBps - d : 0;
        originationFee = (borrowAmount * effOrigBps) / 10000;
        verificationFee = (borrowAmount * cf.verificationFeeBps) / 10000;
        uint256 feeTotal = originationFee + verificationFee;
        netToBorrower = borrowAmount > feeTotal ? borrowAmount - feeTotal : 0;
        discountBps = d;
        effectiveOriginationFeeBps = uint16(effOrigBps);
    }

    function utilizationRate() external view returns (uint256) {
        uint256 poolBalance = stablecoin.balanceOf(address(this));
        uint256 totalAssets = poolBalance + totalDebt;
        if (totalAssets == 0) return 0;
        return (totalDebt * 10000) / totalAssets;
    }

    function borrowerAprBps(uint256 nftId) external view returns (uint256) {
        return _classFeeStruct(nftId).borrowerAprBps;
    }

    function lenderAprBps(uint256 nftId) external view returns (uint256) {
        return _classFeeStruct(nftId).lenderAprBps;
    }

    /// @notice Canonical on-chain health factor (1e18 = at liquidation LTV line). `type(uint256).max` if no position.
    function getHealthFactorWad(uint256 nftId) external view returns (uint256 hfWad) {
        return _healthFactorView(nftId, positions[nftId]);
    }

    /// @notice Risk band for UX: 0 none, 1 healthy, 2 caution, 3 at-risk, 4 liquidatable (HF < 1.0).
    function getHealthBand(uint256 nftId) external view returns (uint8 band) {
        uint256 hf = _healthFactorView(nftId, positions[nftId]);
        if (hf == type(uint256).max) return 0;
        return LendingAccountingLib.healthBand(hf, cautionHealthMinWad, atRiskHealthMinWad, HEALTH_FACTOR_ONE);
    }

    /// @notice Single-call risk snapshot for indexers and frontends (contract is source of truth, not UI math).
    function getPositionRiskSummary(uint256 nftId)
        external
        view
        returns (
            uint256 totalOwed,
            uint256 hfWad,
            uint8 band,
            uint256 liqThresholdBps,
            uint256 ltvBps,
            bool collateralRefFresh
        )
    {
        Position storage pos = positions[nftId];
        if (pos.yieldToken == address(0)) {
            return (0, type(uint256).max, 0, 0, 0, true);
        }
        totalOwed = _viewTotalOwed(nftId, pos);
        liqThresholdBps = _effectiveLiquidationThreshold(nftId);
        hfWad = LendingAccountingLib.healthFactorWad(pos.collateralValue, totalOwed, liqThresholdBps);
        band = LendingAccountingLib.healthBand(hfWad, cautionHealthMinWad, atRiskHealthMinWad, HEALTH_FACTOR_ONE);
        ltvBps = pos.collateralValue > 0 ? (totalOwed * 10000) / pos.collateralValue : type(uint256).max;
        collateralRefFresh = _collateralRefFresh(pos.lastCollateralRefAt);
    }

    /// @notice Always zero today: top-up borrows are disabled (one loan per NFT). Exposed for explicit integrator checks.
    function maxAdditionalBorrow(uint256 nftId) external view returns (uint256) {
        if (positions[nftId].yieldToken == address(0)) return 0;
        return 0;
    }
}
