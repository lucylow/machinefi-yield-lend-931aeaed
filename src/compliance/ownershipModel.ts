import type { OwnershipClaimView } from "./types";

export function buildOwnershipClaimView(params: {
  walletAddress: string;
  nftHeldByPool: boolean;
  hasActiveLoan: boolean;
}): OwnershipClaimView {
  return {
    hardwareOwnerLabel: "You retain real-world hardware; the protocol does not take physical custody.",
    nftCustodyHolder: params.nftHeldByPool ? "lending_pool" : "user_wallet",
    claimHolder: params.walletAddress,
    claimLocked: params.nftHeldByPool && params.hasActiveLoan,
    loanBound: params.hasActiveLoan,
    lienActive: params.nftHeldByPool && params.hasActiveLoan,
    transferRestricted: params.nftHeldByPool && params.hasActiveLoan,
    nonCustodialStablecoin: true,
  };
}
