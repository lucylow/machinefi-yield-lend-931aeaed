// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title LiquidationEngine
 * @notice Handles partial and full liquidations with configurable triggers,
 *         per-device cooldowns, Dutch-auction bonus decay, and emergency pause.
 */
contract LiquidationEngine is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    uint256 public constant PARTIAL_LIQUIDATION_RATIO = 5000; // liquidate 50% of debt
    uint256 public constant MAX_LIQUIDATION_BONUS = 500;       // 5% max bonus (basis points)
    uint256 public constant MIN_LIQUIDATION_BONUS = 100;       // 1% min bonus
    uint256 public constant BONUS_DECAY_PERIOD = 6 hours;      // bonus decays from max to min over this period
    uint256 public constant FULL_LIQUIDATION_LTV = 9000;
    uint256 public constant PARTIAL_LIQUIDATION_LTV = 7500;
    uint256 public constant YIELD_UNDERPERFORMANCE_THRESHOLD = 5000;
    uint256 public constant LIQUIDATION_COOLDOWN = 1 hours;    // min time between liquidations on same nft

    IERC20 public stablecoin;
    IERC721 public hardwareNFT;

    struct LiquidationRecord {
        uint256 nftId;
        address liquidator;
        uint256 debtRepaid;
        uint256 collateralSeized;
        uint256 bonus;
        bool isPartial;
        uint256 timestamp;
    }

    LiquidationRecord[] public liquidationHistory;
    mapping(uint256 => uint256) public liquidationCount;
    mapping(uint256 => uint256) public lastLiquidationTime; // per-device cooldown

    event PartialLiquidation(uint256 indexed nftId, address indexed liquidator, uint256 debtRepaid, uint256 collateralReduced, uint256 bonus);
    event FullLiquidation(uint256 indexed nftId, address indexed liquidator, uint256 debtRepaid, uint256 collateralSeized, uint256 bonus);
    event YieldUnderperformanceLiquidation(uint256 indexed nftId, uint256 projectedYield, uint256 realizedYield);

    constructor(address _stablecoin, address _hardwareNFT) {
        require(_stablecoin != address(0) && _hardwareNFT != address(0), "Zero address");
        stablecoin = IERC20(_stablecoin);
        hardwareNFT = IERC721(_hardwareNFT);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    /// @notice Dutch-auction style: bonus starts at MAX right after activity, linearly decays to MIN,
    ///         then returns to MAX after BONUS_DECAY_PERIOD (incentivizes early liquidations).
    /// @notice Batch read for keepers / UI without N separate staticcalls.
    function batchCurrentBonus(uint256[] calldata nftIds) external view returns (uint256[] memory bonuses) {
        uint256 n = nftIds.length;
        bonuses = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            bonuses[i] = currentBonus(nftIds[i]);
        }
    }

    function currentBonus(uint256 nftId) public view returns (uint256) {
        uint256 lastTime = lastLiquidationTime[nftId];
        if (lastTime == 0) return MAX_LIQUIDATION_BONUS;

        uint256 elapsed = block.timestamp - lastTime;
        if (elapsed >= BONUS_DECAY_PERIOD) return MAX_LIQUIDATION_BONUS;

        uint256 range = MAX_LIQUIDATION_BONUS - MIN_LIQUIDATION_BONUS;
        uint256 decay = (range * elapsed) / BONUS_DECAY_PERIOD;
        return MAX_LIQUIDATION_BONUS - decay;
    }

    function canPartiallyLiquidate(uint256 currentLtv) public pure returns (bool) {
        return currentLtv >= PARTIAL_LIQUIDATION_LTV && currentLtv < FULL_LIQUIDATION_LTV;
    }

    function mustFullyLiquidate(uint256 currentLtv) public pure returns (bool) {
        return currentLtv >= FULL_LIQUIDATION_LTV;
    }

    function executePartialLiquidation(
        uint256 nftId,
        uint256 currentDebt,
        uint256 currentCollateral,
        address /* borrower */
    ) external onlyRole(KEEPER_ROLE) nonReentrant whenNotPaused returns (uint256 debtRepaid, uint256 collateralReduced) {
        require(
            block.timestamp >= lastLiquidationTime[nftId] + LIQUIDATION_COOLDOWN,
            "Cooldown active"
        );

        require(currentCollateral > 0, "Zero collateral");
        uint256 currentLtv = (currentDebt * 10000) / currentCollateral;
        require(canPartiallyLiquidate(currentLtv), "Not eligible for partial liquidation");

        debtRepaid = (currentDebt * PARTIAL_LIQUIDATION_RATIO) / 10000;
        uint256 bonus = (debtRepaid * currentBonus(nftId)) / 10000;
        collateralReduced = debtRepaid + bonus;

        stablecoin.safeTransferFrom(msg.sender, address(this), debtRepaid + bonus);

        lastLiquidationTime[nftId] = block.timestamp;
        liquidationCount[nftId]++;

        liquidationHistory.push(LiquidationRecord({
            nftId: nftId,
            liquidator: msg.sender,
            debtRepaid: debtRepaid,
            collateralSeized: collateralReduced,
            bonus: bonus,
            isPartial: true,
            timestamp: block.timestamp
        }));

        emit PartialLiquidation(nftId, msg.sender, debtRepaid, collateralReduced, bonus);
        return (debtRepaid, collateralReduced);
    }

    function executeFullLiquidation(
        uint256 nftId,
        uint256 currentDebt,
        uint256 currentCollateral,
        address /* borrower */
    ) external onlyRole(KEEPER_ROLE) nonReentrant whenNotPaused returns (uint256 debtRepaid) {
        require(
            block.timestamp >= lastLiquidationTime[nftId] + LIQUIDATION_COOLDOWN,
            "Cooldown active"
        );

        require(currentCollateral > 0, "Zero collateral");
        uint256 currentLtv = (currentDebt * 10000) / currentCollateral;
        require(mustFullyLiquidate(currentLtv), "Not eligible for full liquidation");

        debtRepaid = currentDebt;
        uint256 bonus = (debtRepaid * currentBonus(nftId)) / 10000;

        stablecoin.safeTransferFrom(msg.sender, address(this), debtRepaid + bonus);
        /// @dev This contract does not custody NFTs; the integrating lending pool must transfer
        ///      collateral to the liquidator. `hardwareNFT` is retained for future pool wiring.

        lastLiquidationTime[nftId] = block.timestamp;
        liquidationCount[nftId]++;

        liquidationHistory.push(LiquidationRecord({
            nftId: nftId,
            liquidator: msg.sender,
            debtRepaid: debtRepaid,
            collateralSeized: currentCollateral,
            bonus: bonus,
            isPartial: false,
            timestamp: block.timestamp
        }));

        emit FullLiquidation(nftId, msg.sender, debtRepaid, currentCollateral, bonus);
        return debtRepaid;
    }

    function getDeviceLiquidationCount(uint256 nftId) external view returns (uint256) {
        return liquidationCount[nftId];
    }

    function getLiquidationHistoryLength() external view returns (uint256) {
        return liquidationHistory.length;
    }

    /// @notice Get paginated liquidation history
    function getLiquidationHistoryPage(uint256 offset, uint256 limit) external view returns (LiquidationRecord[] memory) {
        uint256 total = liquidationHistory.length;
        if (offset >= total) return new LiquidationRecord[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        LiquidationRecord[] memory page = new LiquidationRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = liquidationHistory[i];
        }
        return page;
    }

    function withdrawToPool(address pool, uint256 amount) external onlyRole(LENDING_POOL_ROLE) {
        require(pool != address(0), "Zero address");
        stablecoin.safeTransfer(pool, amount);
    }
}