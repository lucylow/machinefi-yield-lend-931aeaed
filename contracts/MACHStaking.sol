// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFeeDiscountModule.sol";

/**
 * @title MACHStaking
 * @notice Escrows MACH for protocol alignment. Implements `IFeeDiscountModule`: staked balance tiers reduce
 *         origination fee (bps) on new borrows when `LendingPool` points at this contract.
 * @dev Staked tokens are held by this contract — voting power follows ERC20 balance here, not the user wallet.
 *      Holders who need wallet-local voting should delegate or size stake accordingly (see tokenomics docs).
 */
contract MACHStaking is AccessControl, ReentrancyGuard, IFeeDiscountModule {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IERC20 public immutable mach;

    /// @notice Matches off-chain `feeMath` tiers: 2_500 / 10_000 / 50_000 MACH (18 decimals).
    uint256 public constant TIER1 = 2500 ether;
    uint256 public constant TIER2 = 10000 ether;
    uint256 public constant TIER3 = 50000 ether;

    mapping(address => uint256) public stakedBalance;

    uint256 public totalStaked;

    event MACHStaked(address indexed account, uint256 amount, uint256 newBalance);
    event MACHUnstaked(address indexed account, uint256 amount, uint256 newBalance);

    constructor(address _mach, address admin) {
        require(_mach != address(0) && admin != address(0), "MACHStaking: zero");
        mach = IERC20(_mach);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) return;
        mach.safeTransferFrom(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit MACHStaked(msg.sender, amount, stakedBalance[msg.sender]);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(stakedBalance[msg.sender] >= amount, "MACHStaking: bal");
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        mach.safeTransfer(msg.sender, amount);
        emit MACHUnstaked(msg.sender, amount, stakedBalance[msg.sender]);
    }

    /// @inheritdoc IFeeDiscountModule
    function originationDiscountBps(address borrower) external view override returns (uint16) {
        uint256 s = stakedBalance[borrower];
        if (s >= TIER3) return 15;
        if (s >= TIER2) return 10;
        if (s >= TIER1) return 5;
        return 0;
    }
}
