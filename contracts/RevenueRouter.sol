// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RevenueTypes.sol";
import "./interfaces/ITreasuryHub.sol";

/**
 * @title RevenueRouter
 * @notice Collects protocol fees from the lending pool, attributes revenue by source,
 *         and splits proceeds across LP yield, treasury (or `TreasuryHub`), MACH stakers, insurance, and growth.
 *         Supports a governance-toggled conservative (stress) split that prioritizes LPs and insurance.
 */
contract RevenueRouter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant FEE_REPORTER_ROLE = keccak256("FEE_REPORTER_ROLE");

    /// @notice Minimum LP share in normal mode (solvency bias).
    uint16 public constant MIN_LP_BPS_NORMAL = 2500;
    /// @notice Minimum insurance share in normal mode.
    uint16 public constant MIN_INSURANCE_BPS_NORMAL = 800;
    /// @notice Minimum LP share in conservative (stress) mode.
    uint16 public constant MIN_LP_BPS_STRESS = 3500;
    /// @notice Minimum insurance share in conservative mode.
    uint16 public constant MIN_INSURANCE_BPS_STRESS = 1500;
    /// @notice Hard cap on growth tranche in normal mode (anti-mercenary emissions).
    uint16 public constant MAX_GROWTH_BPS_NORMAL = 1500;

    IERC20 public immutable asset;

    address public lpRecipient;
    address public treasuryRecipient;
    address public stakerRecipient;
    address public insuranceRecipient;
    address public growthRecipient;

    /// @notice If set, treasury tranche is pulled into `TreasuryHub` for categorized accounting; else `treasuryRecipient`.
    address public treasuryHub;

    struct AllocationBps {
        uint16 lp;
        uint16 treasury;
        uint16 staker;
        uint16 insurance;
        uint16 growth;
    }

    AllocationBps public allocation;
    AllocationBps public stressAllocation;
    bool public conservativeRevenueMode;

    /// @notice High-level buckets for treasury flywheel narrative when treasury is not using `TreasuryHub`.
    struct TreasuryBucketBps {
        uint16 protocolRevenue;
        uint16 reserveCapital;
        uint16 operational;
        uint16 incentives;
        uint16 insuranceBackstop;
    }

    TreasuryBucketBps public treasuryBuckets;

    mapping(RevenueSource => uint256) public revenueBySource;

    uint256 public attributedToLP;
    uint256 public attributedToTreasury;
    uint256 public attributedToStakers;
    uint256 public attributedToInsurance;
    uint256 public attributedToGrowth;

    event FeeRouted(
        RevenueSource indexed src,
        uint256 grossAmount,
        uint256 toLp,
        uint256 toTreasury,
        uint256 toStakers,
        uint256 toInsurance,
        uint256 toGrowth
    );
    /// @dev Same payload as `FeeRouted`; emitted for analytics pipelines that index `FeeDistributed`.
    event FeeDistributed(
        RevenueSource indexed src,
        uint256 grossAmount,
        uint256 toLp,
        uint256 toTreasury,
        uint256 toStakers,
        uint256 toInsurance,
        uint256 toGrowth
    );
    event FeeRouteUpdated(
        address lp,
        address treasury,
        address staker,
        address insurance,
        address growth,
        address treasuryHub
    );
    event FeeParameterUpdated(bool conservativeMode, uint16 lp, uint16 treasury, uint16 staker, uint16 insurance, uint16 growth);
    event StressAllocationUpdated(uint16 lp, uint16 treasury, uint16 staker, uint16 insurance, uint16 growth);
    event ConservativeRevenueModeUpdated(bool enabled);
    event TreasuryHubUpdated(address hub);
    event RecipientsUpdated(address lp, address treasury, address staker, address insurance, address growth);
    event AllocationUpdated(uint16 lp, uint16 treasury, uint16 staker, uint16 insurance, uint16 growth);
    event TreasuryBucketsUpdated(
        uint16 protocolRevenue,
        uint16 reserveCapital,
        uint16 operational,
        uint16 incentives,
        uint16 insuranceBackstop
    );

    constructor(
        address _asset,
        address admin,
        address _lp,
        address _treasury,
        address _staker,
        address _insurance,
        address _growth
    ) {
        require(_asset != address(0) && admin != address(0), "RevenueRouter: zero");
        require(_lp != address(0) && _treasury != address(0), "RevenueRouter: recipients");
        require(_staker != address(0) && _insurance != address(0) && _growth != address(0), "RevenueRouter: recipients");
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);
        lpRecipient = _lp;
        treasuryRecipient = _treasury;
        stakerRecipient = _staker;
        insuranceRecipient = _insurance;
        growthRecipient = _growth;
        allocation = AllocationBps(3500, 2800, 2200, 1000, 500);
        stressAllocation = AllocationBps(4000, 2200, 800, 2500, 500);
        treasuryBuckets = TreasuryBucketBps(3000, 3500, 1500, 1000, 1000);
    }

    function _validateNormalAllocation(AllocationBps memory a) internal pure {
        require(uint256(a.lp) + a.treasury + a.staker + a.insurance + a.growth == 10000, "RevenueRouter: bps sum");
        require(a.lp >= MIN_LP_BPS_NORMAL && a.insurance >= MIN_INSURANCE_BPS_NORMAL, "RevenueRouter: safety floor");
        require(a.growth <= MAX_GROWTH_BPS_NORMAL, "RevenueRouter: growth cap");
    }

    function _validateStressAllocation(AllocationBps memory a) internal pure {
        require(uint256(a.lp) + a.treasury + a.staker + a.insurance + a.growth == 10000, "RevenueRouter: bps sum");
        require(a.lp >= MIN_LP_BPS_STRESS && a.insurance >= MIN_INSURANCE_BPS_STRESS, "RevenueRouter: stress floor");
    }

    function setRecipients(
        address _lp,
        address _treasury,
        address _staker,
        address _insurance,
        address _growth
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(_lp != address(0) && _treasury != address(0), "RevenueRouter: zero");
        require(_staker != address(0) && _insurance != address(0) && _growth != address(0), "RevenueRouter: zero");
        lpRecipient = _lp;
        treasuryRecipient = _treasury;
        stakerRecipient = _staker;
        insuranceRecipient = _insurance;
        growthRecipient = _growth;
        emit RecipientsUpdated(_lp, _treasury, _staker, _insurance, _growth);
        emit FeeRouteUpdated(_lp, _treasury, _staker, _insurance, _growth, treasuryHub);
    }

    function setTreasuryHub(address hub) external onlyRole(GOVERNANCE_ROLE) {
        if (treasuryHub != address(0)) {
            asset.safeApprove(treasuryHub, 0);
        }
        treasuryHub = hub;
        if (hub != address(0)) {
            asset.safeApprove(hub, type(uint256).max);
        }
        emit TreasuryHubUpdated(hub);
        emit FeeRouteUpdated(lpRecipient, treasuryRecipient, stakerRecipient, insuranceRecipient, growthRecipient, hub);
    }

    function setAllocation(uint16 lp, uint16 treasury, uint16 staker, uint16 insurance, uint16 growth) external onlyRole(GOVERNANCE_ROLE) {
        AllocationBps memory a = AllocationBps(lp, treasury, staker, insurance, growth);
        _validateNormalAllocation(a);
        allocation = a;
        emit AllocationUpdated(lp, treasury, staker, insurance, growth);
        emit FeeParameterUpdated(conservativeRevenueMode, lp, treasury, staker, insurance, growth);
    }

    function setStressAllocation(uint16 lp, uint16 treasury, uint16 staker, uint16 insurance, uint16 growth) external onlyRole(GOVERNANCE_ROLE) {
        AllocationBps memory a = AllocationBps(lp, treasury, staker, insurance, growth);
        _validateStressAllocation(a);
        stressAllocation = a;
        emit StressAllocationUpdated(lp, treasury, staker, insurance, growth);
        AllocationBps memory eff = conservativeRevenueMode ? stressAllocation : allocation;
        emit FeeParameterUpdated(
            conservativeRevenueMode,
            eff.lp,
            eff.treasury,
            eff.staker,
            eff.insurance,
            eff.growth
        );
    }

    function setConservativeRevenueMode(bool enabled) external onlyRole(GOVERNANCE_ROLE) {
        conservativeRevenueMode = enabled;
        emit ConservativeRevenueModeUpdated(enabled);
        AllocationBps memory eff = enabled ? stressAllocation : allocation;
        emit FeeParameterUpdated(enabled, eff.lp, eff.treasury, eff.staker, eff.insurance, eff.growth);
    }

    function setTreasuryBuckets(
        uint16 protocolRevenue,
        uint16 reserveCapital,
        uint16 operational,
        uint16 incentives,
        uint16 insuranceBackstop
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(
            uint256(protocolRevenue) + reserveCapital + operational + incentives + insuranceBackstop == 10000,
            "RevenueRouter: bps"
        );
        treasuryBuckets = TreasuryBucketBps(protocolRevenue, reserveCapital, operational, incentives, insuranceBackstop);
        emit TreasuryBucketsUpdated(protocolRevenue, reserveCapital, operational, incentives, insuranceBackstop);
    }

    function _effectiveAllocation() internal view returns (AllocationBps memory) {
        return conservativeRevenueMode ? stressAllocation : allocation;
    }

    /**
     * @notice Pull `amount` from caller (typically LendingPool) and split across recipients.
     */
    function routeFee(RevenueSource src, uint256 amount) external nonReentrant onlyRole(FEE_REPORTER_ROLE) {
        if (amount == 0) return;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        revenueBySource[src] += amount;

        AllocationBps memory a = _effectiveAllocation();
        uint256 toLp = (amount * a.lp) / 10000;
        uint256 toTreasury = (amount * a.treasury) / 10000;
        uint256 toStakers = (amount * a.staker) / 10000;
        uint256 toInsurance = (amount * a.insurance) / 10000;
        uint256 toGrowth = amount - toLp - toTreasury - toStakers - toInsurance;

        if (toLp > 0) {
            attributedToLP += toLp;
            asset.safeTransfer(lpRecipient, toLp);
        }
        if (toTreasury > 0) {
            attributedToTreasury += toTreasury;
            if (treasuryHub != address(0)) {
                ITreasuryHub(treasuryHub).creditFromRouter(toTreasury);
            } else {
                asset.safeTransfer(treasuryRecipient, toTreasury);
            }
        }
        if (toStakers > 0) {
            attributedToStakers += toStakers;
            asset.safeTransfer(stakerRecipient, toStakers);
        }
        if (toInsurance > 0) {
            attributedToInsurance += toInsurance;
            asset.safeTransfer(insuranceRecipient, toInsurance);
        }
        if (toGrowth > 0) {
            attributedToGrowth += toGrowth;
            asset.safeTransfer(growthRecipient, toGrowth);
        }

        emit FeeRouted(src, amount, toLp, toTreasury, toStakers, toInsurance, toGrowth);
        emit FeeDistributed(src, amount, toLp, toTreasury, toStakers, toInsurance, toGrowth);
    }

    function getTreasuryBucketLabels() external view returns (TreasuryBucketBps memory) {
        return treasuryBuckets;
    }

    function getEffectiveAllocation() external view returns (AllocationBps memory) {
        return _effectiveAllocation();
    }
}
