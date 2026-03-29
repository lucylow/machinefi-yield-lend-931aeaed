import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Microchip, ArrowLeft } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useCompliance } from "@/contexts/ComplianceContext";
import { RiskAcknowledgmentCard } from "@/components/compliance/RiskAcknowledgmentCard";
import { NonCustodialCallout } from "@/components/compliance/NonCustodialCallout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const HardwareRegister = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { gateFor, acknowledgeCurrentDisclosures } = useCompliance();
  const [, bumpAfterDisclosureAck] = useState(0);
  const regGate = gateFor("register_device");
  const onAck = useCallback(() => {
    if (regGate.requiresDisclosureIds?.length) {
      acknowledgeCurrentDisclosures(regGate.requiresDisclosureIds);
    }
    bumpAfterDisclosureAck((n) => n + 1);
  }, [regGate.requiresDisclosureIds, acknowledgeCurrentDisclosures]);

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 min-h-[70vh] flex flex-col items-center justify-center text-center">
        <div className="glass-card p-10 w-full border-border/60">
          <Microchip className="h-12 w-12 text-primary mx-auto mb-6" aria-hidden />
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-3">Register hardware</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Connect a wallet so we can record risk acknowledgments and show the correct jurisdiction policy.
          </p>
          <Button type="button" onClick={() => void connectWallet()} className="btn-gradient rounded-full text-primary-foreground border-0">
            Connect wallet
          </Button>
        </div>
      </div>
    );
  }

  if (!regGate.allowed && regGate.mode === "blocked") {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 min-h-[70vh] flex flex-col gap-4">
        <Alert variant="destructive" className="border-red-500/50 text-left">
          <AlertTitle className="font-display">Registration unavailable</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>{regGate.message}</p>
            {regGate.recoveryHint && <p className="text-muted-foreground">{regGate.recoveryHint}</p>}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="rounded-full border-border w-fit">
          <Link to="/hardware" className="gap-2 inline-flex items-center">
            <ArrowLeft className="h-4 w-4" />
            Hardware manager
          </Link>
        </Button>
      </div>
    );
  }

  if (!regGate.allowed && regGate.mode === "needs_ack" && regGate.requiresDisclosureIds?.length) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 space-y-4">
        <div className="text-center mb-2">
          <Microchip className="h-10 w-10 text-primary mx-auto mb-4" aria-hidden />
          <h1 className="text-2xl font-bold gradient-text mb-2">Register hardware</h1>
          <p className="text-muted-foreground text-sm">Review disclosures before minting a hardware NFT representation.</p>
        </div>
        <NonCustodialCallout />
        <RiskAcknowledgmentCard
          disclosureIds={regGate.requiresDisclosureIds}
          onAcknowledge={onAck}
          submitLabel="Acknowledge and continue"
        />
        <Button asChild variant="ghost" className="w-full rounded-full text-muted-foreground">
          <Link to="/hardware" className="gap-2 inline-flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 min-h-[70vh] flex flex-col items-center justify-center text-center">
      {regGate.mode === "warn" && regGate.message && (
        <Alert className="w-full mb-4 border-amber-500/40 bg-amber-500/10 text-left">
          <AlertTitle className="text-sm text-amber-100">Notice</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">{regGate.message}</AlertDescription>
        </Alert>
      )}
      <div className="glass-card p-10 w-full border-border/60">
        <Microchip className="h-12 w-12 text-primary mx-auto mb-6" aria-hidden />
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-3">Register hardware</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          Scan and register your MachineFi device to mint a hardware NFT. You keep physical hardware; the NFT represents
          on-chain proof and collateral rights, not a transfer of legal title.
        </p>
        <NonCustodialCallout />
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button asChild variant="outline" className="rounded-full border-border hover:bg-muted/40">
            <Link to="/hardware" className="gap-2 inline-flex items-center">
              <ArrowLeft className="h-4 w-4" />
              Hardware manager
            </Link>
          </Button>
          <Button className="btn-gradient rounded-full text-primary-foreground font-semibold border-0" disabled>
            Start scan (soon)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HardwareRegister;
