// Contract addresses — update these after deploying contracts via Hardhat/Foundry
// See /contracts/README.md for deployment instructions

export const CONTRACT_ADDRESSES = {
  // Core contracts (BSC settlement layer)
  hardwareNFT: '0x0000000000000000000000000000000000000001',       // HardwareNFT.sol
  lendingPool: '0x0000000000000000000000000000000000000002',       // LendingPool.sol
  yieldTokenFactory: '0x0000000000000000000000000000000000000003', // YieldTokenFactory.sol
  /// @dev YieldUpdateMirror.sol — relayer pushes opBNB epoch summaries + Greenfield refs; zero = disabled
  yieldUpdateMirror: '0x0000000000000000000000000000000000000000',

  // Stablecoin used for loans (e.g. USDC on BSC)
  stablecoin: '0x0000000000000000000000000000000000000004',
} as const;

// BNB Smart Chain
export const BSC_TESTNET_CHAIN_ID = 97;
export const BSC_MAINNET_CHAIN_ID = 56;
export const EXPECTED_CHAIN_ID = BSC_TESTNET_CHAIN_ID;

export const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
export const BSC_MAINNET_RPC = 'https://bsc-dataseed.binance.org/';

// Stablecoin decimals (USDC = 6, most test tokens = 18 — match your deployed token)
export const STABLECOIN_DECIMALS = 18;

// Lending parameters (mirrored from LendingPool.sol)
export const BASE_INTEREST_RATE_BPS = 800;   // 8.00% APR
export const LIQUIDATION_THRESHOLD_BPS = 7500; // 75% LTV
export const LIQUIDATION_BONUS_PCT = 105;     // 5% bonus
export const MAX_INITIAL_LTV_BPS = 7000;      // 70% max initial LTV
