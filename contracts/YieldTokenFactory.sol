// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./YieldToken.sol";

contract YieldTokenFactory {
    event YieldTokenCreated(address indexed token, address indexed lendingPool, uint256 nftId);

    function createYieldToken(
        address lendingPool,
        address hardwareNFT,
        uint256 nftId,
        uint256 yieldPercentage,
        address underlyingRewardToken
    ) external returns (address) {
        string memory name = string(abi.encodePacked("YieldToken_", Strings.toString(nftId)));
        string memory symbol = string(abi.encodePacked("yTKN_", Strings.toString(nftId)));
        YieldToken token = new YieldToken(
            name, symbol, lendingPool, hardwareNFT, yieldPercentage, underlyingRewardToken
        );
        emit YieldTokenCreated(address(token), lendingPool, nftId);
        return address(token);
    }
}
