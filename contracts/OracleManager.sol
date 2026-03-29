// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IOracleRegistry.sol";

/**
 * @title OracleManager
 * @notice Multi-provider yield/uptime oracle with median consensus, staleness TTL, optional outlier rejection,
 *         and explicit failure signaling for upstream lending risk engines.
 *
 * TRUST: Provider addresses are allow-listed; submissions are untrusted until consensus + freshness checks pass.
 *        A single provider cannot move consensus when `minProvidersForConsensus` > 1.
 *
 * GOVERNANCE (§14.5): whitelist / quorum / outlier policy changes require `GOVERNOR_ROLE` (Timelock).
 * `GUARDIAN_ROLE` may only trip the circuit breaker (fast incident response). Recovery is timelocked governance.
 */
contract OracleManager is AccessControl, IOracleRegistry {
    bytes32 public constant ORACLE_PROVIDER_ROLE = keccak256("ORACLE_PROVIDER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    uint256 public constant MAX_STALENESS = 1 hours;
    uint256 public constant MAX_DEVIATION_BPS = 2000;
    uint256 public constant MAX_SUBMISSIONS_PER_DEVICE = 50;
    uint256 public constant PROVIDER_COOLDOWN = 30 seconds;
    /// @notice TTL for `getConsensusYield` / `isConsensusFresh` (wall clock after last successful consensus).
    uint256 public constant CONSENSUS_TTL = 24 hours;

    /// @notice If true, submissions that deviate too far from prior consensus revert (strict mode).
    bool public rejectOutlierSubmissions;
    /// @notice Minimum distinct fresh submissions required to publish consensus (production: >= 2).
    uint256 public minProvidersForConsensus;

    bool public circuitBreakerTripped;
    /// @notice When consensus cannot be formed from fresh submissions, flag degraded (monitoring).
    bool public lastConsensusFailed;

    struct OracleData {
        uint256 yieldValue;
        uint256 uptimeScore;
        uint256 timestamp;
        address provider;
    }

    struct DeviceOracle {
        OracleData[] submissions;
        uint256 consensusYield;
        uint256 consensusUptime;
        uint256 lastConsensusTime;
        uint256 earningsHistoryHash;
        uint256 submissionHead;
    }

    mapping(uint256 => DeviceOracle) public deviceOracles;
    mapping(address => bool) public activeProviders;
    mapping(address => uint256) public lastSubmissionTime;
    uint256 public providerCount;

    event OracleSubmission(uint256 indexed nftId, address indexed provider, uint256 yieldValue, uint256 uptime);
    event OracleSubmissionRejected(uint256 indexed nftId, address indexed provider, string reason);
    event ConsensusReached(uint256 indexed nftId, uint256 consensusYield, uint256 consensusUptime, uint256 freshProviders);
    event OracleConsensusFailed(uint256 indexed nftId, uint256 freshCount, uint256 requiredMin);
    event OracleStale(uint256 indexed nftId, uint256 lastConsensusTime, uint256 ttl);
    event AnomalyDetected(uint256 indexed nftId, address indexed provider, string reason);
    event CircuitBreakerTripped(address indexed triggeredBy, string reason);
    event CircuitBreakerReset(address indexed admin);
    /// @dev Monitoring aliases (§16.4 / §16.10) — same actions as circuit breaker, explicit for indexers.
    event OracleFrozen(address indexed triggeredBy, string reason);
    event OracleRecovered(address indexed admin);
    event OracleFallbackActivated(uint256 indexed nftId, string reason);
    event RejectOutlierSubmissionsUpdated(bool reject);
    event MinProvidersForConsensusUpdated(uint256 minProviders);
    event OracleProviderListUpdated(address indexed provider, bool active, uint256 providerCountAfter);

    error CircuitBreakerActive();
    error OutlierRejected();
    error InvalidUptime();
    error InvalidYield();
    error CooldownActive();

    constructor(address admin) {
        address a = admin == address(0) ? msg.sender : admin;
        _grantRole(DEFAULT_ADMIN_ROLE, a);
        _grantRole(GOVERNOR_ROLE, a);
        _grantRole(GUARDIAN_ROLE, a);
        rejectOutlierSubmissions = true;
        minProvidersForConsensus = 1;
    }

    function isOracleProviderActive(address provider) external view override returns (bool) {
        return activeProviders[provider];
    }

    modifier whenNotTripped() {
        if (circuitBreakerTripped) revert CircuitBreakerActive();
        _;
    }

    function setRejectOutlierSubmissions(bool reject) external onlyRole(GOVERNOR_ROLE) {
        rejectOutlierSubmissions = reject;
        emit RejectOutlierSubmissionsUpdated(reject);
    }

    function setMinProvidersForConsensus(uint256 minProviders) external onlyRole(GOVERNOR_ROLE) {
        require(minProviders > 0, "min 1");
        minProvidersForConsensus = minProviders;
        emit MinProvidersForConsensusUpdated(minProviders);
    }

    function tripCircuitBreaker(string calldata reason) external onlyRole(GUARDIAN_ROLE) {
        circuitBreakerTripped = true;
        emit CircuitBreakerTripped(msg.sender, reason);
    }

    function resetCircuitBreaker() external onlyRole(GOVERNOR_ROLE) {
        circuitBreakerTripped = false;
        emit CircuitBreakerReset(msg.sender);
    }

    function addProvider(address provider) external onlyRole(GOVERNOR_ROLE) {
        require(provider != address(0), "Zero address");
        require(!activeProviders[provider], "Already active");
        _grantRole(ORACLE_PROVIDER_ROLE, provider);
        activeProviders[provider] = true;
        providerCount++;
        emit OracleProviderListUpdated(provider, true, providerCount);
    }

    function removeProvider(address provider) external onlyRole(GOVERNOR_ROLE) {
        require(activeProviders[provider], "Not active");
        _revokeRole(ORACLE_PROVIDER_ROLE, provider);
        activeProviders[provider] = false;
        providerCount--;
        emit OracleProviderListUpdated(provider, false, providerCount);
    }

    function submitData(
        uint256 nftId,
        uint256 yieldValue,
        uint256 uptimeScore,
        bytes calldata /* reserved attestation */
    ) external onlyRole(ORACLE_PROVIDER_ROLE) whenNotTripped {
        if (uptimeScore > 10000) revert InvalidUptime();
        if (yieldValue == 0) revert InvalidYield();
        if (block.timestamp < lastSubmissionTime[msg.sender] + PROVIDER_COOLDOWN) revert CooldownActive();

        lastSubmissionTime[msg.sender] = block.timestamp;
        DeviceOracle storage o = deviceOracles[nftId];

        if (o.consensusYield > 0) {
            uint256 deviation = yieldValue > o.consensusYield
                ? ((yieldValue - o.consensusYield) * 10000) / o.consensusYield
                : ((o.consensusYield - yieldValue) * 10000) / o.consensusYield;

            if (deviation > MAX_DEVIATION_BPS) {
                emit AnomalyDetected(nftId, msg.sender, "yield deviation");
                if (rejectOutlierSubmissions) {
                    emit OracleSubmissionRejected(nftId, msg.sender, "outlier");
                    revert OutlierRejected();
                }
            }
        }

        OracleData memory entry = OracleData({
            yieldValue: yieldValue,
            uptimeScore: uptimeScore,
            timestamp: block.timestamp,
            provider: msg.sender
        });

        if (o.submissions.length < MAX_SUBMISSIONS_PER_DEVICE) {
            o.submissions.push(entry);
        } else {
            o.submissions[o.submissionHead % MAX_SUBMISSIONS_PER_DEVICE] = entry;
            o.submissionHead++;
        }

        emit OracleSubmission(nftId, msg.sender, yieldValue, uptimeScore);
        _computeConsensus(nftId);
    }

    /// @notice Many devices in one tx — one provider cooldown check, lower per-device overhead on BSC/opBNB.
    function submitDataBatch(
        uint256[] calldata nftIds,
        uint256[] calldata yieldValues,
        uint256[] calldata uptimeScores
    ) external onlyRole(ORACLE_PROVIDER_ROLE) whenNotTripped {
        uint256 n = nftIds.length;
        require(n == yieldValues.length && n == uptimeScores.length, "len");
        if (block.timestamp < lastSubmissionTime[msg.sender] + PROVIDER_COOLDOWN) revert CooldownActive();
        lastSubmissionTime[msg.sender] = block.timestamp;

        for (uint256 i; i < n; ++i) {
            uint256 nftId = nftIds[i];
            uint256 yieldValue = yieldValues[i];
            uint256 uptimeScore = uptimeScores[i];
            if (uptimeScore > 10000) revert InvalidUptime();
            if (yieldValue == 0) revert InvalidYield();

            DeviceOracle storage o = deviceOracles[nftId];

            if (o.consensusYield > 0) {
                uint256 deviation = yieldValue > o.consensusYield
                    ? ((yieldValue - o.consensusYield) * 10000) / o.consensusYield
                    : ((o.consensusYield - yieldValue) * 10000) / o.consensusYield;

                if (deviation > MAX_DEVIATION_BPS) {
                    emit AnomalyDetected(nftId, msg.sender, "yield deviation");
                    if (rejectOutlierSubmissions) {
                        emit OracleSubmissionRejected(nftId, msg.sender, "outlier");
                        revert OutlierRejected();
                    }
                }
            }

            OracleData memory entry = OracleData({
                yieldValue: yieldValue,
                uptimeScore: uptimeScore,
                timestamp: block.timestamp,
                provider: msg.sender
            });

            if (o.submissions.length < MAX_SUBMISSIONS_PER_DEVICE) {
                o.submissions.push(entry);
            } else {
                o.submissions[o.submissionHead % MAX_SUBMISSIONS_PER_DEVICE] = entry;
                o.submissionHead++;
            }

            emit OracleSubmission(nftId, msg.sender, yieldValue, uptimeScore);
            _computeConsensus(nftId);
        }
    }

    function _computeConsensus(uint256 nftId) internal {
        DeviceOracle storage o = deviceOracles[nftId];
        uint256 len = o.submissions.length;
        uint256[] memory freshYields = new uint256[](len);
        uint256[] memory freshUptimes = new uint256[](len);
        uint256 freshCount = 0;

        for (uint256 i = 0; i < len; i++) {
            if (block.timestamp - o.submissions[i].timestamp <= MAX_STALENESS) {
                freshYields[freshCount] = o.submissions[i].yieldValue;
                freshUptimes[freshCount] = o.submissions[i].uptimeScore;
                freshCount++;
            }
        }

        if (freshCount >= minProvidersForConsensus) {
            _sort(freshYields, freshCount);
            _sort(freshUptimes, freshCount);

            o.consensusYield = freshYields[freshCount / 2];
            o.consensusUptime = freshUptimes[freshCount / 2];
            o.lastConsensusTime = block.timestamp;
            lastConsensusFailed = false;

            emit ConsensusReached(nftId, o.consensusYield, o.consensusUptime, freshCount);
        } else {
            lastConsensusFailed = true;
            emit OracleConsensusFailed(nftId, freshCount, minProvidersForConsensus);
            emit OracleFallbackActivated(nftId, "no_consensus");
        }
    }

    function _sort(uint256[] memory arr, uint256 len) internal pure {
        for (uint256 i = 1; i < len; i++) {
            uint256 key = arr[i];
            uint256 j = i;
            while (j > 0 && arr[j - 1] > key) {
                arr[j] = arr[j - 1];
                j--;
            }
            arr[j] = key;
        }
    }

    function getConsensusYield(uint256 nftId)
        external
        view
        returns (uint256 yield_, uint256 uptime, uint256 timestamp)
    {
        DeviceOracle storage o = deviceOracles[nftId];
        require(o.lastConsensusTime > 0, "no consensus");
        if (block.timestamp - o.lastConsensusTime > CONSENSUS_TTL) revert("stale consensus");
        return (o.consensusYield, o.consensusUptime, o.lastConsensusTime);
    }

    function isConsensusFresh(uint256 nftId) external view returns (bool) {
        return block.timestamp - deviceOracles[nftId].lastConsensusTime <= CONSENSUS_TTL;
    }

    /// @dev Backward-compatible alias for indexers.
    function isDataFresh(uint256 nftId) external view returns (bool) {
        return block.timestamp - deviceOracles[nftId].lastConsensusTime <= CONSENSUS_TTL;
    }

    function getSubmissionCount(uint256 nftId) external view returns (uint256) {
        return deviceOracles[nftId].submissions.length;
    }
}
