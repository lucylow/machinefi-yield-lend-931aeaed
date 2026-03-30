/** User-facing message from unknown thrown values (API, fetch, etc.). */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message?.trim()) return err.message;
    if ((err as any).cause !== undefined) return getErrorMessage((err as any).cause);
    return 'Something went wrong. Please try again.';
  }
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Something went wrong. Please try again.';
}

/** Map common ethers / wallet errors to short UI copy. */
export function getTxErrorMessage(err: unknown): string {
  const raw = getErrorMessage(err);
  if (/user rejected|denied transaction|ACTION_REJECTED|4001/i.test(raw)) {
    return 'Transaction was rejected in your wallet.';
  }
  if (/insufficient funds|insufficient balance/i.test(raw)) {
    return 'Insufficient balance for this transaction.';
  }
  if (/nonce|replacement transaction/i.test(raw)) {
    return 'Wallet nonce conflict. Try again or reset the pending transaction in your wallet.';
  }
  if (/network|timeout|failed to fetch/i.test(raw)) {
    return 'Network error. Check your connection and try again.';
  }
  if (/CALL_EXCEPTION|execution reverted|revert/i.test(raw)) {
    return 'The contract reverted. Check amounts, approvals, and pool state.';
  }
  if (/UNPREDICTABLE_GAS_LIMIT|cannot estimate gas/i.test(raw)) {
    return 'This transaction may fail simulation. Verify inputs and contract state.';
  }
  return raw.length < 120 ? raw : 'Transaction failed. Please try again.';
}

/** User-facing copy for background data loads (devices, portfolio, edge functions). */
export function getLoadErrorMessage(err: unknown, fallback: string): string {
  const msg = getErrorMessage(err);
  if (/not configured/i.test(msg)) {
    return 'Service is not configured. Check environment variables and try again.';
  }
  if (/network|timeout|failed to fetch/i.test(msg)) {
    return 'Network error. Check your connection and try again.';
  }
  return msg.length < 160 ? msg : fallback;
}
