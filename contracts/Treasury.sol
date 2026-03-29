// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Treasury is AccessControl {
    using SafeERC20 for IERC20;
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    constructor(address _executor) {
        require(_executor != address(0), "Zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, _executor);
    }

    // Allow the executor (timelock) to transfer native tokens
    function transfer(address payable to, uint256 amount) external onlyRole(EXECUTOR_ROLE) {
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "Transfer failed");
    }

    // Allow the executor to transfer ERC20 tokens
    function transferERC20(address token, address to, uint256 amount) external onlyRole(EXECUTOR_ROLE) {
        require(token != address(0) && to != address(0), "Zero address");
        IERC20(token).safeTransfer(to, amount);
    }

    // Receive native tokens
    receive() external payable {}
}
