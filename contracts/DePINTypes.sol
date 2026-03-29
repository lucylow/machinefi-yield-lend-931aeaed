// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title DePINTypes
/// @notice Whitepaper §6 — shared enums for device identity, proof, yield, binding, and chain role.
///         BSC (BNB Smart Chain) holds canonical registry + collateral binding; opBNB is the
///         intended high-frequency proof/yield batching layer; Greenfield stores blobs referenced
///         by `metadataURI` / proof storage refs (hashes anchored here).

enum DepinSettlementLayer {
    BSC,
    opBNB
}

/// @dev Hardware class: Helium (uptime/participation), Hivemapper (sessions/coverage), EV charger (utilization).
enum DepinDeviceClass {
    Helium,
    Hivemapper,
    EvCharger,
    Custom
}

/// @dev Strict lifecycle — cosmetic names are forbidden; lending MUST consult `canUseAsCollateral`.
enum DeviceLifecycle {
    Registered,
    Verified,
    Active,
    Stale,
    Suspended,
    Frozen,
    Collateralized,
    Liquidatable,
    Liquidated,
    Released,
    Revoked
}

enum ProofStatus {
    Pending,
    Fresh,
    Verified,
    Stale,
    Suspect,
    Rejected,
    Expired
}

enum YieldConfidenceLevel {
    None,
    Low,
    Medium,
    High
}

enum AssetBindingState {
    Unbound,
    Bound,
    Locked,
    PartiallyReleased,
    FullyReleased,
    LiquidatedBinding
}

/// @dev Cross-layer sync between BSC settlement, opBNB summaries, and Greenfield anchors (§15.5).
enum ChainSyncStatus {
    Synced,
    Pending,
    Delayed,
    Stale,
    Diverged,
    Frozen
}

/// @dev Lifecycle of an opBNB-side snapshot before it is mirrored to BSC (§15.3 / §15.6).
enum SnapshotLifecycle {
    Fresh,
    Pending,
    Aggregated,
    Mirrored,
    Stale,
    Frozen
}

/// @dev Which logical layer owns a piece of config or state (§15 — BNB Chain integration).
enum ChainRole {
    None,
    CanonicalSettlement,
    HighFrequencyUpdate,
    ProofStorage
}
