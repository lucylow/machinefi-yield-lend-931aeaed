// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./interfaces/ILendingPoolBnb.sol";
import "./HardwareNFT.sol";

/**
 * @title OracleConsumer
 * @notice BSC settlement consumer: validates compact L2/off-chain snapshots, enforces replay and staleness guards,
 *         optional Greenfield content-hash alignment with `HardwareNFT`, then batches collateral updates on `LendingPool`.
 *
 * Flow: device / opBNB `YieldEpochAggregator` → relayer → `applySnapshotBatch` → `LendingPool`.
 * Set `LendingPool.setOracle(address(this))` so only this contract may push priced collateral.
 */
contract OracleConsumer is AccessControl, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant SNAPSHOT_SIGNER_ROLE = keccak256("SNAPSHOT_SIGNER_ROLE");

    bytes32 private constant SNAPSHOT_TYPEHASH = keccak256(
        "Snapshot(uint256 nftId,uint256 collateralWad,uint256 observedAt,uint64 epochId,uint16 confidenceBps,bytes32 greenfieldContentHash,uint64 sourceChainId,uint256 nonce)"
    );

    ILendingPoolBnb public lendingPool;
    HardwareNFT public hardwareNFT;

    uint64 public expectedSourceChainId;
    uint256 public maxSnapshotAgeSeconds;
    uint16 public minConfidenceBps;
    bool public strictGreenfieldHashMatch;
    /// @notice If snapshot is older than this fraction of `maxSnapshotAgeSeconds`, apply haircut (still must be within max age).
    uint16 public freshnessHaircutThresholdBps;
    uint16 public staleFallbackHaircutBps;

    mapping(uint256 => uint256) public snapshotNonce;
    mapping(uint256 => uint64) public lastAppliedEpoch;
    mapping(uint256 => uint256) public lastGoodCollateralWad;

    struct Snapshot {
        uint256 nftId;
        uint256 collateralWad;
        uint256 observedAt;
        uint64 epochId;
        uint16 confidenceBps;
        bytes32 greenfieldContentHash;
        uint64 sourceChainId;
        uint256 nonce;
        bytes signature;
    }

    event LendingPoolUpdated(address indexed pool);
    event HardwareNFTUpdated(address indexed nft);
    event SourceChainUpdated(uint64 chainId);
    event SnapshotPolicyUpdated(uint256 maxAge, uint16 minConfidence, bool strictHash, uint16 freshnessThreshBps, uint16 staleHaircutBps);
    event SnapshotApplied(uint256 indexed nftId, uint256 collateralWad, uint64 epochId, bytes32 greenfieldContentHash);
    event SnapshotSkipped(uint256 indexed nftId, string reason);

    error ZeroAddress();
    error DuplicateNftInBatch();

    constructor(
        address _lendingPool,
        address _hardwareNFT,
        uint64 _expectedSourceChainId,
        uint256 _maxSnapshotAgeSeconds,
        uint16 _minConfidenceBps
    ) EIP712("MachineFi OracleConsumer", "1") {
        if (_lendingPool == address(0) || _hardwareNFT == address(0)) revert ZeroAddress();
        lendingPool = ILendingPoolBnb(_lendingPool);
        hardwareNFT = HardwareNFT(_hardwareNFT);
        expectedSourceChainId = _expectedSourceChainId;
        maxSnapshotAgeSeconds = _maxSnapshotAgeSeconds;
        minConfidenceBps = _minConfidenceBps;
        staleFallbackHaircutBps = 9500;
        freshnessHaircutThresholdBps = 8000;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, msg.sender);
        _grantRole(SNAPSHOT_SIGNER_ROLE, msg.sender);
    }

    function setLendingPool(address p) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (p == address(0)) revert ZeroAddress();
        lendingPool = ILendingPoolBnb(p);
        emit LendingPoolUpdated(p);
    }

    function setHardwareNFT(address n) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (n == address(0)) revert ZeroAddress();
        hardwareNFT = HardwareNFT(n);
        emit HardwareNFTUpdated(n);
    }

    function setExpectedSourceChainId(uint64 id) external onlyRole(DEFAULT_ADMIN_ROLE) {
        expectedSourceChainId = id;
        emit SourceChainUpdated(id);
    }

    function setSnapshotPolicy(
        uint256 _maxAge,
        uint16 _minConfidence,
        bool _strictGreenfield,
        uint16 _freshnessHaircutThresholdBps,
        uint16 _staleHaircutBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_staleHaircutBps <= 10_000 && _freshnessHaircutThresholdBps <= 10_000, "bps");
        maxSnapshotAgeSeconds = _maxAge;
        minConfidenceBps = _minConfidence;
        strictGreenfieldHashMatch = _strictGreenfield;
        freshnessHaircutThresholdBps = _freshnessHaircutThresholdBps;
        staleFallbackHaircutBps = _staleHaircutBps;
        emit SnapshotPolicyUpdated(_maxAge, _minConfidence, _strictGreenfield, _freshnessHaircutThresholdBps, _staleHaircutBps);
    }

    function _greenfieldHash(uint256 nftId) internal view returns (bytes32) {
        return hardwareNFT.proofContentHash(nftId);
    }

    function _authorizedSigner(address signer) internal view returns (bool) {
        return hasRole(RELAYER_ROLE, signer) || hasRole(SNAPSHOT_SIGNER_ROLE, signer);
    }

    function _validate(
        Snapshot calldata s,
        uint256 expectedNonce
    ) internal view returns (bool ok, uint256 collateralOut, string memory reason) {
        if (s.sourceChainId != expectedSourceChainId) return (false, 0, "sourceChain");
        if (s.observedAt > block.timestamp) return (false, 0, "future");
        if (block.timestamp > s.observedAt + maxSnapshotAgeSeconds) return (false, 0, "stale");
        if (s.confidenceBps < minConfidenceBps) return (false, 0, "confidence");
        if (s.nonce != expectedNonce) return (false, 0, "nonce");
        if (s.epochId < lastAppliedEpoch[s.nftId]) return (false, 0, "epoch");

        if (s.signature.length > 0) {
            bytes32 structHash = keccak256(
                abi.encode(
                    SNAPSHOT_TYPEHASH,
                    s.nftId,
                    s.collateralWad,
                    s.observedAt,
                    s.epochId,
                    s.confidenceBps,
                    s.greenfieldContentHash,
                    s.sourceChainId,
                    s.nonce
                )
            );
            bytes32 digest = _hashTypedDataV4(structHash);
            address signer = digest.recover(s.signature);
            if (!_authorizedSigner(signer)) return (false, 0, "sig");
        } else if (!hasRole(RELAYER_ROLE, msg.sender)) {
            return (false, 0, "relayer");
        }

        bytes32 onChainHash = _greenfieldHash(s.nftId);
        if (strictGreenfieldHashMatch && s.greenfieldContentHash != bytes32(0) && onChainHash != bytes32(0)) {
            if (onChainHash != s.greenfieldContentHash) return (false, 0, "greenfield");
        }

        uint256 col = s.collateralWad;
        uint256 age = block.timestamp - s.observedAt;
        uint256 thresh = (uint256(maxSnapshotAgeSeconds) * uint256(freshnessHaircutThresholdBps)) / 10_000;
        if (age > thresh) {
            col = (col * uint256(staleFallbackHaircutBps)) / 10_000;
        }

        return (true, col, "");
    }

    function applySnapshot(Snapshot calldata s) external onlyRole(RELAYER_ROLE) {
        uint256 expected = snapshotNonce[s.nftId];
        (bool ok, uint256 appliedCol, string memory reason) = _validate(s, expected);
        if (!ok) {
            emit SnapshotSkipped(s.nftId, reason);
            return;
        }
        (uint256 debt, , , , ) = lendingPool.getPosition(s.nftId);
        if (debt == 0) {
            emit SnapshotSkipped(s.nftId, "noPosition");
            return;
        }

        lendingPool.updateCollateralValue(s.nftId, appliedCol);

        unchecked {
            snapshotNonce[s.nftId]++;
        }
        lastAppliedEpoch[s.nftId] = s.epochId;
        lastGoodCollateralWad[s.nftId] = appliedCol;

        emit SnapshotApplied(s.nftId, appliedCol, s.epochId, s.greenfieldContentHash);
    }

    function applySnapshotBatch(Snapshot[] calldata snaps) external onlyRole(RELAYER_ROLE) {
        uint256 n = snaps.length;
        for (uint256 i; i < n; ++i) {
            for (uint256 j = i + 1; j < n; ++j) {
                if (snaps[i].nftId == snaps[j].nftId) revert DuplicateNftInBatch();
            }
        }

        uint256[] memory ids = new uint256[](n);
        uint256[] memory cols = new uint256[](n);
        uint256 k;

        for (uint256 i; i < n; ++i) {
            Snapshot calldata s = snaps[i];
            uint256 expected = snapshotNonce[s.nftId];
            (bool ok, uint256 appliedCol, string memory reason) = _validate(s, expected);
            if (!ok) {
                emit SnapshotSkipped(s.nftId, reason);
                continue;
            }
            (uint256 debt, , , , ) = lendingPool.getPosition(s.nftId);
            if (debt == 0) {
                emit SnapshotSkipped(s.nftId, "noPosition");
                continue;
            }
            ids[k] = s.nftId;
            cols[k] = appliedCol;
            unchecked {
                ++k;
            }
        }

        if (k == 0) return;

        if (k < n) {
            uint256[] memory ids2 = new uint256[](k);
            uint256[] memory cols2 = new uint256[](k);
            for (uint256 j; j < k; ++j) {
                ids2[j] = ids[j];
                cols2[j] = cols[j];
            }
            lendingPool.batchUpdateCollateralValueFromOracle(ids2, cols2);
        } else {
            lendingPool.batchUpdateCollateralValueFromOracle(ids, cols);
        }

        for (uint256 i; i < n; ++i) {
            Snapshot calldata s = snaps[i];
            uint256 expected = snapshotNonce[s.nftId];
            (bool ok, uint256 appliedCol, ) = _validate(s, expected);
            if (!ok) continue;
            (uint256 debt, , , , ) = lendingPool.getPosition(s.nftId);
            if (debt == 0) continue;

            unchecked {
                snapshotNonce[s.nftId]++;
            }
            lastAppliedEpoch[s.nftId] = s.epochId;
            lastGoodCollateralWad[s.nftId] = appliedCol;
            emit SnapshotApplied(s.nftId, appliedCol, s.epochId, s.greenfieldContentHash);
        }
    }
}

