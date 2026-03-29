// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./interfaces/IComplianceHook.sol";
import "./DePINClassRegistry.sol";

/**
 * @title HardwareNFT
 * @notice DePIN hardware as ERC-721 with explicit trust boundaries (see inline THREAT MODEL).
 *
 * THREAT MODEL (on-chain guarantees vs off-chain assumptions):
 * - Canonical identity: `bytes32 deviceId` MUST be unique; one NFT per deviceId (anti-duplicate / anti-spoof binding).
 * - Physicality / manufacturer claims: NOT verified on-chain unless `authorizedRegistrar` + `verifyDevice` path is used.
 * - Proof freshness: `lastProofTimestamp` + `STALENESS_THRESHOLD`; stale proofs reduce eligibility (`isCollateralEligible`).
 * - Proof replay: binding digest includes `chainid`, `contract`, `tokenId`, `proofSequence` (and optional Greenfield content hash).
 * - Greenfield CIDs: treated as pointers only; authoritative commitment is `lastProofContentHash` when set via attested path.
 * - Oracle-signed refresh: EIP-712 typed data; signer must be `hardwareBeneficialOwner`.
 * - BSC holds canonical registry state; opBNB / Greenfield data MUST be validated before borrow (LendingPool + this contract).
 */
contract HardwareNFT is ERC721, AccessControl, Pausable, EIP712 {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant DEVICE_GUARD_ROLE = keccak256("DEVICE_GUARD_ROLE");

    /// @dev EIP-712 type for oracle / owner-attested proof refresh
    bytes32 private constant PROOF_REFRESH_TYPEHASH = keccak256(
        "ProofRefresh(uint256 tokenId,uint256 nonce,bytes32 contentHash,uint256 observedAt)"
    );

    Counters.Counter private _tokenIds;

    enum DeviceType {
        Helium,
        Hivemapper,
        EvCharger,
        Custom
    }

    /// @notice Anti-spoofing / compliance lifecycle (conservative defaults in `isCollateralEligible`).
    enum DeviceSecurityState {
        Unverified,
        Verified,
        Suspicious,
        Frozen,
        Revoked,
        Blocked
    }

    struct Device {
        address owner;
        bytes32 deviceId;
        DeviceType deviceType;
        uint256 registrationTime;
        uint256 lastProofTimestamp;
        bool isActive;
        string greenfieldProofCID;
        bytes publicKey;
        /// @notice Submits proofs while NFT is escrowed in `lendingPool`.
        address hardwareBeneficialOwner;
        /// @notice Monotonic sequence for proof-binding digests (anti-replay).
        uint256 proofSequence;
        /// @notice Optional Greenfield / blob content hash anchor (immutable reference).
        bytes32 lastProofContentHash;
        DeviceSecurityState securityState;
        /// @notice Settlement layer where this identity was registered (BNB Chain canonical = block.chainid at mint).
        uint64 chainIdRegistered;
        /// @notice Opaque yield confidence tier for registry gating (0 = none).
        uint8 yieldConfidence;
        /// @notice 0 = unbound; 1 = bound as collateral to `collateralProtocol`.
        uint8 collateralBinding;
        address collateralProtocol;
    }

    mapping(uint256 => Device) public devices;
    mapping(address => uint256[]) public ownerDevices;
    mapping(bytes32 => bool) private _registeredDeviceIds;
    /// @notice Globally unique proof binding digests (cross-device replay prevention).
    mapping(bytes32 => bool) private _usedProofBinding;

    address public oracle;
    address public lendingPool;
    address public complianceHook;
    /// @notice If non-zero, only this address may call `registerDevice` (narrow registration path).
    address public authorizedRegistrar;
    /// @notice If true, `deposit` path in LendingPool should require `Verified` (see `isCollateralEligible`).
    bool public requireVerificationForBorrow;

    DePINClassRegistry public classRegistry;
    mapping(address => bool) public authorizedCollateralProtocols;

    uint256 public constant MIN_PROOF_INTERVAL = 5 minutes;
    uint256 public constant STALENESS_THRESHOLD = 30 days;
    /// @dev If class registry unset, scale collateral by this when proof is outside freshness window.
    uint256 public constant DEFAULT_STALE_PROOF_KEEP_BPS = 3500;
    /// @dev If class registry unset, CID-only proofs (no content hash) keep this fraction vs hash-anchored.
    uint256 public constant DEFAULT_WEAK_METADATA_KEEP_BPS = 7000;

    error DeviceAlreadyRegistered();
    error InvalidDeviceIdentity();
    error UnauthorizedRegistrar();
    error ProofAlreadyUsed();
    error ProofStale();
    error ProofNonceMismatch();
    error InvalidManufacturerSignature();
    error DeviceNotOperational();
    error ZeroAddress();
    error NotAuthorized();
    error CollateralAlreadyBound();
    error CollateralNotBound();

    event DeviceRegistered(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 deviceId,
        DeviceType deviceType,
        DeviceSecurityState initialState
    );
    event DeviceVerified(uint256 indexed tokenId, address indexed by);
    event DeviceSecurityStateChanged(
        uint256 indexed tokenId,
        DeviceSecurityState previous,
        DeviceSecurityState next,
        address indexed by
    );
    event DeviceSpoofingSuspected(uint256 indexed tokenId, string reason, address indexed by);
    event DeviceFrozenForReview(uint256 indexed tokenId, address indexed by);
    event ProofSubmitted(
        uint256 indexed tokenId,
        uint256 timestamp,
        string cid,
        bytes32 proofBinding,
        uint256 newSequence,
        bytes32 contentHash
    );
    event ProofRejected(uint256 indexed tokenId, string reason);
    event DeviceDeactivated(uint256 indexed tokenId);
    event DeviceReactivated(uint256 indexed tokenId);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event LendingPoolUpdated(address indexed pool);
    event ComplianceHookUpdated(address indexed hook);
    event AuthorizedRegistrarUpdated(address indexed registrar);
    event RequireVerificationForBorrowUpdated(bool required);
    event ClassRegistryUpdated(address indexed registry);
    event CollateralProtocolAllowed(address indexed protocol, bool allowed);
    event CollateralBonded(uint256 indexed tokenId, address indexed protocol, uint256 linkedId);
    event CollateralReleased(uint256 indexed tokenId, address indexed protocol, bool liquidated);

    constructor() ERC721("MachineFi Hardware", "MFH") EIP712("MachineFi Hardware", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
        _grantRole(DEVICE_GUARD_ROLE, msg.sender);
    }

    function setOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_oracle == address(0)) revert ZeroAddress();
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }

    function setLendingPool(address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (lendingPool != address(0)) {
            authorizedCollateralProtocols[lendingPool] = false;
        }
        lendingPool = _pool;
        if (_pool != address(0)) {
            authorizedCollateralProtocols[_pool] = true;
        }
        emit LendingPoolUpdated(_pool);
    }

    function setClassRegistry(address registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        classRegistry = DePINClassRegistry(registry);
        emit ClassRegistryUpdated(registry);
    }

    function setCollateralProtocol(address protocol, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authorizedCollateralProtocols[protocol] = allowed;
        emit CollateralProtocolAllowed(protocol, allowed);
    }

    function setComplianceHook(address _hook) external onlyRole(DEFAULT_ADMIN_ROLE) {
        complianceHook = _hook;
        emit ComplianceHookUpdated(_hook);
    }

    function setAuthorizedRegistrar(address r) external onlyRole(DEFAULT_ADMIN_ROLE) {
        authorizedRegistrar = r;
        emit AuthorizedRegistrarUpdated(r);
    }

    function setRequireVerificationForBorrow(bool required) external onlyRole(DEFAULT_ADMIN_ROLE) {
        requireVerificationForBorrow = required;
        emit RequireVerificationForBorrowUpdated(required);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Promote device to Verified (registrar or admin). Off-chain attestations should complete first.
    function verifyDevice(uint256 tokenId) external {
        if (!hasRole(REGISTRAR_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedRegistrar();
        }
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        DeviceSecurityState prev = dev.securityState;
        dev.securityState = DeviceSecurityState.Verified;
        emit DeviceSecurityStateChanged(tokenId, prev, DeviceSecurityState.Verified, msg.sender);
        emit DeviceVerified(tokenId, msg.sender);
    }

    function markSuspicious(uint256 tokenId, string calldata reason) external onlyRole(DEVICE_GUARD_ROLE) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        DeviceSecurityState prev = dev.securityState;
        dev.securityState = DeviceSecurityState.Suspicious;
        emit DeviceSpoofingSuspected(tokenId, reason, msg.sender);
        emit DeviceSecurityStateChanged(tokenId, prev, DeviceSecurityState.Suspicious, msg.sender);
    }

    function freezeForReview(uint256 tokenId) external onlyRole(DEVICE_GUARD_ROLE) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        DeviceSecurityState prev = dev.securityState;
        dev.securityState = DeviceSecurityState.Frozen;
        emit DeviceFrozenForReview(tokenId, msg.sender);
        emit DeviceSecurityStateChanged(tokenId, prev, DeviceSecurityState.Frozen, msg.sender);
    }

    function revokeDevice(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        DeviceSecurityState prev = dev.securityState;
        dev.securityState = DeviceSecurityState.Revoked;
        dev.isActive = false;
        emit DeviceSecurityStateChanged(tokenId, prev, DeviceSecurityState.Revoked, msg.sender);
    }

    function blockDevice(uint256 tokenId) external onlyRole(DEVICE_GUARD_ROLE) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        DeviceSecurityState prev = dev.securityState;
        dev.securityState = DeviceSecurityState.Blocked;
        dev.isActive = false;
        emit DeviceSecurityStateChanged(tokenId, prev, DeviceSecurityState.Blocked, msg.sender);
    }

    function setYieldConfidence(uint256 tokenId, uint8 tier) external onlyRole(REGISTRAR_ROLE) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        devices[tokenId].yieldConfidence = tier;
    }

    function registerDevice(
        bytes32 deviceId,
        DeviceType deviceType,
        string calldata greenfieldProofCID,
        bytes calldata publicKey
    ) external whenNotPaused returns (uint256) {
        address reg = authorizedRegistrar;
        if (reg != address(0) && msg.sender != reg) revert UnauthorizedRegistrar();
        if (deviceId == bytes32(0)) revert InvalidDeviceIdentity();
        if (publicKey.length == 0) revert InvalidDeviceIdentity();
        if (_registeredDeviceIds[deviceId]) revert DeviceAlreadyRegistered();

        _registeredDeviceIds[deviceId] = true;
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);

        DeviceSecurityState initialState = reg == address(0)
            ? DeviceSecurityState.Verified
            : DeviceSecurityState.Unverified;

        devices[newTokenId] = Device({
            owner: msg.sender,
            deviceId: deviceId,
            deviceType: deviceType,
            registrationTime: block.timestamp,
            lastProofTimestamp: block.timestamp,
            isActive: true,
            greenfieldProofCID: greenfieldProofCID,
            publicKey: publicKey,
            hardwareBeneficialOwner: msg.sender,
            proofSequence: 0,
            lastProofContentHash: bytes32(0),
            securityState: initialState,
            chainIdRegistered: uint64(block.chainid),
            yieldConfidence: 1,
            collateralBinding: 0,
            collateralProtocol: address(0)
        });

        ownerDevices[msg.sender].push(newTokenId);

        emit DeviceRegistered(newTokenId, msg.sender, deviceId, deviceType, initialState);
        return newTokenId;
    }

    /// @notice Same as `submitProof` but binds an explicit Greenfield / blob content hash (recommended for production).
    function submitProofWithContentHash(
        uint256 tokenId,
        string calldata newCID,
        bytes32 contentHash
    ) external whenNotPaused {
        if (contentHash == bytes32(0)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        _authorizeProofSubmit(tokenId, dev);
        if (complianceHook != address(0)) {
            (bool ok, ) = IComplianceHook(complianceHook).canRefreshProof(tokenId, msg.sender);
            if (!ok) {
                emit ProofRejected(tokenId, "compliance");
                revert DeviceNotOperational();
            }
        }
        if (block.timestamp < dev.lastProofTimestamp + MIN_PROOF_INTERVAL) revert ProofStale();

        bytes32 binding = keccak256(
            abi.encode(block.chainid, address(this), tokenId, contentHash, dev.proofSequence)
        );
        if (_usedProofBinding[binding]) revert ProofAlreadyUsed();
        _usedProofBinding[binding] = true;

        dev.lastProofTimestamp = block.timestamp;
        dev.greenfieldProofCID = newCID;
        dev.lastProofContentHash = contentHash;
        dev.isActive = true;
        uint256 seq = dev.proofSequence + 1;
        dev.proofSequence = seq;

        emit ProofSubmitted(tokenId, block.timestamp, newCID, binding, seq, contentHash);
    }

    /// @notice Backward-compatible path: binding uses CID string + sequence (weaker than explicit content hash).
    function submitProof(uint256 tokenId, string calldata newCID) external whenNotPaused {
        Device storage dev = devices[tokenId];
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        _authorizeProofSubmit(tokenId, dev);
        if (complianceHook != address(0)) {
            (bool ok, ) = IComplianceHook(complianceHook).canRefreshProof(tokenId, msg.sender);
            if (!ok) {
                emit ProofRejected(tokenId, "compliance");
                revert DeviceNotOperational();
            }
        }
        if (block.timestamp < dev.lastProofTimestamp + MIN_PROOF_INTERVAL) revert ProofStale();

        bytes32 binding = keccak256(
            abi.encode(block.chainid, address(this), tokenId, newCID, dev.proofSequence)
        );
        if (_usedProofBinding[binding]) revert ProofAlreadyUsed();
        _usedProofBinding[binding] = true;

        dev.lastProofTimestamp = block.timestamp;
        dev.greenfieldProofCID = newCID;
        dev.isActive = true;
        uint256 seq = dev.proofSequence + 1;
        dev.proofSequence = seq;

        emit ProofSubmitted(tokenId, block.timestamp, newCID, binding, seq, bytes32(0));
    }

    function _authorizeProofSubmit(uint256 tokenId, Device storage dev) internal view {
        address holder = ownerOf(tokenId);
        bool pooledBorrower = lendingPool != address(0) &&
            holder == lendingPool &&
            dev.hardwareBeneficialOwner == msg.sender;
        if (holder != msg.sender && !pooledBorrower) revert DeviceNotOperational();
    }

    function deactivateDevice(uint256 tokenId) external {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        if (msg.sender != oracle && !hasRole(DEVICE_GUARD_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert DeviceNotOperational();
        }
        devices[tokenId].isActive = false;
        emit DeviceDeactivated(tokenId);
    }

    function deactivateStaleDevice(uint256 tokenId) external {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        if (!dev.isActive) revert DeviceNotOperational();
        if (block.timestamp <= dev.lastProofTimestamp + STALENESS_THRESHOLD) revert ProofStale();
        dev.isActive = false;
        emit DeviceDeactivated(tokenId);
    }

    function getOwnerDevices(address _owner) external view returns (uint256[] memory) {
        return ownerDevices[_owner];
    }

    function isProofFresh(uint256 tokenId) public view returns (bool) {
        if (!_exists(tokenId)) return false;
        Device storage d = devices[tokenId];
        return block.timestamp <= d.lastProofTimestamp + _proofFreshnessWindow(tokenId);
    }

    function _proofFreshnessWindow(uint256 tokenId) internal view returns (uint256) {
        if (!_exists(tokenId)) return STALENESS_THRESHOLD;
        if (address(classRegistry) == address(0)) return STALENESS_THRESHOLD;
        return uint256(classRegistry.getClassConfig(uint8(devices[tokenId].deviceType)).proofFreshnessWindow);
    }

    /// @notice Stable read for integrators (avoids tuple index drift).
    function deviceClass(uint256 tokenId) external view returns (uint8) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        return uint8(devices[tokenId].deviceType);
    }

    function lastProofAt(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        return devices[tokenId].lastProofTimestamp;
    }

    function yieldConfidenceTier(uint256 tokenId) external view returns (uint8) {
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        return devices[tokenId].yieldConfidence;
    }

    /// @notice Greenfield / blob anchor for oracle cross-checks (avoids destructuring `devices()` dynamic tuple).
    function proofContentHash(uint256 tokenId) external view returns (bytes32) {
        if (!_exists(tokenId)) return bytes32(0);
        return devices[tokenId].lastProofContentHash;
    }

    /// @notice Conservative collateral gate for LendingPool (never treats ambiguous devices as fully bankable).
    function isCollateralEligible(uint256 tokenId) external view returns (bool) {
        return _collateralEligible(tokenId);
    }

    function _collateralEligible(uint256 tokenId) internal view returns (bool) {
        if (!_exists(tokenId)) return false;
        Device storage d = devices[tokenId];
        if (!d.isActive) return false;
        if (
            d.securityState == DeviceSecurityState.Revoked ||
            d.securityState == DeviceSecurityState.Blocked ||
            d.securityState == DeviceSecurityState.Frozen ||
            d.securityState == DeviceSecurityState.Suspicious
        ) {
            return false;
        }
        if (d.securityState == DeviceSecurityState.Unverified) {
            return false;
        }
        if (requireVerificationForBorrow && d.securityState != DeviceSecurityState.Verified) {
            return false;
        }
        return block.timestamp <= d.lastProofTimestamp + _proofFreshnessWindow(tokenId);
    }

    /// @notice Opens a new borrow path: must pass eligibility and not already bound.
    function canUseAsCollateral(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        if (devices[tokenId].collateralBinding != 0) return false;
        return _collateralEligible(tokenId);
    }

    /// @notice Risk-adjusted collateral (1e18 USD-scale) for LTV caps and oracle ceilings.
    /// @dev New borrows require `canUseAsCollateral` (fresh proof). Stale proof *reduces* this value so
    ///      liquidations and oracle-pushed collateral cannot stay optimistic when proofs age out (§16.3).
    function riskAdjustedCollateralWad(uint256 tokenId) public view returns (uint256) {
        if (!_exists(tokenId)) return 0;
        Device storage d = devices[tokenId];
        if (!d.isActive) return 0;
        if (
            d.securityState == DeviceSecurityState.Revoked ||
            d.securityState == DeviceSecurityState.Blocked ||
            d.securityState == DeviceSecurityState.Frozen ||
            d.securityState == DeviceSecurityState.Suspicious
        ) {
            return 0;
        }
        if (d.securityState == DeviceSecurityState.Unverified) {
            return 0;
        }
        if (requireVerificationForBorrow && d.securityState != DeviceSecurityState.Verified) {
            return 0;
        }

        uint256 baseWad = _fallbackBaseCollateralWad(d.deviceType);
        uint256 weightBps = 10_000;
        uint256 minConf = 1;
        uint256 staleProofKeepBps = DEFAULT_STALE_PROOF_KEEP_BPS;
        uint256 weakMetaKeepBps = DEFAULT_WEAK_METADATA_KEEP_BPS;

        if (address(classRegistry) != address(0)) {
            DePINClassRegistry.ClassConfig memory c = classRegistry.getClassConfig(uint8(d.deviceType));
            minConf = c.minConfidenceToBorrow;
            baseWad = c.baseCollateralValueWad;
            weightBps = (weightBps * c.confidenceWeightBps) / 10_000;
            uint256 sp = uint256(c.staleProofExtraHaircutBps);
            uint256 sm = uint256(c.staleMetadataHaircutBps);
            staleProofKeepBps = sp >= 10_000 ? 0 : 10_000 - sp;
            weakMetaKeepBps = sm >= 10_000 ? 0 : 10_000 - sm;
        }

        if (d.yieldConfidence < minConf) return 0;

        uint256 confBps = _confidenceTierBps(d.yieldConfidence);
        uint256 v = (baseWad * weightBps / 10_000) * confBps / 10_000;

        if (!isProofFresh(tokenId)) {
            v = (v * staleProofKeepBps) / 10_000;
        }
        if (d.lastProofContentHash == bytes32(0)) {
            v = (v * weakMetaKeepBps) / 10_000;
        }

        return v;
    }

    function borrowableCollateralWad(uint256 tokenId) external view returns (uint256) {
        return riskAdjustedCollateralWad(tokenId);
    }

    function onCollateralBond(uint256 tokenId, uint256 linkedPositionId) external {
        if (!authorizedCollateralProtocols[msg.sender]) revert NotAuthorized();
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage d = devices[tokenId];
        if (d.collateralBinding != 0) revert CollateralAlreadyBound();
        if (!_collateralEligible(tokenId)) revert DeviceNotOperational();
        d.collateralBinding = 1;
        d.collateralProtocol = msg.sender;
        emit CollateralBonded(tokenId, msg.sender, linkedPositionId);
    }

    function onCollateralRelease(uint256 tokenId, bool liquidated) external {
        if (!authorizedCollateralProtocols[msg.sender]) revert NotAuthorized();
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        Device storage d = devices[tokenId];
        if (d.collateralProtocol != msg.sender) revert CollateralNotBound();
        d.collateralBinding = 0;
        d.collateralProtocol = address(0);
        emit CollateralReleased(tokenId, msg.sender, liquidated);
    }

    function _fallbackBaseCollateralWad(DeviceType t) internal pure returns (uint256) {
        if (t == DeviceType.Helium) return 540 ether;
        if (t == DeviceType.Hivemapper) return 960 ether;
        if (t == DeviceType.EvCharger) return 1440 ether;
        return 720 ether;
    }

    function _confidenceTierBps(uint8 tier) internal pure returns (uint256) {
        if (tier >= 3) return 10_000;
        if (tier == 2) return 9500;
        if (tier == 1) return 8500;
        return 7000;
    }

    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        if (from != address(0) && to != address(0)) {
            if (devices[firstTokenId].collateralBinding != 0) revert NotAuthorized();
            devices[firstTokenId].owner = to;
            if (to != lendingPool && from != lendingPool) {
                devices[firstTokenId].hardwareBeneficialOwner = to;
            }
        }
    }

    function verifyProof(uint256 tokenId, string calldata) external view returns (bool) {
        return _collateralEligible(tokenId);
    }

    /// @notice Oracle-signed EIP-712 refresh; binds nonce and content hash to this chain and contract.
    function verifyAndUpdateProof(
        uint256 tokenId,
        uint256 nonce,
        bytes32 contentHash,
        uint256 observedAt,
        bytes calldata signature
    ) external whenNotPaused {
        if (msg.sender != oracle) revert DeviceNotOperational();
        if (!_exists(tokenId)) revert InvalidDeviceIdentity();
        if (contentHash == bytes32(0)) revert InvalidDeviceIdentity();
        Device storage dev = devices[tokenId];
        if (nonce != dev.proofSequence) revert ProofNonceMismatch();

        bytes32 structHash = keccak256(
            abi.encode(PROOF_REFRESH_TYPEHASH, tokenId, nonce, contentHash, observedAt)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = digest.recover(signature);
        if (signer != dev.hardwareBeneficialOwner) revert InvalidManufacturerSignature();

        bytes32 binding = keccak256(
            abi.encode(block.chainid, address(this), tokenId, contentHash, nonce)
        );
        if (_usedProofBinding[binding]) revert ProofAlreadyUsed();
        _usedProofBinding[binding] = true;

        dev.lastProofTimestamp = block.timestamp;
        dev.lastProofContentHash = contentHash;
        dev.isActive = true;
        dev.proofSequence = nonce + 1;

        emit ProofSubmitted(tokenId, block.timestamp, "", binding, dev.proofSequence, contentHash);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
