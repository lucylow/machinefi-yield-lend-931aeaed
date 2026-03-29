// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @notice Minimal view for RWA-style ERC-721 collateral (e.g. RWAAsset).
interface IRWAAssetView {
    function assets(uint256 tokenId)
        external
        view
        returns (
            address owner,
            uint8 assetType,
            uint256 value,
            string memory metadataURI,
            bool verified,
            address verifier,
            uint256 verificationTime,
            bool active
        );
}

/**
 * @title LendingPoolRWA
 * @notice Multi-collateral RWA lending with interest accrual, pausable ops, and safe token transfers.
 */
contract LendingPoolRWA is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public stablecoin;
    mapping(address => bool) public supportedCollateralTokens;

    /// @notice Max borrow LTV in basis points (e.g. 7000 = 70%).
    uint256 public maxBorrowLTVBps = 7000;
    /// @notice APR in basis points, governance-editable (same semantics as LendingPool).
    uint256 public interestRateBps = 800;

    struct Position {
        uint256 debt;
        uint256 collateralValue;
        uint256 ltv;
        address collateralContract;
        uint256 tokenId;
        address borrower;
        uint256 lastUpdateTimestamp;
    }

    mapping(uint256 => Position) public positions;
    uint256 public nextPositionId = 1;

    event Deposited(address indexed borrower, uint256 positionId, address collateralContract, uint256 tokenId, uint256 amount);
    event Repaid(address indexed borrower, uint256 positionId, uint256 principal, uint256 interest);
    event SupportedCollateralUpdated(address indexed token, bool supported);
    event MaxBorrowLTVUpdated(uint256 bps);
    event InterestRateUpdated(uint256 bps);

    constructor(address _stablecoin) {
        require(_stablecoin != address(0), "Zero address");
        stablecoin = IERC20(_stablecoin);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function addSupportedCollateral(address _collateralContract) external onlyOwner {
        require(_collateralContract != address(0), "Zero address");
        supportedCollateralTokens[_collateralContract] = true;
        emit SupportedCollateralUpdated(_collateralContract, true);
    }

    function removeSupportedCollateral(address _collateralContract) external onlyOwner {
        supportedCollateralTokens[_collateralContract] = false;
        emit SupportedCollateralUpdated(_collateralContract, false);
    }

    function setMaxBorrowLTV(uint256 bps) external onlyOwner {
        require(bps > 0 && bps <= 9000, "Invalid LTV");
        maxBorrowLTVBps = bps;
        emit MaxBorrowLTVUpdated(bps);
    }

    function setInterestRateBps(uint256 bps) external onlyOwner {
        require(bps <= 5000, "Rate exceeds 50%");
        interestRateBps = bps;
        emit InterestRateUpdated(bps);
    }

    function deposit(address collateralContract, uint256 tokenId, uint256 borrowAmount)
        external
        nonReentrant
        whenNotPaused
    {
        require(supportedCollateralTokens[collateralContract], "Collateral not supported");
        IERC721 collateral = IERC721(collateralContract);
        require(collateral.ownerOf(tokenId) == msg.sender, "Not owner");

        uint256 collateralValue = getCollateralValue(collateralContract, tokenId);
        require(collateralValue > 0, "No value");

        uint256 maxBorrow = (collateralValue * maxBorrowLTVBps) / 10000;
        require(borrowAmount <= maxBorrow, "Borrow amount too high");
        require(borrowAmount > 0, "Zero borrow");
        require(stablecoin.balanceOf(address(this)) >= borrowAmount, "Insufficient liquidity");

        collateral.transferFrom(msg.sender, address(this), tokenId);

        stablecoin.safeTransfer(msg.sender, borrowAmount);

        uint256 positionId = nextPositionId++;
        positions[positionId] = Position({
            debt: borrowAmount,
            collateralValue: collateralValue,
            ltv: (borrowAmount * 10000) / collateralValue,
            collateralContract: collateralContract,
            tokenId: tokenId,
            borrower: msg.sender,
            lastUpdateTimestamp: block.timestamp
        });

        emit Deposited(msg.sender, positionId, collateralContract, tokenId, borrowAmount);
    }

    function repay(uint256 positionId) external nonReentrant whenNotPaused {
        Position storage pos = positions[positionId];
        require(pos.debt > 0, "No active position");
        require(pos.borrower == msg.sender, "Not borrower");

        uint256 interest = _accruedInterest(pos);
        uint256 principal = pos.debt;
        uint256 total = principal + interest;

        address borrower = pos.borrower;
        address collateralAddr = pos.collateralContract;
        uint256 tId = pos.tokenId;

        stablecoin.safeTransferFrom(msg.sender, address(this), total);

        IERC721(collateralAddr).transferFrom(address(this), borrower, tId);

        delete positions[positionId];

        emit Repaid(borrower, positionId, principal, interest);
    }

    function _accruedInterest(Position storage pos) internal view returns (uint256) {
        if (pos.debt == 0) return 0;
        uint256 elapsed = block.timestamp - pos.lastUpdateTimestamp;
        if (elapsed == 0) return 0;
        return (pos.debt * interestRateBps * elapsed) / (10000 * 365 days);
    }

    /// @notice On-chain value for supported RWA contracts; requires `assets(uint256)` layout compatible with RWAAsset.
    function getCollateralValue(address collateralContract, uint256 tokenId) public view returns (uint256) {
        IRWAAssetView asset = IRWAAssetView(collateralContract);
        (, , uint256 value, , , , , bool active) = asset.assets(tokenId);
        if (!active) return 0;
        return value;
    }
}
