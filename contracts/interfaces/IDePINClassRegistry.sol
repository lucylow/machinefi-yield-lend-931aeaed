// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IDePINClassRegistry
/// @notice LendingPool reads class risk parameters without importing the full registry (narrow coupling).
interface IDePINClassRegistry {
    struct ClassConfig {
        uint32 proofFreshnessWindow;
        uint32 minProofInterval;
        uint32 yieldSmoothingWindowSec;
        uint16 classLtvBps;
        uint16 liquidationThresholdBps;
        uint16 confidenceWeightBps;
        uint16 staleMetadataHaircutBps;
        uint16 staleProofExtraHaircutBps;
        uint8 minConfidenceToBorrow;
        uint256 baseCollateralValueWad;
        bool requireInitialAttestation;
        uint32 supportedProofTypesBitmask;
    }

    function classConfigs(uint8 deviceClass) external view returns (ClassConfig memory);

    function getClassConfig(uint8 deviceClass) external view returns (ClassConfig memory);
}
