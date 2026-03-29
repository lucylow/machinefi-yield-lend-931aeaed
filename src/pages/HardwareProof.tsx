import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowLeft } from "lucide-react";

const HardwareProof = () => {
  const { id } = useParams();

  return (
    <div className="max-w-lg mx-auto px-4 py-12 min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="glass-card p-10 w-full border-border/60">
        <ShieldCheck className="h-12 w-12 text-secondary mx-auto mb-6" aria-hidden />
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-3">Hardware proof</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          Verifying Greenfield proof for device
        </p>
        <p className="font-mono text-xs text-primary/90 bg-muted/40 rounded-lg px-3 py-2 mb-8 break-all">
          {id ?? "—"}
        </p>
        <Button asChild variant="outline" className="rounded-full border-border hover:bg-muted/40">
          <Link to="/hardware" className="gap-2 inline-flex items-center">
            <ArrowLeft className="h-4 w-4" />
            Back to hardware
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default HardwareProof;
