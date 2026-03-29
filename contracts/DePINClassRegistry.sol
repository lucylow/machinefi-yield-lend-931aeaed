// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title DePINClassRegistry
/// @notice Per-class risk, proof cadence, yield smoothing, and collateral anchors. Governance
///         can revise parameters; events preserve history for indexers.

contract DePINClassRegistry is AccessControl {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    /// @param proofFreshnessWindow max seconds since last proof before financial "stale"
    /// @param minProofInterval anti-spam minimum between owner/oracle proof updates
    /// @param yieldSmoothingWindowSec EMA-style smoothing horizon for normalized yield
    /// @param classLtvBps suggested max initial LTV for this class (pool may enforce separately)
    /// @param liquidationThresholdBps suggested liquidation LTV trigger
    /// @param confidenceWeightBps scales risk-adjusted collateral (10000 = 1.0)
    /// @param staleMetadataHaircutBps applied when metadata marked stale (conservative)
    /// @param staleProofExtraHaircutBps extra haircut when proof status is stale vs fresh
    /// @param minConfidenceToBorrow minimum YieldConfidenceLevel (uint8) required to borrow
    /// @param baseCollateralValueWad USD-normalized base unit (1e18 = $1 scale as rest of protocol)
    /// @param requireInitialAttestation if true, registry requires non-zero initialProofHash at mint
    /// @param supportedProofTypesBitmask bit i = proof type i allowed for this class
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

    mapping(uint8 => ClassConfig) public classConfigs;
    /// @dev Keccak256 tags for upstream DePIN / storage networks (documentation & indexer hints).
    mapping(uint8 => bytes32) public classNetworkTag;

    event ClassConfigUpdated(uint8 indexed deviceClass, ClassConfig config, string reason);
    event ClassNetworkTagUpdated(uint8 indexed deviceClass, bytes32 tag);

    error ClassConfigOutOfBounds();

    constructor(address admin) {
        require(admin != address(0), "DePINClassRegistry: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);

        // Helium — burstier, shorter freshness expectation, higher haircuts
        classConfigs[uint8(0)] = ClassConfig({
            proofFreshnessWindow: 7 days,
            minProofInterval: 5 minutes,
            yieldSmoothingWindowSec: 14 days,
            classLtvBps: 6500,
            liquidationThresholdBps: 7800,
            confidenceWeightBps: 9200,
            staleMetadataHaircutBps: 1500,
            staleProofExtraHaircutBps: 2500,
            minConfidenceToBorrow: uint8(1), // Low
            baseCollateralValueWad: 540 ether,
            requireInitialAttestation: false,
            supportedProofTypesBitmask: 0x7 // heartbeat, beacon, aggregate
        });
        classNetworkTag[0] = keccak256("NETWORK_HELIUM_IOT");

        // Hivemapper — session / route coverage; medium cadence
        classConfigs[uint8(1)] = ClassConfig({
            proofFreshnessWindow: 10 days,
            minProofInterval: 10 minutes,
            yieldSmoothingWindowSec: 10 days,
            classLtvBps: 6800,
            liquidationThresholdBps: 8000,
            confidenceWeightBps: 9400,
            staleMetadataHaircutBps: 1200,
            staleProofExtraHaircutBps: 2000,
            minConfidenceToBorrow: uint8(1),
            baseCollateralValueWad: 960 ether,
            requireInitialAttestation: false,
            supportedProofTypesBitmask: 0x1f
        });
        classNetworkTag[1] = keccak256("NETWORK_HIVEMAPPER");

        // EV chargers — utilization / session; smoother yield profile in model
        classConfigs[uint8(2)] = ClassConfig({
            proofFreshnessWindow: 14 days,
            minProofInterval: 15 minutes,
            yieldSmoothingWindowSec: 30 days,
            classLtvBps: 7000,
            liquidationThresholdBps: 8200,
            confidenceWeightBps: 9700,
            staleMetadataHaircutBps: 1000,
            staleProofExtraHaircutBps: 1800,
            minConfidenceToBorrow: uint8(1),
            baseCollateralValueWad: 1440 ether,
            requireInitialAttestation: false,
            supportedProofTypesBitmask: 0x3f
        });
        classNetworkTag[2] = keccak256("NETWORK_EV_CHARGING_DEPIN");

        // Custom — conservative defaults
        classConfigs[uint8(3)] = ClassConfig({
            proofFreshnessWindow: 5 days,
            minProofInterval: 30 minutes,
            yieldSmoothingWindowSec: 7 days,
            classLtvBps: 5500,
            liquidationThresholdBps: 7000,
            confidenceWeightBps: 8500,
            staleMetadataHaircutBps: 2000,
            staleProofExtraHaircutBps: 3000,
            minConfidenceToBorrow: uint8(2), // Medium
            baseCollateralValueWad: 720 ether,
            requireInitialAttestation: false,
            supportedProofTypesBitmask: type(uint32).max
        });
        classNetworkTag[3] = keccak256("NETWORK_CUSTOM_DEPIN");
    }

    function setClassConfig(uint8 deviceClass, ClassConfig calldata cfg, string calldata reason)
        external
        onlyRole(GOVERNOR_ROLE)
    {
        _validateClassConfig(cfg);
        classConfigs[deviceClass] = cfg;
        emit ClassConfigUpdated(deviceClass, cfg, reason);
    }

    /// @dev Conservative bounds so governance cannot one-shot over-lever the pool off-chain mirror (§14.6).
    function _validateClassConfig(ClassConfig calldata cfg) internal pure {
        if (cfg.proofFreshnessWindow < 1 hours || cfg.proofFreshnessWindow > 30 days) revert ClassConfigOutOfBounds();
        if (cfg.minProofInterval < 1 minutes || cfg.minProofInterval > 24 hours) revert ClassConfigOutOfBounds();
        if (cfg.yieldSmoothingWindowSec < 1 hours || cfg.yieldSmoothingWindowSec > 120 days) revert ClassConfigOutOfBounds();
        if (cfg.classLtvBps < 3000 || cfg.classLtvBps > 9000) revert ClassConfigOutOfBounds();
        if (cfg.liquidationThresholdBps <= cfg.classLtvBps || cfg.liquidationThresholdBps > 9500) revert ClassConfigOutOfBounds();
        if (cfg.confidenceWeightBps < 5000 || cfg.confidenceWeightBps > 10000) revert ClassConfigOutOfBounds();
        if (cfg.staleMetadataHaircutBps > 6000 || cfg.staleProofExtraHaircutBps > 6000) revert ClassConfigOutOfBounds();
        if (cfg.minConfidenceToBorrow > 3) revert ClassConfigOutOfBounds();
    }

    function setClassNetworkTag(uint8 deviceClass, bytes32 tag) external onlyRole(GOVERNOR_ROLE) {
        classNetworkTag[deviceClass] = tag;
        emit ClassNetworkTagUpdated(deviceClass, tag);
    }

    function getClassConfig(uint8 deviceClass) external view returns (ClassConfig memory) {
        return classConfigs[deviceClass];
    }
}
