import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { shortenHash } from "@/lib/format";
import { EXPECTED_CHAIN_ID } from "@/constants/addresses";
import { cn } from "@/lib/utils";

export type TxPhase = "review" | "pending" | "success" | "error";

export interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  phase: TxPhase;
  errorMessage?: string | null;
  txHash?: string | null;
  gasLabel?: string;
  onConfirm?: () => void;
  confirmLabel?: string;
  children?: React.ReactNode;
}

function explorerUrl(hash: string): string {
  const base = EXPECTED_CHAIN_ID === 97 ? "https://testnet.bscscan.com/tx/" : "https://bscscan.com/tx/";
  return `${base}${hash}`;
}

export function TransactionModal({
  open,
  onOpenChange,
  title,
  description,
  phase,
  errorMessage,
  txHash,
  gasLabel,
  onConfirm,
  confirmLabel = "Confirm in wallet",
  children,
}: TransactionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {children}
          {gasLabel && phase === "review" && (
            <div className="flex justify-between text-xs text-muted-foreground border border-border/60 rounded-lg px-3 py-2">
              <span>Est. gas</span>
              <span className="font-mono text-foreground">{gasLabel}</span>
            </div>
          )}
          {phase === "pending" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              <span>Waiting for wallet confirmation…</span>
            </div>
          )}
          {phase === "success" && txHash && (
            <a
              href={explorerUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <span className="font-mono">{shortenHash(txHash, 8, 6)}</span>
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
          {phase === "error" && errorMessage && (
            <p className="text-sm text-rose-400 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">{errorMessage}</p>
          )}
        </div>

        <DialogFooter className={cn("gap-2 sm:gap-0", phase === "review" && onConfirm && "flex-col sm:flex-row")}>
          {phase === "review" && onConfirm && (
            <Button type="button" className="btn-gradient text-primary-foreground border-0 rounded-lg w-full sm:w-auto" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
          {(phase === "success" || phase === "error") && (
            <Button type="button" variant="secondary" className="rounded-lg" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
