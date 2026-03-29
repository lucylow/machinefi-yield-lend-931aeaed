// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title MachineFiGovernor
 * @notice BNB-Chain MachineFi DAO control plane (whitepaper §14).
 *
 * ARCHITECTURE (explicit layers):
 * 1. Token voting — MACH (ERC20Votes) with checkpoints + delegation (§14.3).
 * 2. Counting — simple for / against / abstain (OZ GovernorCountingSimple).
 * 3. Quorum — fraction of total supply at snapshot, governable numerator (§14.2 / §14.8).
 * 4. Timelock — execution only after TimelockController delay (§14.8); proposer ≠ executor.
 * 5. Proposal safety — optional allowlist of contract targets so governance cannot silently
 *    call arbitrary EOAs or unreviewed modules (§14.9).
 *
 * LIFECYCLE: Pending → Active → Succeeded|Defeated → Queued → Executed (OZ + timelock).
 * Cancellation: pending-only by proposer (OZ default).
 */
contract MachineFiGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /// @notice If true, every proposal target must be a contract and appear in `trustedProposalTarget`.
    bool public immutable enforceProposalTargetAllowlist;

    mapping(address => bool) public trustedProposalTarget;

    event TrustedProposalTargetUpdated(address indexed target, bool trusted);

    error UntrustedProposalTarget(address target);
    error ProposalTargetNotContract(address target);

    constructor(
        string memory _name,
        ERC20Votes _token,
        TimelockController _timelock,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 quorumNumeratorValue,
        address[] memory initialTrustedTargets,
        bool _enforceProposalTargetAllowlist
    )
        Governor(_name)
        GovernorSettings(_votingDelay, _votingPeriod, _proposalThreshold)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(quorumNumeratorValue)
        GovernorTimelockControl(_timelock)
    {
        enforceProposalTargetAllowlist = _enforceProposalTargetAllowlist;
        uint256 n = initialTrustedTargets.length;
        for (uint256 i; i < n; ++i) {
            address t = initialTrustedTargets[i];
            if (t.code.length == 0) revert ProposalTargetNotContract(t);
            trustedProposalTarget[t] = true;
            emit TrustedProposalTargetUpdated(t, true);
        }
    }

    /// @dev Expand or shrink the execution surface; only executable via successful proposal → timelock.
    function setTrustedProposalTarget(address target, bool trusted) external onlyGovernance {
        if (trusted && target.code.length == 0) revert ProposalTargetNotContract(target);
        trustedProposalTarget[target] = trusted;
        emit TrustedProposalTargetUpdated(target, trusted);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256 proposalId) {
        if (enforceProposalTargetAllowlist) {
            uint256 len = targets.length;
            for (uint256 i; i < len; ++i) {
                address t = targets[i];
                if (t.code.length == 0) revert ProposalTargetNotContract(t);
                if (!trustedProposalTarget[t]) revert UntrustedProposalTarget(t);
            }
        }
        return super.propose(targets, values, calldatas, description);
    }

    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingDelay();
    }

    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) {
        return super.votingPeriod();
    }

    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) {
        return super.proposalThreshold();
    }

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }
}
