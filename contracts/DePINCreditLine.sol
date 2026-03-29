// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./HardwareNFT.sol";
import "./RevenueTypes.sol";
import "./interfaces/IRevenueRouter.sol";

/**
 * @title DePINCreditLine
 * @notice Goldfinch-style device-backed credit lines: origination on draw, scheduled payments,
 *         monthly interest accrual, late penalties, and fee routing via RevenueRouter (LP / treasury / stakers / etc.).
 *         Liquidity must be pre-funded in this contract; origination is deducted from disbursed principal like LendingPool.
 */
contract DePINCreditLine is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    IERC20 public immutable stablecoin;
    HardwareNFT public immutable hardwareNFT;

    address public revenueRouter;

    /// @dev Use the same decimal scale as `stablecoin` and pool liquidity (project defaults assume 18-decimal USD-style units like `LendingPool` collateral math).
    uint256 public principalLimit = 100_000 * 1e18;
    uint256 public originationFeeBps = 150;
    uint256 public interestRateBps = 1200;
    uint256 public lateFeeBps = 500;
    uint256 public paymentPeriod = 30 days;
    uint256 public minCollateralRatioBps = 13_000;
    uint256 public protocolInterestShareBps = 3300;
    uint256 public liquidationBonusBps = 500;
    uint256 public liquidationProtocolFeeBps = 80;
    uint256 public paymentGracePeriod = 7 days;

    struct CreditLine {
        address borrower;
        uint256 principal;
        uint256 interestOwed;
        uint256 principalPaid;
        uint256 lastPaymentTime;
        uint256 nftId;
        bool active;
        bool overdue;
        uint256 nextPaymentDue;
        bool lateFeeAssessedForCycle;
        /// @notice Portion of `interestOwed` attributable to late penalties (for RevenueRouter attribution when paid).
        uint256 lateFeePending;
    }

    mapping(uint256 => CreditLine) public creditLines;
    uint256 public totalPrincipalOutstanding;

    event CreditLineDrawn(
        uint256 indexed nftId,
        address indexed borrower,
        uint256 principal,
        uint256 originationFee,
        uint256 netToBorrower,
        uint256 nextPaymentDue
    );
    event PaymentMade(
        uint256 indexed nftId,
        uint256 principalPaid,
        uint256 interestPaid,
        uint256 lateFeeIncluded,
        uint256 nextPaymentDue
    );
    event LateFeeApplied(uint256 indexed nftId, uint256 fee);
    event LineClosed(uint256 indexed nftId, address indexed borrower);
    event Liquidated(address indexed liquidator, uint256 indexed nftId, uint256 totalRecovered, uint256 protocolFee);
    event RevenueRouterUpdated(address indexed router);

    constructor(address _stablecoin, address _hardwareNFT) {
        require(_stablecoin != address(0) && _hardwareNFT != address(0), "Zero address");
        stablecoin = IERC20(_stablecoin);
        hardwareNFT = HardwareNFT(_hardwareNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
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

    function setPrincipalLimit(uint256 v) external onlyRole(GOVERNOR_ROLE) {
        principalLimit = v;
    }

    function setFeeParams(
        uint256 _originationFeeBps,
        uint256 _interestRateBps,
        uint256 _lateFeeBps,
        uint256 _paymentPeriod,
        uint256 _minCollateralRatioBps,
        uint256 _protocolInterestShareBps
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_originationFeeBps <= 500 && _lateFeeBps <= 2500, "Fee cap");
        require(_interestRateBps <= 5000, "Apr cap");
        require(_paymentPeriod >= 1 days && _paymentPeriod <= 365 days, "Period");
        require(_minCollateralRatioBps >= 10_000 && _minCollateralRatioBps <= 20_000, "Col ratio");
        require(_protocolInterestShareBps <= 10_000, "Share bps");
        originationFeeBps = _originationFeeBps;
        interestRateBps = _interestRateBps;
        lateFeeBps = _lateFeeBps;
        paymentPeriod = _paymentPeriod;
        minCollateralRatioBps = _minCollateralRatioBps;
        protocolInterestShareBps = _protocolInterestShareBps;
    }

    function setLiquidationParams(
        uint256 _liquidationBonusBps,
        uint256 _liquidationProtocolFeeBps,
        uint256 _paymentGracePeriod
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_liquidationBonusBps >= 100 && _liquidationBonusBps <= 2000, "Bonus");
        require(_liquidationProtocolFeeBps <= 1000, "Liq fee");
        require(_paymentGracePeriod <= 90 days, "Grace");
        liquidationBonusBps = _liquidationBonusBps;
        liquidationProtocolFeeBps = _liquidationProtocolFeeBps;
        paymentGracePeriod = _paymentGracePeriod;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function drawCreditLine(uint256 nftId, uint256 principal) external nonReentrant whenNotPaused {
        require(principal > 0 && principal <= principalLimit, "Principal");
        require(hardwareNFT.ownerOf(nftId) == msg.sender, "Not owner");
        require(!creditLines[nftId].active, "Line exists");
        require(hardwareNFT.canUseAsCollateral(nftId), "Not borrow-eligible");

        uint256 collateral = hardwareNFT.riskAdjustedCollateralWad(nftId);
        require(collateral > 0, "No collateral");
        require((principal * minCollateralRatioBps) / 10_000 <= collateral, "Undercollateralized");

        uint256 origFee = (principal * originationFeeBps) / 10_000;
        require(principal > origFee, "Fees exceed principal");
        uint256 netToBorrower = principal - origFee;

        require(stablecoin.balanceOf(address(this)) >= principal, "Insufficient liquidity");

        hardwareNFT.transferFrom(msg.sender, address(this), nftId);
        hardwareNFT.onCollateralBond(nftId, nftId);

        stablecoin.safeTransfer(msg.sender, netToBorrower);

        if (revenueRouter != address(0) && origFee > 0) {
            IRevenueRouter(revenueRouter).routeFee(RevenueSource.Origination, origFee);
        }

        uint256 due = block.timestamp + paymentPeriod;
        creditLines[nftId] = CreditLine({
            borrower: msg.sender,
            principal: principal,
            interestOwed: 0,
            principalPaid: 0,
            lastPaymentTime: block.timestamp,
            nftId: nftId,
            active: true,
            overdue: false,
            nextPaymentDue: due,
            lateFeeAssessedForCycle: false,
            lateFeePending: 0
        });
        totalPrincipalOutstanding += principal;

        emit CreditLineDrawn(nftId, msg.sender, principal, origFee, netToBorrower, due);
    }

    function makePayment(uint256 nftId, uint256 paymentAmount) external nonReentrant whenNotPaused {
        CreditLine storage line = creditLines[nftId];
        require(line.active && line.borrower == msg.sender, "Invalid line");
        require(paymentAmount > 0, "Zero pay");
        require(hardwareNFT.isProofFresh(nftId), "Stale proof");

        _accrueInterest(nftId);

        uint256 lateAdded = _applyLateFeeIfNeeded(nftId);

        uint256 outstandingPrincipal = line.principal - line.principalPaid;
        uint256 interestPaid = _min(line.interestOwed, paymentAmount);
        uint256 remainder = paymentAmount - interestPaid;
        uint256 principalPaid = _min(outstandingPrincipal, remainder);

        uint256 totalDue = interestPaid + principalPaid;
        require(totalDue > 0, "Nothing applied");

        stablecoin.safeTransferFrom(msg.sender, address(this), totalDue);

        if (revenueRouter != address(0) && interestPaid > 0) {
            uint256 fromLate = _min(interestPaid, line.lateFeePending);
            uint256 fromRegular = interestPaid - fromLate;
            line.lateFeePending -= fromLate;
            uint256 protoLate = (fromLate * protocolInterestShareBps) / 10_000;
            uint256 protoReg = (fromRegular * protocolInterestShareBps) / 10_000;
            if (protoLate > 0) {
                IRevenueRouter(revenueRouter).routeFee(RevenueSource.LateFee, protoLate);
            }
            if (protoReg > 0) {
                IRevenueRouter(revenueRouter).routeFee(RevenueSource.InterestSpread, protoReg);
            }
        }

        line.interestOwed -= interestPaid;
        line.principalPaid += principalPaid;
        line.lastPaymentTime = block.timestamp;
        line.nextPaymentDue = block.timestamp + paymentPeriod;
        line.overdue = false;
        line.lateFeeAssessedForCycle = false;

        totalPrincipalOutstanding -= principalPaid;

        emit PaymentMade(nftId, principalPaid, interestPaid, lateAdded, line.nextPaymentDue);

        if (line.principalPaid >= line.principal && line.interestOwed == 0) {
            _closeLine(nftId);
        }
    }

    function liquidate(uint256 nftId) external nonReentrant whenNotPaused {
        CreditLine storage line = creditLines[nftId];
        require(line.active, "No line");

        _accrueInterest(nftId);
        _applyLateFeeIfNeeded(nftId);
        (uint256 outstandingPrincipal, uint256 interestOwed) = _amounts(line);

        bool pastGrace = block.timestamp > line.nextPaymentDue + paymentGracePeriod;
        bool undercoll = !_meetsCollateralRatio(nftId, outstandingPrincipal + interestOwed);
        bool stale = !hardwareNFT.isProofFresh(nftId);
        require(pastGrace && (undercoll || stale), "Not liquidatable");

        uint256 totalOwed = outstandingPrincipal + interestOwed;
        require(totalOwed > 0, "Nothing owed");

        uint256 payAmount = (totalOwed * (10_000 + liquidationBonusBps)) / 10_000;
        uint256 protocolLiqFee = (totalOwed * liquidationProtocolFeeBps) / 10_000;
        if (protocolLiqFee > payAmount) {
            protocolLiqFee = payAmount;
        }

        stablecoin.safeTransferFrom(msg.sender, address(this), payAmount);

        if (revenueRouter != address(0) && protocolLiqFee > 0) {
            IRevenueRouter(revenueRouter).routeFee(RevenueSource.Liquidation, protocolLiqFee);
        }

        hardwareNFT.onCollateralRelease(nftId, true);
        hardwareNFT.transferFrom(address(this), msg.sender, line.nftId);

        totalPrincipalOutstanding -= outstandingPrincipal;
        delete creditLines[nftId];

        emit Liquidated(msg.sender, nftId, totalOwed, protocolLiqFee);
    }

    function previewOwed(uint256 nftId)
        external
        view
        returns (uint256 outstandingPrincipal, uint256 interestOwed, uint256 nextDue, bool isOverdue)
    {
        CreditLine storage line = creditLines[nftId];
        if (!line.active) return (0, 0, 0, false);

        outstandingPrincipal = line.principal - line.principalPaid;
        interestOwed = line.interestOwed;
        uint256 periods = (block.timestamp - line.lastPaymentTime) / paymentPeriod;
        uint256 monthly = (outstandingPrincipal * interestRateBps) / (10_000 * 12);
        interestOwed += monthly * periods;

        nextDue = line.nextPaymentDue;
        isOverdue = block.timestamp > line.nextPaymentDue;
    }

    function _closeLine(uint256 nftId) internal {
        CreditLine storage line = creditLines[nftId];
        address borrower = line.borrower;
        hardwareNFT.onCollateralRelease(nftId, false);
        hardwareNFT.transferFrom(address(this), borrower, line.nftId);
        delete creditLines[nftId];
        emit LineClosed(nftId, borrower);
    }

    function _applyLateFeeIfNeeded(uint256 nftId) internal returns (uint256 lateAdded) {
        CreditLine storage line = creditLines[nftId];
        if (block.timestamp <= line.nextPaymentDue) {
            return 0;
        }
        if (line.lateFeeAssessedForCycle) {
            return 0;
        }

        line.overdue = true;
        uint256 outstandingPrincipal = line.principal - line.principalPaid;
        lateAdded = (outstandingPrincipal * lateFeeBps) / 10_000;
        if (lateAdded > 0) {
            line.interestOwed += lateAdded;
            line.lateFeePending += lateAdded;
            line.lateFeeAssessedForCycle = true;
            emit LateFeeApplied(nftId, lateAdded);
        }
    }

    function _accrueInterest(uint256 nftId) internal {
        CreditLine storage line = creditLines[nftId];
        uint256 outstandingPrincipal = line.principal - line.principalPaid;
        if (outstandingPrincipal == 0) return;

        uint256 periodsElapsed = (block.timestamp - line.lastPaymentTime) / paymentPeriod;
        if (periodsElapsed == 0) return;

        uint256 interest = (outstandingPrincipal * interestRateBps * periodsElapsed) / (10_000 * 12);
        line.interestOwed += interest;
        line.lastPaymentTime += periodsElapsed * paymentPeriod;
    }

    function _amounts(CreditLine storage line) internal view returns (uint256 outstandingPrincipal, uint256 interestOwed) {
        outstandingPrincipal = line.principal - line.principalPaid;
        interestOwed = line.interestOwed;
    }

    function _meetsCollateralRatio(uint256 nftId, uint256 debt) internal view returns (bool) {
        uint256 collateral = _collateralValue(nftId);
        if (collateral == 0) return false;
        return (debt * minCollateralRatioBps) / 10_000 <= collateral;
    }

    function _collateralValue(uint256 nftId) internal view returns (uint256) {
        return hardwareNFT.riskAdjustedCollateralWad(nftId);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
