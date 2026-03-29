// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title YieldEpochAggregator
 * @notice Deploy on opBNB: high-frequency device samples roll into epoch-scoped aggregates.
 *         Canonical lending state stays on BSC; relayers read aggregates/events and push compact snapshots to `OracleConsumer` on BSC.
 *
 * Gas: single SSTORE-heavy accumulator per device per epoch; no unbounded iteration on-chain.
 */
contract YieldEpochAggregator is AccessControl {
    bytes32 public constant SAMPLE_SUBMITTER_ROLE = keccak256("SAMPLE_SUBMITTER_ROLE");

    /// @notice Epoch length in seconds (e.g. 1 hours).
    uint64 public epochDuration;
    uint64 public immutable deployedAt;

    struct EpochAccumulator {
        uint64 epochId;
        uint128 yieldSum;
        uint64 sampleCount;
        uint64 uptimeSumBps;
        /// @notice Minimum confidence seen this epoch (0–10000 bps semantics, protocol-defined).
        uint16 minConfidenceBps;
        bool initialized;
    }

    mapping(uint256 => EpochAccumulator) internal _acc;

    event EpochDurationUpdated(uint64 previous, uint64 next);
    event SampleRecorded(
        uint256 indexed nftId,
        uint64 indexed epochId,
        uint128 yieldSample,
        uint32 uptimeBps,
        uint16 confidenceBps
    );

    error ZeroDuration();

    constructor(uint64 _epochDuration) {
        if (_epochDuration == 0) revert ZeroDuration();
        epochDuration = _epochDuration;
        deployedAt = uint64(block.timestamp);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SAMPLE_SUBMITTER_ROLE, msg.sender);
    }

    function setEpochDuration(uint64 d) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (d == 0) revert ZeroDuration();
        emit EpochDurationUpdated(epochDuration, d);
        epochDuration = d;
    }

    function currentEpochId() public view returns (uint64) {
        return uint64(block.timestamp / uint256(epochDuration));
    }

    /// @dev Resets accumulator when epoch rolls forward.
    function recordSample(uint256 nftId, uint128 yieldSample, uint32 uptimeBps, uint16 confidenceBps)
        external
        onlyRole(SAMPLE_SUBMITTER_ROLE)
    {
        require(uptimeBps <= 10_000, "uptime");
        uint64 eid = currentEpochId();
        EpochAccumulator storage a = _acc[nftId];
        if (!a.initialized || a.epochId != eid) {
            a.epochId = eid;
            a.yieldSum = 0;
            a.sampleCount = 0;
            a.uptimeSumBps = 0;
            a.minConfidenceBps = type(uint16).max;
            a.initialized = true;
        }
        a.yieldSum += yieldSample;
        a.sampleCount += 1;
        a.uptimeSumBps += uptimeBps;
        if (confidenceBps < a.minConfidenceBps) {
            a.minConfidenceBps = confidenceBps;
        }
        emit SampleRecorded(nftId, eid, yieldSample, uptimeBps, confidenceBps);
    }

    /// @notice Average yield and uptime for the accumulator’s epoch (0 if no samples).
    function getEpochAggregate(uint256 nftId)
        external
        view
        returns (
            uint64 epochId,
            uint256 avgYield,
            uint256 avgUptimeBps,
            uint16 minConfidenceBps,
            uint64 sampleCount
        )
    {
        EpochAccumulator storage a = _acc[nftId];
        epochId = a.epochId;
        sampleCount = a.sampleCount;
        if (sampleCount == 0) {
            return (epochId, 0, 0, 0, 0);
        }
        avgYield = uint256(a.yieldSum) / uint256(sampleCount);
        avgUptimeBps = uint256(a.uptimeSumBps) / uint256(sampleCount);
        minConfidenceBps = a.minConfidenceBps == type(uint16).max ? uint16(0) : a.minConfidenceBps;
    }
}
