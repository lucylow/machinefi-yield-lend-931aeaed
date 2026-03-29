import {
  BNB_STACK_LAYERS,
  GREENFIELD_META,
  ACTION_COPY,
  type ChainLayerMeta,
} from '@/config/bnbStack';
import { EXPECTED_CHAIN_ID } from '@/constants/addresses';
import { useWeb3 } from '@/contexts/Web3Context';

function LayerCard({ layer }: { layer: ChainLayerMeta }) {
  const tags: string[] = [];
  if (layer.isSettlementLayer) tags.push('Settlement');
  if (layer.isUpdateLayer) tags.push('Updates');
  if (layer.isStorageLayer) tags.push('Storage');

  return (
    <div
      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left min-w-[140px] flex-1"
      data-chain-role={layer.role}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{tags.join(' · ')}</div>
      <div className="text-sm font-semibold text-foreground">{layer.shortName}</div>
      <div className="text-[11px] text-muted-foreground leading-snug">{layer.chainName}</div>
      {layer.chainId > 0 && (
        <div className="text-[10px] font-mono text-primary/90 mt-0.5">chainId {layer.chainId}</div>
      )}
    </div>
  );
}

/**
 * Explains the BNB stack as product architecture: BSC settlement, opBNB telemetry cadence, Greenfield evidence.
 */
export function BNBStackStrip() {
  const { isConnected, isCorrectNetwork, connectedChainId } = useWeb3();

  return (
    <section
      className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-transparent p-4 mb-6"
      aria-label="BNB Chain stack"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">BNB Chain is the architecture</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            BSC holds canonical lending state. opBNB carries high-frequency yield and proof epochs. Greenfield stores
            proof blobs; settlement only anchors hashes and references.
          </p>
        </div>
        {isConnected && (
          <div
            className={`text-xs font-medium px-3 py-1 rounded-full shrink-0 ${
              isCorrectNetwork ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-100'
            }`}
          >
            {isCorrectNetwork
              ? `Wallet on BSC settlement (chain ${connectedChainId ?? EXPECTED_CHAIN_ID})`
              : `Wrong network (chain ${connectedChainId ?? '?'}) — switch to BSC ${EXPECTED_CHAIN_ID} for borrow/repay`}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {BNB_STACK_LAYERS.map((layer) => (
          <LayerCard key={layer.role + layer.chainId} layer={layer} />
        ))}
        <LayerCard layer={GREENFIELD_META} />
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-white/5 pt-3">{ACTION_COPY.borrow}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{ACTION_COPY.proofRefresh}</p>

      <p className="text-[11px] text-muted-foreground mt-3">
        Trust order: BSC → mirrored opBNB summary → Greenfield anchor → raw telemetry (never the reverse).
      </p>
    </section>
  );
}
