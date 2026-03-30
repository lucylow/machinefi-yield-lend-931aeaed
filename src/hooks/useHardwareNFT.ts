import { useState, useCallback } from "react";
import type { BytesLike } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { toast } from "sonner";
import { getTxErrorMessage } from "@/lib/errors";
import { runMockTransaction } from "@/lib/mockTx";
import { ethers } from "ethers";
import type { HardwareDevice } from "@/types/walletPortfolio";

export type { HardwareDevice } from "@/types/walletPortfolio";

export const useHardwareNFT = () => {
  const { hardwareNFTContract, address, isConnected } = useWeb3();
  const { engine, snapshot, isDemoSimulation } = useProtocolSimulation();
  const [loading, setLoading] = useState(false);

  const registerDevice = async (
    deviceId: BytesLike,
    deviceType: number,
    greenfieldProofCID: string,
    publicKey: BytesLike
  ) => {
    if (!hardwareNFTContract) {
      setLoading(true);
      try {
        let label = "device";
        try {
          if (ethers.utils.isBytesLike(deviceId)) {
            const hex = ethers.utils.hexlify(deviceId);
            if (hex.length === 66) {
              label = ethers.utils.parseBytes32String(hex).replace(/\0/g, "").trim() || "device";
            }
          }
        } catch {
          label = "device";
        }
        const tx = await runMockTransaction(
          (deviceType + 1) * 409 + label.length,
          snapshot.mockBlockNumber
        );
        if (!tx.ok) {
          toast.error("Demo: registration did not confirm — retry.");
          return false;
        }
        engine.registerDeviceFromDemo(deviceType, label);
        toast.success("Demo mode: Device registered successfully!");
        return true;
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    try {
      const tx = await hardwareNFTContract.registerDevice(deviceId, deviceType, greenfieldProofCID, publicKey);
      await tx.wait();
      toast.success("Hardware registered on-chain!");
      return true;
    } catch (err) {
      console.error(err);
      toast.error(getTxErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitProof = async (tokenId: number, proof: string) => {
    if (!hardwareNFTContract) {
      setLoading(true);
      try {
        const tx = await runMockTransaction(tokenId * 17 + proof.length, snapshot.mockBlockNumber);
        if (!tx.ok) {
          toast.error("Demo: proof submission failed.");
          return false;
        }
        engine.refreshProof(tokenId);
        toast.success("Demo mode: Proof submitted!");
        return true;
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    try {
      const tx = await hardwareNFTContract.submitProof(tokenId, proof);
      await tx.wait();
      toast.success("Proof submitted!");
      return true;
    } catch (err) {
      toast.error(getTxErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getUserDevices = useCallback(async (): Promise<HardwareDevice[]> => {
    if (isDemoSimulation || !hardwareNFTContract) {
      return engine.getHardwareDevices();
    }
    if (!isConnected) return [];
    return [];
  }, [engine, hardwareNFTContract, isConnected, isDemoSimulation]);

  return { registerDevice, submitProof, getUserDevices, loading };
};
