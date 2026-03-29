// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../RevenueTypes.sol";

interface IRevenueRouter {
    function routeFee(RevenueSource src, uint256 amount) external;
}
