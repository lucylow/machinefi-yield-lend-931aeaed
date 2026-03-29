// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice First-class insurance / backstop balance for bad debt and stress coverage (governance-drawn).
contract InsuranceReserve is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IERC20 public immutable asset;

    /// @notice Minimum balance target for analytics / UI (does not block drawdowns).
    uint256 public reserveTarget;

    /// @notice Soft floor; drawdowns emit `ReserveBelowFloor` when balance dips under it.
    uint256 public reserveFloor;

    uint256 public totalFunded;
    uint256 public totalUsed;

    event ReserveFunded(address indexed from, uint256 amount, uint256 balanceAfter);
    event ReserveUsed(address indexed to, uint256 amount, bytes32 indexed reasonHash, string reason, uint256 balanceAfter);
    event ReserveReplenished(address indexed from, uint256 amount, uint256 balanceAfter);
    event ReserveBelowFloor(uint256 balance, uint256 floor);
    event ReserveParametersUpdated(uint256 target, uint256 floor);

    constructor(address _asset, address admin) {
        require(_asset != address(0) && admin != address(0), "InsuranceReserve: zero");
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);
    }

    function setReserveParameters(uint256 target, uint256 floor_) external onlyRole(GOVERNANCE_ROLE) {
        reserveTarget = target;
        reserveFloor = floor_;
        emit ReserveParametersUpdated(target, floor_);
    }

    /// @notice Anyone may fund the backstop (treasury, revenue router recipient, or ecosystem).
    function fund(uint256 amount) external {
        if (amount == 0) return;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        totalFunded += amount;
        uint256 bal = asset.balanceOf(address(this));
        emit ReserveFunded(msg.sender, amount, bal);
    }

    /// @notice Governance-only coverage (e.g. residual debt after liquidation shortfall).
    function coverShortfall(address to, uint256 amount, string calldata reason) external onlyRole(GOVERNANCE_ROLE) nonReentrant {
        require(to != address(0), "InsuranceReserve: zero to");
        if (amount == 0) return;
        asset.safeTransfer(to, amount);
        totalUsed += amount;
        uint256 bal = asset.balanceOf(address(this));
        bytes32 rh = keccak256(bytes(reason));
        emit ReserveUsed(to, amount, rh, reason, bal);
        if (bal < reserveFloor) {
            emit ReserveBelowFloor(bal, reserveFloor);
        }
    }

    function balance() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }
}
