// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title MachineFiTimelock
/// @notice Thin wrapper so Hardhat emits a local artifact (OZ npm contracts are not always artifact-addressable in HH3).

contract MachineFiTimelock is TimelockController {
    constructor(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin)
        TimelockController(minDelay, proposers, executors, admin)
    {}
}
