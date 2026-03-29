// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract RWAAsset is ERC721, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // Asset types
    enum AssetType { RealEstate, Invoice, Commodity, Other }

    struct Asset {
        address owner;
        AssetType assetType;
        uint256 value;               // estimated USD value (scaled by 1e18)
        string metadataURI;          // IPFS/Arweave URI with documents
        bool verified;
        address verifier;
        uint256 verificationTime;
        bool active;
    }

    mapping(uint256 => Asset) public assets;
    mapping(address => uint256[]) public ownerAssets;

    event AssetRegistered(uint256 indexed tokenId, address indexed owner, AssetType assetType, uint256 value);
    event AssetVerified(uint256 indexed tokenId, address indexed verifier);
    event AssetDeactivated(uint256 indexed tokenId);

    constructor() ERC721("RealWorldAsset", "RWA") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    // Mint a new asset token – only callable by trusted verifier
    function mintAsset(
        address owner,
        AssetType assetType,
        uint256 value,
        string calldata metadataURI
    ) external onlyRole(VERIFIER_ROLE) returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(owner, newTokenId);

        assets[newTokenId] = Asset({
            owner: owner,
            assetType: assetType,
            value: value,
            metadataURI: metadataURI,
            verified: true,          // minted only after off‑chain verification
            verifier: msg.sender,
            verificationTime: block.timestamp,
            active: true
        });

        ownerAssets[owner].push(newTokenId);

        emit AssetRegistered(newTokenId, owner, assetType, value);
        emit AssetVerified(newTokenId, msg.sender);
        return newTokenId;
    }

    // Update asset value (e.g., after appraisal)
    function updateValue(uint256 tokenId, uint256 newValue) external onlyRole(VERIFIER_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        assets[tokenId].value = newValue;
    }

    // Deactivate asset (e.g., if it's no longer valid collateral)
    function deactivateAsset(uint256 tokenId) external onlyRole(VERIFIER_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        assets[tokenId].active = false;
        emit AssetDeactivated(tokenId);
    }

    // Transfer must be overridden to enforce restrictions (optional)
    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize) internal override {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
        // Optionally prevent transfer if asset is being used as collateral
        // For simplicity, we allow transfers but the lending pool will check ownership.
    }

    function getOwnerAssets(address owner) external view returns (uint256[] memory) {
        return ownerAssets[owner];
    }

    function getAssetValue(uint256 tokenId) external view returns (uint256) {
        require(_exists(tokenId), "Token does not exist");
        return assets[tokenId].value;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
