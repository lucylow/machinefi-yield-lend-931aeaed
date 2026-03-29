import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function NonCustodialCallout() {
  return (
    <Card className="border-border/60 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" aria-hidden />
          Non-custodial posture
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2 leading-relaxed">
        <p>
          <span className="text-foreground font-medium">You own the hardware.</span> Legal title to physical machines stays
          with you; the protocol tracks on-chain representations and claim rights only.
        </p>
        <p>
          <span className="text-foreground font-medium">NFT custody can move to the pool</span> while a loan is open — that is
          a pledge/lien, not the protocol operating your keys or bank account.
        </p>
        <p>
          <span className="text-foreground font-medium">Yield rights are pledged until repayment.</span> Stablecoins are sent
          to your wallet; liquidation follows public contract rules.
        </p>
      </CardContent>
    </Card>
  );
}
