// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MACH
 * @notice Coordination token for MachineFi: governance voting (`ERC20Votes`), optional burn, mint under role.
 * @dev Utility surface: vote / delegate via OZ Governor stack (`getPastVotes` / block checkpoints; §14.3), stake in
 *      `MACHStaking` for borrow origination discounts, revenue share is delivered to a staker vault by `RevenueRouter`
 *      (not automatic buyback). Holding MACH alone does not change loan LTV or liquidation risk — those are device / pool parameters.
 */
contract MACH is ERC20Votes, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event MACHMinted(address indexed to, uint256 amount, address indexed minter);
    event MACHBurned(address indexed from, uint256 amount, address indexed burner);

    constructor(uint256 initialSupply) ERC20("MachineFi Governance", "MACH") ERC20Permit("MachineFi Governance") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit MACHMinted(to, amount, msg.sender);
    }

    function burn(uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(msg.sender, amount);
        emit MACHBurned(msg.sender, amount, msg.sender);
    }

    function burnFrom(address account, uint256 amount) external onlyRole(BURNER_ROLE) {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
        emit MACHBurned(account, amount, msg.sender);
    }
}
