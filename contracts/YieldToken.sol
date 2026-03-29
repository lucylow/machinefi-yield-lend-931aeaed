// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract YieldToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    address public lendingPool;
    address public hardwareNFT;
    uint256 public tokenizedPercentage;
    address public underlyingRewardToken;

    constructor(
        string memory name,
        string memory symbol,
        address _lendingPool,
        address _hardwareNFT,
        uint256 _percentage,
        address _underlyingRewardToken
    ) ERC20(name, symbol) {
        require(
            _lendingPool != address(0) && _hardwareNFT != address(0) && _underlyingRewardToken != address(0),
            "Zero address"
        );
        require(_percentage > 0 && _percentage <= 100, "Invalid percentage");

        lendingPool = _lendingPool;
        hardwareNFT = _hardwareNFT;
        tokenizedPercentage = _percentage;
        underlyingRewardToken = _underlyingRewardToken;

        _grantRole(DEFAULT_ADMIN_ROLE, _lendingPool);
        _grantRole(MINTER_ROLE, _lendingPool);
        _grantRole(BURNER_ROLE, _lendingPool);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
}
