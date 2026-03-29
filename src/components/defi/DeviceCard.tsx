import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HardwareDevice } from "@/hooks/useHardwareNFT";
import { ChainBadge } from "@/components/protocol/ChainBadge";
import { borrowFlowPath } from "@/lib/borrowRoutes";

export interface DeviceCardProps {
  device: HardwareDevice;
  className?: string;
}

function staleProof(lastTs: number): boolean {
  return Date.now() - lastTs > 6 * 60 * 60 * 1000;
}

export function DeviceCard({ device, className }: DeviceCardProps) {
  const stale = staleProof(device.lastProofTimestamp);
  const active = device.isActive && !stale;

  return (
    <Card className={cn("border-border/70 bg-card/70 backdrop-blur-sm", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2 space-y-0">
        <div>
          <CardTitle className="text-base font-display">{device.type}</CardTitle>
          <p className="text-xs font-mono text-muted-foreground mt-1 break-all">{device.deviceId}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] uppercase shrink-0",
            active ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"
          )}
        >
          {active ? "Active" : stale ? "Stale proof" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <ChainBadge chain="opbnb" />
          <span className="text-xs text-muted-foreground">
            Proof {formatDistanceToNow(device.lastProofTimestamp, { addSuffix: true })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Yield (est.)</p>
            <p className="font-semibold tabular-nums">${device.monthlyYield}/mo</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Token ID</p>
            <p className="font-semibold tabular-nums">#{device.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <Link to={`/hardware/proof/${device.id}`}>Proofs</Link>
          </Button>
          <Button asChild variant="secondary" size="sm" className="rounded-lg">
            <Link to={borrowFlowPath(device.id, device.type)}>Borrow against</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
