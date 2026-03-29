import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useLendingPool, type LoanPosition } from "@/hooks/useLendingPool";
import { toast } from "sonner";
import { getLoadErrorMessage } from "@/lib/errors";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppPage } from "@/components/layout/AppPage";
import { EmptyStateCard } from "@/components/protocol/EmptyStateCard";
import { Button } from "@/components/ui/button";
import { PositionCard } from "@/components/defi/PositionCard";

const Positions = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { getUserPositions, repay } = useLendingPool();
  const [loans, setLoans] = useState<LoanPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      setLoans([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUserPositions()
      .then((l) => {
        if (!cancelled) setLoans(l);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoans([]);
          toast.error(getLoadErrorMessage(err, "Could not load positions."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, getUserPositions]);

  const handleRepay = async (nftId: number) => {
    await repay(nftId);
    const next = await getUserPositions();
    setLoans(next);
  };

  return (
    <AppPage>
      <PageHeader
        eyebrow="Credit accounts"
        title="My positions"
        description="Each row is a machine-backed loan: collateral marks, debt, and health factor update with oracle and proof freshness."
        actions={
          isConnected ? (
            <Button asChild variant="outline" size="sm" className="rounded-lg border-primary/40">
              <Link to="/borrow">New borrow</Link>
            </Button>
          ) : null
        }
      />

      {!isConnected ? (
        <EmptyStateCard
          title="Connect wallet"
          description="Positions are read from your wallet and, when deployed, from the lending pool contract and indexer."
          action={
            <Button type="button" onClick={connectWallet} className="btn-gradient rounded-lg text-primary-foreground border-0">
              Connect wallet
            </Button>
          }
        />
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading positions…</p>
      ) : loans.length === 0 ? (
        <EmptyStateCard
          title="No open positions"
          description="Borrow against a registered device to open a position. The borrow flow previews LTV, fees, and liquidation risk before you sign."
          action={
            <Button asChild className="btn-gradient rounded-lg text-primary-foreground border-0">
              <Link to="/borrow">Open borrow</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-2">
          {loans.map((loan) => (
            <PositionCard key={loan.nftId} loan={loan} onRepay={handleRepay} />
          ))}
        </div>
      )}
    </AppPage>
  );
};

export default Positions;
