// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IProtocolParameterRegistry.sol";

/// @title ProtocolParameterRegistry
/// @notice Bounded, event-heavy store for chain-scoped protocol parameters. Complements `DePINClassRegistry`
///         and pool-local state: keys here are indexed for analytics and human-readable governance diffs.

contract ProtocolParameterRegistry is AccessControl, IProtocolParameterRegistry {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    /// @dev Example keys (whitepaper §13 / §14.4 style naming)
    bytes32 public constant KEY_ORACLE_MAX_DEVIATION_BPS = keccak256("oracle.maxDeviationBps");
    bytes32 public constant KEY_ORACLE_MIN_QUORUM_PROVIDERS = keccak256("oracle.minQuorumProviders");
    bytes32 public constant KEY_LIQUIDATION_CLOSE_FACTOR_BPS = keccak256("liquidation.closeFactorBps");
    bytes32 public constant KEY_FEES_PROTOCOL_BPS = keccak256("fees.protocolBps");
    bytes32 public constant KEY_OPBNB_UPDATE_MAX_LAG_SEC = keccak256("opbnb.update.maxLagSec");
    bytes32 public constant KEY_GREENFIELD_PROOF_REF_TTL_SEC = keccak256("greenfield.proofRefTtlSec");

    mapping(bytes32 => uint256) private _uintParams;

    error ValueOutOfBounds(bytes32 key, uint256 value);
    error ValueTooLarge(uint256 value);

    event ParameterUpdated(
        bytes32 indexed key,
        uint256 oldValue,
        uint256 newValue,
        ChainLayer indexed layer,
        string reason
    );

    error ZeroAdmin();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);
    }

    function uintParam(bytes32 key) external view override returns (uint256) {
        return _uintParams[key];
    }

    /// @notice Governance-only; validates known keys conservatively.
    function setUint(bytes32 key, uint256 value, ChainLayer layer, string calldata reason) external onlyRole(GOVERNOR_ROLE) {
        if (value > type(uint128).max) revert ValueTooLarge(value);
        _enforceBounds(key, value);
        uint256 oldV = _uintParams[key];
        _uintParams[key] = value;
        emit ParameterUpdated(key, oldV, value, layer, reason);
    }

    function _enforceBounds(bytes32 key, uint256 value) internal pure {
        if (key == KEY_ORACLE_MAX_DEVIATION_BPS) {
            if (value < 50 || value > 5000) revert ValueOutOfBounds(key, value);
        } else if (key == KEY_ORACLE_MIN_QUORUM_PROVIDERS) {
            if (value < 1 || value > 32) revert ValueOutOfBounds(key, value);
        } else if (key == KEY_LIQUIDATION_CLOSE_FACTOR_BPS) {
            if (value < 1000 || value > 10000) revert ValueOutOfBounds(key, value);
        } else if (key == KEY_FEES_PROTOCOL_BPS) {
            if (value > 2000) revert ValueOutOfBounds(key, value);
        } else if (key == KEY_OPBNB_UPDATE_MAX_LAG_SEC) {
            if (value < 60 || value > 7 days) revert ValueOutOfBounds(key, value);
        } else if (key == KEY_GREENFIELD_PROOF_REF_TTL_SEC) {
            if (value < 1 hours || value > 90 days) revert ValueOutOfBounds(key, value);
        }
    }
}
