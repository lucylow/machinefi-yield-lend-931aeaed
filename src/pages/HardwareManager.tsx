import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useWeb3 } from '@/contexts/Web3Context';
import { useHardwareNFT, type HardwareDevice } from '@/hooks/useHardwareNFT';
import { getLoadErrorMessage } from '@/lib/errors';
import MyHardware from '@/components/dapp/MyHardware';
import RegisterHardware from '@/components/dapp/RegisterHardware';
import Footer from '@/components/Footer';
import { PageHeader } from '@/components/Layout/PageHeader';
import { AppPage } from '@/components/Layout/AppPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/protocol/EmptyStateCard';
import { DeviceLifecycleTimeline } from '@/components/hardware/DeviceLifecycleTimeline';
import { useProtocolSimulation } from '@/contexts/ProtocolSimulationContext';
import { ChainBadge } from '@/components/protocol/ChainBadge';

const HardwareManager = () => {
  const { isConnected, connectWallet } = useWeb3();
  const { getUserDevices } = useHardwareNFT();
  const { snapshot } = useProtocolSimulation();
  const [devices, setDevices] = useState<HardwareDevice[]>([]);

  useEffect(() => {
    if (!isConnected) return;
    let cancelled = false;
    getUserDevices()
      .then((list) => {
        if (!cancelled) setDevices(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setDevices([]);
          toast.error(getLoadErrorMessage(err, 'Could not load devices.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, getUserDevices]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppPage>
        <PageHeader
          eyebrow="Devices"
          title="Device manager"
          description="Register metadata, submit proofs, and track verification. Paused or stale devices do not contribute fresh collateral marks."
          actions={
            isConnected ? (
              <Button asChild variant="outline" size="sm" className="rounded-full border-primary/40">
                <Link to="/hardware/proof/demo">Submit proof</Link>
              </Button>
            ) : null
          }
        />

        {!isConnected ? (
          <EmptyStateCard
            title="Wallet not connected"
            description="Device registration and proof routes are tied to your address. Connect to continue."
            icon="◎"
            action={
              <Button type="button" onClick={connectWallet} className="btn-gradient px-8 py-3 rounded-full font-semibold text-primary-foreground border-0">
                Connect wallet
              </Button>
            }
          />
        ) : (
          <Tabs defaultValue="overview" className="w-full space-y-6">
            <TabsList className="flex w-full flex-wrap h-auto gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
              <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-card">
                Overview
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-card">
                Register
              </TabsTrigger>
              <TabsTrigger value="proofs" className="rounded-lg data-[state=active]:bg-card">
                Proofs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-6 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <DeviceLifecycleTimeline devices={devices} />
                <MyHardware devices={devices} />
              </div>
            </TabsContent>

            <TabsContent value="register" className="mt-0 outline-none">
              <RegisterHardware />
            </TabsContent>

            <TabsContent value="proofs" className="mt-0 outline-none space-y-4">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base font-display">Recent proof activity (demo)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {snapshot.proofs.map((p) => (
                    <div key={p.proofId} className="rounded-xl border border-border/50 p-4 space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <ChainBadge chain="greenfield" />
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{p.verificationStatus}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{p.proofType}</p>
                      <p className="text-xs text-muted-foreground font-mono break-all">{p.storageLocation}</p>
                      <Button asChild size="sm" variant="outline" className="rounded-full border-primary/40 mt-2">
                        <Link to={`/hardware/proof/${p.deviceId}`}>Open proof flow</Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </AppPage>
      <Footer />
    </div>
  );
};

export default HardwareManager;
