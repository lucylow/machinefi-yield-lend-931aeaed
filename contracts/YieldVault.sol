// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title YieldVault
 * @notice Tracks projected vs realized yield for DePIN devices with streaming accrual,
 *         tiered unlock schedule, yield caps, and emergency pause.
 */
contract YieldVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    /// @notice Maximum annualized yield cap per device to prevent oracle manipulation
    uint256 public constant MAX_ANNUAL_YIELD = 100_000 * 1e18; // $100k cap

    /// @notice Tiered unlock thresholds (basis points of projected yield realized)
    uint256 public constant TIER_1_THRESHOLD = 2500; // 25% → unlock 10%
    uint256 public constant TIER_2_THRESHOLD = 5000; // 50% → unlock 30%
    uint256 public constant TIER_3_THRESHOLD = 7500; // 75% → unlock 60%
    uint256 public constant TIER_4_THRESHOLD = 10000; // 100% → unlock 100%

    struct YieldRecord {
        uint256 projectedYield;
        uint256 realizedYield;
        uint256 lastUpdateTimestamp;
        uint256 yieldPerSecond;
        uint256 lockedCollateral;
        uint256 unlockableCollateral;
        bool active;
    }

    mapping(uint256 => YieldRecord) public yields;
    IERC20 public rewardToken;

    event YieldProjectionUpdated(uint256 indexed nftId, uint256 projectedYield, uint256 yieldPerSecond);
    event YieldRealized(uint256 indexed nftId, uint256 amount, uint256 cumulative);
    event CollateralLocked(uint256 indexed nftId, uint256 amount);
    event CollateralPartiallyUnlocked(uint256 indexed nftId, uint256 amount);
    event YieldCapExceeded(uint256 indexed nftId, uint256 requested, uint256 capped);

    constructor(address _rewardToken) {
        require(_rewardToken != address(0), "Zero address");
        rewardToken = IERC20(_rewardToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function updateProjection(
        uint256 nftId,
        uint256 annualProjectedYield
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        // Cap yield to prevent manipulation
        if (annualProjectedYield > MAX_ANNUAL_YIELD) {
            emit YieldCapExceeded(nftId, annualProjectedYield, MAX_ANNUAL_YIELD);
            annualProjectedYield = MAX_ANNUAL_YIELD;
        }

        YieldRecord storage record = yields[nftId];
        _accrueYield(nftId);

        record.projectedYield = annualProjectedYield;
        record.yieldPerSecond = annualProjectedYield / 365 days;
        record.lastUpdateTimestamp = block.timestamp;
        record.active = true;

        emit YieldProjectionUpdated(nftId, annualProjectedYield, record.yieldPerSecond);
    }

    function recordRealizedYield(
        uint256 nftId,
        uint256 amount
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        YieldRecord storage record = yields[nftId];
        require(record.active, "Device not active");

        record.realizedYield += amount;
        _computeTieredUnlock(nftId);

        emit YieldRealized(nftId, amount, record.realizedYield);
    }

    function lockCollateral(uint256 nftId, uint256 amount) external onlyRole(LENDING_POOL_ROLE) whenNotPaused {
        require(amount > 0, "Zero amount");
        yields[nftId].lockedCollateral += amount;
        yields[nftId].unlockableCollateral = 0;
        emit CollateralLocked(nftId, amount);
    }

    function unlockPartialCollateral(uint256 nftId) external onlyRole(LENDING_POOL_ROLE) nonReentrant whenNotPaused returns (uint256) {
        YieldRecord storage record = yields[nftId];
        uint256 unlockable = record.unlockableCollateral;
        require(unlockable > 0, "Nothing to unlock");

        record.lockedCollateral -= unlockable;
        record.unlockableCollateral = 0;

        emit CollateralPartiallyUnlocked(nftId, unlockable);
        return unlockable;
    }

    /// @notice Tiered unlock: more collateral unlocks as more yield is realized
    function _computeTieredUnlock(uint256 nftId) internal {
        YieldRecord storage record = yields[nftId];
        if (record.lockedCollateral == 0 || record.projectedYield == 0) return;

        uint256 ratio = (record.realizedYield * 10000) / record.projectedYield;
        uint256 unlockPct;

        if (ratio >= TIER_4_THRESHOLD) unlockPct = 10000;
        else if (ratio >= TIER_3_THRESHOLD) unlockPct = 6000;
        else if (ratio >= TIER_2_THRESHOLD) unlockPct = 3000;
        else if (ratio >= TIER_1_THRESHOLD) unlockPct = 1000;
        else unlockPct = 0;

        uint256 unlockable = (record.lockedCollateral * unlockPct) / 10000;
        record.unlockableCollateral = unlockable;
    }

    function getPendingYield(uint256 nftId) external view returns (uint256) {
        YieldRecord storage record = yields[nftId];
        if (!record.active || record.yieldPerSecond == 0) return 0;
        return (block.timestamp - record.lastUpdateTimestamp) * record.yieldPerSecond;
    }

    function getEffectiveCollateral(uint256 nftId) external view returns (uint256) {
        YieldRecord storage record = yields[nftId];
        return record.lockedCollateral - record.unlockableCollateral;
    }

    function _accrueYield(uint256 nftId) internal {
        YieldRecord storage record = yields[nftId];
        if (record.active && record.yieldPerSecond > 0) {
            uint256 elapsed = block.timestamp - record.lastUpdateTimestamp;
            record.realizedYield += elapsed * record.yieldPerSecond;
            record.lastUpdateTimestamp = block.timestamp;
        }
    }

    function getYieldRecord(uint256 nftId) external view returns (
        uint256 projectedYield,
        uint256 realizedYield,
        uint256 lockedCollateral,
        uint256 unlockableCollateral,
        bool active
    ) {
        YieldRecord storage r = yields[nftId];
        return (r.projectedYield, r.realizedYield, r.lockedCollateral, r.unlockableCollateral, r.active);
    }
}