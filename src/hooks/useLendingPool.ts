import { useState, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useProtocolSimulation } from "@/contexts/ProtocolSimulationContext";
import { toast } from "sonner";
import { ethers } from "ethers";
import { getTxErrorMessage } from "@/lib/errors";
import { CONTRACT_ADDRESSES, STABLECOIN_DECIMALS } from "@/constants/addresses";
import { runMockTransaction } from "@/lib/mockTx";
import type { LoanPosition } from "@/types/walletPortfolio";

export type { LoanPosition } from "@/types/walletPortfolio";

export const useLendingPool = () => {
  const { lendingPoolContract, hardwareNFTContract, stablecoinContract, address } = useWeb3();
  const { engine, snapshot, isDemoSimulation } = useProtocolSimulation();
  const [loading, setLoading] = useState(false);

  const deposit = async (nftId: number, yieldPercentage: number, borrowAmount: string) => {
    if (!lendingPoolContract) {
      setLoading(true);
      try {
        const tx = await runMockTransaction(nftId * 997 + Math.floor(yieldPercentage), snapshot.mockBlockNumber);
        if (!tx.ok) {
          toast.error("Demo: transaction randomly failed — retry once.");
          return false;
        }
        const amt = Number.parseFloat(borrowAmount.trim() || "0");
        if (Number.isFinite(amt) && amt > 0) {
          engine.applyBorrow(nftId, amt);
        }
        toast.success("Demo mode: Deposit & borrow successful!");
        return true;
      } finally {
        setLoading(false);
      }
    }
    if (!hardwareNFTContract || !address) {
      toast.error("Wallet or contracts not ready.");
      return false;
    }
    setLoading(true);
    try {
      let amountWei: ethers.BigNumber;
      try {
        amountWei = ethers.utils.parseUnits(borrowAmount.trim() || "0", STABLECOIN_DECIMALS);
      } catch {
        toast.error("Invalid borrow amount.");
        return false;
      }
      if (amountWei.lte(0)) {
        toast.error("Borrow amount must be greater than zero.");
        return false;
      }

      const poolAddr = CONTRACT_ADDRESSES.lendingPool;
      const approvedFor = await hardwareNFTContract.getApproved(nftId);
      const approvedAll = await hardwareNFTContract.isApprovedForAll(address, poolAddr);
      if (approvedFor !== poolAddr && !approvedAll) {
        const approveTx = await hardwareNFTContract.approve(poolAddr, nftId);
        await approveTx.wait();
      }

      const tx = await lendingPoolContract.deposit(nftId, yieldPercentage, amountWei);
      await tx.wait();
      toast.success("Deposit & borrow successful!");
      return true;
    } catch (err) {
      console.error(err);
      toast.error(getTxErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const repay = async (nftId: number, _amountHint?: string) => {
    if (!lendingPoolContract) {
      setLoading(true);
      try {
        const tx = await runMockTransaction(nftId * 131 + 17, snapshot.mockBlockNumber);
        if (!tx.ok) {
          toast.error("Demo: repayment could not confirm — try again.");
          return false;
        }
        engine.applyRepay(nftId, 0, true);
        toast.success("Demo mode: Loan repaid!");
        return true;
      } finally {
        setLoading(false);
      }
    }
    if (!stablecoinContract || !address) {
      toast.error("Wallet or contracts not ready.");
      return false;
    }
    setLoading(true);
    try {
      const full = await lendingPoolContract.getPositionFull(nftId);
      const debt: ethers.BigNumber = full.debt ?? full[0];
      const interest: ethers.BigNumber = full.accruedInterest ?? full[1];
      const borrower: string = full.borrower ?? full[4];

      if (debt.isZero()) {
        toast.error("No active loan for this NFT.");
        return false;
      }
      if (borrower.toLowerCase() !== address.toLowerCase()) {
        toast.error("Connected wallet is not the borrower for this position.");
        return false;
      }

      const totalOwed = debt.add(interest);
      const poolAddr = CONTRACT_ADDRESSES.lendingPool;
      const current = await stablecoinContract.allowance(address, poolAddr);
      if (current.lt(totalOwed)) {
        const approveTx = await stablecoinContract.approve(poolAddr, ethers.constants.MaxUint256);
        await approveTx.wait();
      }

      const tx = await lendingPoolContract.repay(nftId);
      await tx.wait();
      toast.success("Loan repaid!");
      return true;
    } catch (err) {
      toast.error(getTxErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const liquidate = async (nftId: number) => {
    if (!lendingPoolContract) {
      setLoading(true);
      try {
        const tx = await runMockTransaction(nftId * 401, snapshot.mockBlockNumber);
        if (!tx.ok) {
          toast.error("Demo: liquidation not confirmed.");
          return false;
        }
        engine.applyLiquidate(nftId);
        toast.success("Demo mode: Position liquidated!");
        return true;
      } finally {
        setLoading(false);
      }
    }
    if (!stablecoinContract || !address) {
      toast.error("Wallet or contracts not ready.");
      return false;
    }
    setLoading(true);
    try {
      const poolAddr = CONTRACT_ADDRESSES.lendingPool;
      const current = await stablecoinContract.allowance(address, poolAddr);
      if (!current.eq(ethers.constants.MaxUint256)) {
        const approveTx = await stablecoinContract.approve(poolAddr, ethers.constants.MaxUint256);
        await approveTx.wait();
      }

      const liqTx = await lendingPoolContract.liquidate(nftId);
      const receipt = await liqTx.wait();
      if (receipt?.status === 0) {
        toast.error("Liquidation transaction reverted.");
        return false;
      }
      toast.success(
        "Liquidation submitted. If in grace period, the pool may only record a warning — check again after the grace window."
      );
      return true;
    } catch (err) {
      toast.error(getTxErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPosition = useCallback(
    async (nftId: number): Promise<LoanPosition | null> => {
      if (isDemoSimulation || !lendingPoolContract) {
        return engine.getLoanPositions().find((p) => p.nftId === nftId) ?? null;
      }
      return null;
    },
    [engine, isDemoSimulation, lendingPoolContract]
  );

  const getUserPositions = useCallback(async (): Promise<LoanPosition[]> => {
    if (isDemoSimulation || !lendingPoolContract) {
      return engine.getLoanPositions();
    }
    return [];
  }, [engine, isDemoSimulation, lendingPoolContract]);

  /** True when the hook will return demo data regardless of wallet state. */
  const isDemoMode = isDemoSimulation || !lendingPoolContract;

  return { deposit, repay, liquidate, getPosition, getUserPositions, loading, isDemoMode };
};
