import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

/** @type {import("hardhat/config").HardhatUserConfig} */
export default {
  plugins: [hardhatMocha, hardhatEthers],
  networks: {
    // Hardhat 3 default connection is the `default` simulated network (not `hardhat`).
    default: {
      type: "edr-simulated",
      /// @dev Local tests deploy `LendingPool` + linked types; bytecode exceeds EIP-170 without this (mainnet still enforces 24KB).
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./hardhat-tests",
    cache: "./cache_hardhat",
    artifacts: "./artifacts",
  },
  test: {
    mocha: {
      timeout: 120_000,
    },
  },
};
