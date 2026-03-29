/**
 * Deployment sanity checks for the layered BNB stack (§15.6–15.7).
 * Use from Hardhat deploy scripts: assertBscSettlement(hre.network.config.chainId)
 */

function assertChainId(actual, expected, label = "chain") {
  const a = Number(actual);
  const e = Number(expected);
  if (a !== e) {
    throw new Error(`[${label}] chainId mismatch: got ${a}, expected ${e}`);
  }
}

/** BSC testnet / mainnet only — canonical lending deployment */
function assertSettlementChain(chainId) {
  const id = Number(chainId);
  if (id !== 97 && id !== 56) {
    throw new Error(
      `[settlement] Deploy LendingPool / HardwareNFT / YieldUpdateMirror on BSC (97 or 56), got ${id}`
    );
  }
}

function assertContractRole(config, role) {
  if (!config || typeof config !== "object") throw new Error(`[${role}] missing deployment config`);
}

function assertProofStorageConfigured(greenfieldBucketOrEndpoint) {
  if (!greenfieldBucketOrEndpoint || String(greenfieldBucketOrEndpoint).trim() === "") {
    console.warn("[Greenfield] proof storage endpoint/bucket not set — set GREENFIELD_BUCKET in env for production");
  }
}

module.exports = {
  assertChainId,
  assertSettlementChain,
  assertContractRole,
  assertProofStorageConfigured,
};
