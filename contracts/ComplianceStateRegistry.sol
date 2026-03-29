// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IComplianceHook.sol";

/**
 * @title ComplianceStateRegistry
 * @notice Lightweight dispute / operational state per hardware NFT. Optional hook for LendingPool & HardwareNFT.
 *         Does not custody assets or collect PII. Governance/compliance operators update flags; events form an audit trail.
 */
contract ComplianceStateRegistry is AccessControl, IComplianceHook {
    bytes32 public constant COMPLIANCE_OPERATOR_ROLE = keccak256("COMPLIANCE_OPERATOR_ROLE");

    /// @notice Mirrors whitepaper dispute lifecycle (subset; extend off-chain as needed).
    enum DisputeState {
        Normal,
        UnderReview,
        Disputed,
        Escrowed,
        Suspended,
        ArbitrationPending,
        Resolved,
        Rejected
    }

    /// @notice Operational maintenance posture for UX-driven policy and future oracle integration.
    enum MaintenanceOperationalState {
        Normal,
        PlannedMaintenance,
        GracePeriod,
        Degraded,
        Haircut,
        LiquidationEligible
    }

    struct AssetComplianceState {
        DisputeState dispute;
        MaintenanceOperationalState maintenance;
        uint64 disputeUpdatedAt;
        uint64 maintenanceUpdatedAt;
        /// @notice Optional URI for attestations / dispute packs (IPFS hash, etc.)
        string disclosureURI;
    }

    mapping(uint256 => AssetComplianceState) public assetState;

    event DisputeStateSet(uint256 indexed nftId, DisputeState state, address indexed operator);
    event MaintenanceStateSet(uint256 indexed nftId, MaintenanceOperationalState state, address indexed operator);
    event DisclosureURISet(uint256 indexed nftId, string uri);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_OPERATOR_ROLE, admin);
    }

    function setDisputeState(uint256 nftId, DisputeState state) external onlyRole(COMPLIANCE_OPERATOR_ROLE) {
        assetState[nftId].dispute = state;
        assetState[nftId].disputeUpdatedAt = uint64(block.timestamp);
        emit DisputeStateSet(nftId, state, msg.sender);
    }

    function setMaintenanceState(uint256 nftId, MaintenanceOperationalState state)
        external
        onlyRole(COMPLIANCE_OPERATOR_ROLE)
    {
        assetState[nftId].maintenance = state;
        assetState[nftId].maintenanceUpdatedAt = uint64(block.timestamp);
        emit MaintenanceStateSet(nftId, state, msg.sender);
    }

    function setDisclosureURI(uint256 nftId, string calldata uri) external onlyRole(COMPLIANCE_OPERATOR_ROLE) {
        assetState[nftId].disclosureURI = uri;
        emit DisclosureURISet(nftId, uri);
    }

    function _disputeBlocksAction(DisputeState d) internal pure returns (bool) {
        return d == DisputeState.UnderReview ||
            d == DisputeState.Disputed ||
            d == DisputeState.Escrowed ||
            d == DisputeState.Suspended ||
            d == DisputeState.ArbitrationPending ||
            d == DisputeState.Rejected;
    }

    /// @inheritdoc IComplianceHook
    function canOpenPosition(uint256 nftId, address) external view override returns (bool ok, bytes32 reasonCode) {
        AssetComplianceState storage s = assetState[nftId];
        if (_disputeBlocksAction(s.dispute)) {
            return (false, keccak256("DISPUTE_ACTIVE"));
        }
        if (s.maintenance == MaintenanceOperationalState.LiquidationEligible) {
            return (false, keccak256("MAINTENANCE_LIQUIDATION_ONLY"));
        }
        return (true, bytes32(0));
    }

    /// @inheritdoc IComplianceHook
    function canRefreshProof(uint256 nftId, address) external view override returns (bool ok, bytes32 reasonCode) {
        if (_disputeBlocksAction(assetState[nftId].dispute)) {
            return (false, keccak256("DISPUTE_ACTIVE"));
        }
        return (true, bytes32(0));
    }
}
