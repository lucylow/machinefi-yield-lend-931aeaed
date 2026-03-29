/**
 * BNB Chain layered stack — settlement (BSC), high-frequency updates (opBNB), proof storage (Greenfield).
 * Mirrors whitepaper §15; use for UI copy and deployment validation (not decorative branding).
 */

export type ChainSyncUiStatus = 'synced' | 'pending' | 'delayed' | 'stale' | 'diverged' | 'frozen';

export type ChainLayerRole = 'canonical_settlement' | 'high_frequency_update' | 'proof_storage';

export interface ChainLayerMeta {
  chainId: number;
  chainName: string;
  shortName: string;
  role: ChainLayerRole;
  isCanonical: boolean;
  isSettlementLayer: boolean;
  isUpdateLayer: boolean;
  isStorageLayer: boolean;
  explorerUrl?: string;
  rpcUrl?: string;
}

/** BSC — debt, collateral bonding, liquidation, governance outcomes. */
export const BSC_TESTNET: ChainLayerMeta = {
  chainId: 97,
  chainName: 'BNB Smart Chain Testnet',
  shortName: 'BSC',
  role: 'canonical_settlement',
  isCanonical: true,
  isSettlementLayer: true,
  isUpdateLayer: false,
  isStorageLayer: false,
  explorerUrl: 'https://testnet.bscscan.com',
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
};

export const BSC_MAINNET: ChainLayerMeta = {
  chainId: 56,
  chainName: 'BNB Smart Chain',
  shortName: 'BSC',
  role: 'canonical_settlement',
  isCanonical: true,
  isSettlementLayer: true,
  isUpdateLayer: false,
  isStorageLayer: false,
  explorerUrl: 'https://bscscan.com',
  rpcUrl: 'https://bsc-dataseed.binance.org/',
};

/** opBNB — yield snapshots, heartbeats, epoch aggregation (mirrored to BSC via relayer). */
export const OPBNB_TESTNET: ChainLayerMeta = {
  chainId: 5611,
  chainName: 'opBNB Testnet',
  shortName: 'opBNB',
  role: 'high_frequency_update',
  isCanonical: false,
  isSettlementLayer: false,
  isUpdateLayer: true,
  isStorageLayer: false,
  explorerUrl: 'https://testnet.opbnbscan.com',
};

export const OPBNB_MAINNET: ChainLayerMeta = {
  chainId: 204,
  chainName: 'opBNB',
  shortName: 'opBNB',
  role: 'high_frequency_update',
  isCanonical: false,
  isSettlementLayer: false,
  isUpdateLayer: true,
  isStorageLayer: false,
  explorerUrl: 'https://opbnbscan.com',
};

/** Greenfield — durable proof objects & metadata; on-chain only stores hashes / pointers. */
export const GREENFIELD_META: ChainLayerMeta = {
  chainId: 0,
  chainName: 'BNB Greenfield',
  shortName: 'Greenfield',
  role: 'proof_storage',
  isCanonical: false,
  isSettlementLayer: false,
  isUpdateLayer: false,
  isStorageLayer: true,
};

export const BNB_STACK_LAYERS: ChainLayerMeta[] = [BSC_TESTNET, OPBNB_TESTNET, GREENFIELD_META];

export function settlementLayerForEnv(isMainnet: boolean): ChainLayerMeta {
  return isMainnet ? BSC_MAINNET : BSC_TESTNET;
}

export const ACTION_COPY = {
  borrow: 'This action settles on BSC — stablecoin borrow, NFT escrow, and debt state are canonical there.',
  repay: 'Repayment settles on BSC and releases collateral per pool rules.',
  proofRefresh:
    'Proof-of-operation updates are batched on opBNB, then mirrored to BSC; frequent heartbeats stay off the settlement layer.',
  greenfield: 'Large proof payloads and metadata live in BNB Greenfield; BSC stores content hashes and object keys.',
  wrongNetwork: 'Borrowing is blocked on the wrong network. Switch to BSC for settlement.',
} as const;
