// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IEmergencyControls
/// @notice Lending pool emergency / pause surface for dashboards and composability (§14.7).

interface IEmergencyControls {
    enum ProtocolRiskMode {
        Healthy,
        ElevatedRisk,
        StaleData,
        Frozen,
        EmergencyPause,
        RecoveryMode
    }

    function riskMode() external view returns (ProtocolRiskMode);
    /// @dev Global pause uses OpenZeppelin `Pausable.paused()` on `LendingPool` (same contract as this interface).
    function oracleUpdatesPaused() external view returns (bool);
}
