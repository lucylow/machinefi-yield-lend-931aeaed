// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LiquidityEmissionController
 * @notice Bounded on-chain budget for liquidity / growth incentives (MACH or points reported by keeper).
 *         Does not custody tokens by default — records consumed budget for analytics and governance caps.
 */
contract LiquidityEmissionController is AccessControl {
    bytes32 public constant INCENTIVE_MANAGER_ROLE = keccak256("INCENTIVE_MANAGER_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    uint256 public emissionCap;
    uint256 public consumed;
    uint256 public epoch;
    uint256 public epochCap;

    event RewardRateUpdated(uint256 epoch, uint256 epochCap, uint256 globalCap);
    event IncentiveEmitted(address indexed pool, uint256 amount, uint256 consumedAfter, uint256 epoch);
    event EmissionCapUpdated(uint256 newCap);

    constructor(address admin, uint256 initialCap) {
        require(admin != address(0), "LiquidityEmissionController: zero");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);
        _grantRole(INCENTIVE_MANAGER_ROLE, admin);
        emissionCap = initialCap;
        epochCap = initialCap / 12;
    }

    function setEmissionCap(uint256 newCap) external onlyRole(GOVERNANCE_ROLE) {
        emissionCap = newCap;
        emit EmissionCapUpdated(newCap);
    }

    function setEpochCap(uint256 newEpochCap) external onlyRole(GOVERNANCE_ROLE) {
        epochCap = newEpochCap;
        emit RewardRateUpdated(epoch, epochCap, emissionCap);
    }

    function advanceEpoch() external onlyRole(GOVERNANCE_ROLE) {
        epoch += 1;
        emit RewardRateUpdated(epoch, epochCap, emissionCap);
    }

    /// @notice Records incentive spend; caller enforces actual token transfers elsewhere.
    function recordIncentive(address pool, uint256 amount) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        require(consumed + amount <= emissionCap, "LiquidityEmissionController: cap");
        consumed += amount;
        emit IncentiveEmitted(pool, amount, consumed, epoch);
    }
}
