// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOracle.sol";
import "./RevenueTypes.sol";
import "./interfaces/IRevenueRouter.sol";

/**
 * @title RWAVault
 * @notice Maker-style CDP for device-backed collateral: WAD debt, oracle collateral, stability accrual,
 *         origination fee, and keeper liquidation with penalty. Optional `RevenueRouter` (grant
 *         `FEE_REPORTER_ROLE` to this contract; router pulls fees via `approve`).
 * @dev Pool must be pre-funded with stablecoin for draws. Assumes stablecoin decimals align with WAD debt (e.g. 18).
 */
contract RWAVault is IERC721Receiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant WAD = 1e18;

    IERC20 public immutable stablecoin;
    IOracle public immutable collateralOracle;
    IERC721 public immutable hardwareNFT;

    IRevenueRouter public revenueRouter;

    /// @notice Sum of principal across vaults (drawn liquidity).
    uint256 public debtCeiling;
    /// @notice APR stability fee in bps (e.g. 50 = 0.5% per year on principal + accrued stability).
    uint256 public stabilityFeeBps;
    /// @notice One-time origination fee on draw, bps of principal.
    uint256 public originationFeeBps;
    /// @notice Position is safe when collateral * 10_000 >= debt * liquidationRatioBps (e.g. 12500 => 125% CR).
    uint256 public liquidationRatioBps;
    /// @notice Penalty bps on total debt paid by keeper on liquidation (e.g. 300 = 3%).
    uint256 public liquidationPenaltyBps;

    struct Vault {
        address owner;
        uint256 collateralValue;
        uint256 principalDebt;
        uint256 stabilityDebt;
        uint256 lastAccrual;
        bool active;
    }

    mapping(uint256 => Vault) public vaults;
    uint256 public totalPrincipalDebt;
    uint256 public totalStabilityDebt;

    event RevenueRouterUpdated(address indexed router);
    event ParamsUpdated(
        uint256 debtCeiling,
        uint256 stabilityFeeBps,
        uint256 originationFeeBps,
        uint256 liquidationRatioBps,
        uint256 liquidationPenaltyBps
    );
    event VaultOpened(uint256 indexed nftId, address indexed owner, uint256 principal, uint256 originationFee);
    event StabilityAccrued(uint256 indexed nftId, uint256 delta);
    event VaultRepaid(uint256 indexed nftId, address indexed payer, uint256 amount, uint256 interestPaid, uint256 principalPaid);
    event VaultClosed(uint256 indexed nftId, address indexed owner);
    event VaultLiquidated(uint256 indexed nftId, address indexed keeper, uint256 debtRepaid, uint256 penalty);

    constructor(address _stablecoin, address _oracle, address _hardwareNFT) {
        require(_stablecoin != address(0) && _oracle != address(0) && _hardwareNFT != address(0), "Zero");
        stablecoin = IERC20(_stablecoin);
        collateralOracle = IOracle(_oracle);
        hardwareNFT = IERC721(_hardwareNFT);
        debtCeiling = 10_000_000 * WAD;
        stabilityFeeBps = 50;
        originationFeeBps = 50;
        liquidationRatioBps = 12500;
        liquidationPenaltyBps = 300;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function setRevenueRouter(address r) external onlyOwner {
        revenueRouter = IRevenueRouter(r);
        emit RevenueRouterUpdated(r);
    }

    function setParams(
        uint256 _debtCeiling,
        uint256 _stabilityFeeBps,
        uint256 _originationFeeBps,
        uint256 _liquidationRatioBps,
        uint256 _liquidationPenaltyBps
    ) external onlyOwner {
        require(_liquidationRatioBps >= 10_000, "ratio");
        debtCeiling = _debtCeiling;
        stabilityFeeBps = _stabilityFeeBps;
        originationFeeBps = _originationFeeBps;
        liquidationRatioBps = _liquidationRatioBps;
        liquidationPenaltyBps = _liquidationPenaltyBps;
        emit ParamsUpdated(_debtCeiling, _stabilityFeeBps, _originationFeeBps, _liquidationRatioBps, _liquidationPenaltyBps);
    }

    /// @notice Outstanding debt for a vault including pending stability not yet written to storage.
    function getVaultDebt(uint256 nftId) public view returns (uint256) {
        Vault storage v = vaults[nftId];
        if (!v.active) return 0;
        return v.principalDebt + v.stabilityDebt + _pendingStability(v);
    }

    function totalSystemDebt() external view returns (uint256) {
        return totalPrincipalDebt + totalStabilityDebt;
    }

    function _pendingStability(Vault storage v) internal view returns (uint256) {
        if (!v.active) return 0;
        uint256 base = v.principalDebt + v.stabilityDebt;
        if (base == 0) return 0;
        uint256 dt = block.timestamp - v.lastAccrual;
        if (dt == 0) return 0;
        return (base * stabilityFeeBps * dt) / (10_000 * 365 days);
    }

    function _accrue(uint256 nftId) internal {
        Vault storage v = vaults[nftId];
        if (!v.active) return;
        uint256 fee = _pendingStability(v);
        v.lastAccrual = block.timestamp;
        if (fee == 0) return;
        v.stabilityDebt += fee;
        totalStabilityDebt += fee;
        v.collateralValue = collateralOracle.getCollateralValue(nftId);
        emit StabilityAccrued(nftId, fee);
    }

    /// @notice Write pending stability to storage (optional; also runs before repay/liquidate).
    function accrueStabilityFee(uint256 nftId) external {
        _accrue(nftId);
    }

    /// @notice Lock NFT, pay origination fee, receive principal from vault liquidity.
    function openVault(uint256 nftId, uint256 debtAmount) external nonReentrant {
        require(hardwareNFT.ownerOf(nftId) == msg.sender, "Not owner");
        require(!vaults[nftId].active, "Exists");
        require(debtAmount > 0, "Zero debt");

        uint256 systemDebt = totalPrincipalDebt + totalStabilityDebt;
        require(systemDebt + debtAmount <= debtCeiling, "Ceiling");

        uint256 collateralValue = collateralOracle.getCollateralValue(nftId);
        require(collateralValue * 10_000 >= debtAmount * liquidationRatioBps, "Undercollateralized");

        uint256 originationFee = (debtAmount * originationFeeBps) / 10_000;
        if (originationFee > 0) {
            stablecoin.safeTransferFrom(msg.sender, address(this), originationFee);
            _routeFee(RevenueSource.Origination, originationFee);
        }

        require(stablecoin.balanceOf(address(this)) >= debtAmount, "Insufficient liquidity");

        hardwareNFT.safeTransferFrom(msg.sender, address(this), nftId);
        stablecoin.safeTransfer(msg.sender, debtAmount);

        vaults[nftId] = Vault({
            owner: msg.sender,
            collateralValue: collateralValue,
            principalDebt: debtAmount,
            stabilityDebt: 0,
            lastAccrual: block.timestamp,
            active: true
        });
        totalPrincipalDebt += debtAmount;

        emit VaultOpened(nftId, msg.sender, debtAmount, originationFee);
    }

    /// @notice Pay down stability first, then principal; full repayment returns the NFT.
    function repay(uint256 nftId, uint256 amount) external nonReentrant {
        Vault storage v = vaults[nftId];
        require(v.active, "Inactive");
        require(amount > 0, "Zero");
        _accrue(nftId);

        uint256 owed = v.principalDebt + v.stabilityDebt;
        require(owed > 0, "Nothing owed");

        uint256 pay = amount > owed ? owed : amount;
        stablecoin.safeTransferFrom(msg.sender, address(this), pay);

        uint256 interestPay = pay >= v.stabilityDebt ? v.stabilityDebt : pay;
        uint256 principalPay = pay - interestPay;

        if (interestPay > 0) {
            v.stabilityDebt -= interestPay;
            totalStabilityDebt -= interestPay;
            _routeFee(RevenueSource.InterestSpread, interestPay);
        }
        if (principalPay > 0) {
            v.principalDebt -= principalPay;
            totalPrincipalDebt -= principalPay;
        }

        emit VaultRepaid(nftId, msg.sender, pay, interestPay, principalPay);

        if (v.principalDebt == 0 && v.stabilityDebt == 0) {
            address o = v.owner;
            v.active = false;
            hardwareNFT.safeTransferFrom(address(this), o, nftId);
            emit VaultClosed(nftId, o);
        }
    }

    /// @notice If collateral ratio is below threshold, keeper repays debt + penalty and receives the NFT.
    function liquidate(uint256 nftId) external nonReentrant {
        Vault storage v = vaults[nftId];
        require(v.active, "Inactive");
        _accrue(nftId);

        uint256 colValue = collateralOracle.getCollateralValue(nftId);
        uint256 owed = v.principalDebt + v.stabilityDebt;
        require(colValue * 10_000 < owed * liquidationRatioBps, "Not liquidatable");

        uint256 penalty = (owed * liquidationPenaltyBps) / 10_000;
        uint256 due = owed + penalty;

        stablecoin.safeTransferFrom(msg.sender, address(this), due);

        if (penalty > 0) {
            _routeFee(RevenueSource.Liquidation, penalty);
        }

        totalPrincipalDebt -= v.principalDebt;
        totalStabilityDebt -= v.stabilityDebt;

        v.active = false;
        v.principalDebt = 0;
        v.stabilityDebt = 0;

        hardwareNFT.safeTransferFrom(address(this), msg.sender, nftId);

        emit VaultLiquidated(nftId, msg.sender, owed, penalty);
    }

    function _routeFee(RevenueSource src, uint256 amount) internal {
        if (amount == 0) return;
        address router = address(revenueRouter);
        if (router == address(0)) return;
        stablecoin.approve(router, amount);
        revenueRouter.routeFee(src, amount);
        stablecoin.approve(router, 0);
    }
}
