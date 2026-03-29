import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import {
  BSC_TESTNET_RPC,
  CONTRACT_ADDRESSES,
  EXPECTED_CHAIN_ID,
} from "@/constants/addresses";
import { ERC20_ABI, HardwareNFT_ABI, LendingPool_ABI } from "@/utils/abis";
import { getErrorMessage } from "@/lib/errors";
import EthereumProvider from "@walletconnect/ethereum-provider";

type EthereumRequestArgs = { method: string; params?: unknown[] };

/** Minimal EIP-1193 provider surface used by this app */
type Eip1193Provider = {
  request: (args: EthereumRequestArgs) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  disconnect?: () => Promise<void>;
};

function providerErrorCode(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const c = (err as { code: unknown }).code;
    return typeof c === "number" ? c : undefined;
  }
  return undefined;
}

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  /** Wallet’s current chain id when connected (any network). */
  connectedChainId: number | null;
  signer: ethers.Signer | null;
  provider: ethers.providers.Web3Provider | null;
  hardwareNFTContract: ethers.Contract | null;
  lendingPoolContract: ethers.Contract | null;
  stablecoinContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  walletConnectAvailable: boolean;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  connectionError: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  address: null,
  isConnected: false,
  isCorrectNetwork: false,
  connectedChainId: null,
  signer: null,
  provider: null,
  hardwareNFTContract: null,
  lendingPoolContract: null,
  stablecoinContract: null,
  connectWallet: async () => {},
  connectWalletConnect: async () => {},
  walletConnectAvailable: false,
  disconnectWallet: () => {},
  switchNetwork: async () => {},
  connectionError: null,
});

const getEthereum = (): Eip1193Provider | null => {
  if (typeof window === "undefined") return null;
  const w = window as Window & { ethereum?: Eip1193Provider };
  return w.ethereum ?? null;
};

const WC_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() ?? "";

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [connectedChainId, setConnectedChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [hardwareNFTContract, setHardwareNFTContract] = useState<ethers.Contract | null>(null);
  const [lendingPoolContract, setLendingPoolContract] = useState<ethers.Contract | null>(null);
  const [stablecoinContract, setStablecoinContract] = useState<ethers.Contract | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wcRef = useRef<Awaited<ReturnType<typeof EthereumProvider.init>> | null>(null);
  const wcHandlersRef = useRef<{ accounts?: (a: string[]) => void; chain?: () => void } | null>(null);

  const clearWcListeners = useCallback(() => {
    const wc = wcRef.current;
    const h = wcHandlersRef.current;
    if (wc && h) {
      try {
        if (h.accounts) wc.removeListener?.("accountsChanged", h.accounts);
        if (h.chain) wc.removeListener?.("chainChanged", h.chain);
      } catch {
        /* ignore */
      }
    }
    wcHandlersRef.current = null;
  }, []);

  const teardownWalletConnect = useCallback(async () => {
    clearWcListeners();
    const wc = wcRef.current;
    wcRef.current = null;
    if (wc) {
      try {
        await wc.disconnect();
      } catch {
        /* ignore */
      }
    }
  }, [clearWcListeners]);

  // Suppress MetaMask internal unhandled promise rejections (from inpage.js)
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = event?.reason?.message || String(event?.reason || "");
      if (
        msg.includes("MetaMask") ||
        msg.includes("User rejected") ||
        msg.includes("already pending") ||
        msg.includes("inpage.js")
      ) {
        event.preventDefault();
        console.warn("[Web3] Suppressed MetaMask rejection:", msg);
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  const setupContracts = useCallback((s: ethers.Signer): { ok: true } | { ok: false; error: unknown } => {
    try {
      const hardware = new ethers.Contract(CONTRACT_ADDRESSES.hardwareNFT, HardwareNFT_ABI, s);
      const lending = new ethers.Contract(CONTRACT_ADDRESSES.lendingPool, LendingPool_ABI, s);
      const stable = new ethers.Contract(CONTRACT_ADDRESSES.stablecoin, ERC20_ABI, s);
      setHardwareNFTContract(hardware);
      setLendingPoolContract(lending);
      setStablecoinContract(stable);
      return { ok: true };
    } catch (err) {
      console.warn("[Web3] Failed to setup contracts:", err);
      setHardwareNFTContract(null);
      setLendingPoolContract(null);
      setStablecoinContract(null);
      return { ok: false, error: err };
    }
  }, []);

  const applyConnectedProvider = useCallback(
    async (web3Provider: ethers.providers.Web3Provider) => {
      try {
        const s = web3Provider.getSigner();
        let addr: string;
        let chainId: number;
        try {
          addr = await s.getAddress();
          const network = await web3Provider.getNetwork();
          chainId = network.chainId;
        } catch (err: unknown) {
          console.warn("[Web3] Failed to read wallet address or network:", err);
          setConnectionError(getErrorMessage(err) || "Could not read wallet account or network.");
          return;
        }
        const correctNet = chainId === EXPECTED_CHAIN_ID;

        setProvider(web3Provider);
        setSigner(s);
        setAddress(addr);
        setIsConnected(true);
        setConnectedChainId(chainId);
        setIsCorrectNetwork(correctNet);

        if (correctNet) {
          const setup = setupContracts(s);
          if (!setup.ok) {
            setConnectionError(getErrorMessage(setup.error) || "Could not initialize protocol contracts.");
          }
        } else {
          setHardwareNFTContract(null);
          setLendingPoolContract(null);
          setStablecoinContract(null);
        }
      } catch (err: unknown) {
        console.warn("[Web3] applyConnectedProvider failed:", err);
        setConnectionError(getErrorMessage(err) || "Wallet session could not be applied.");
      }
    },
    [setupContracts]
  );

  const disconnectWallet = useCallback(() => {
    void teardownWalletConnect();
    setAddress(null);
    setIsConnected(false);
    setConnectedChainId(null);
    setIsCorrectNetwork(false);
    setSigner(null);
    setProvider(null);
    setHardwareNFTContract(null);
    setLendingPoolContract(null);
    setStablecoinContract(null);
    setConnectionError(null);
  }, [teardownWalletConnect]);

  const connectWallet = useCallback(async () => {
    setConnectionError(null);
    await teardownWalletConnect();

    const eth = getEthereum();

    if (!eth) {
      setConnectionError("No wallet detected. Please install MetaMask.");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      const web3Provider = new ethers.providers.Web3Provider(eth as ethers.providers.ExternalProvider, "any");

      let accounts: string[];
      try {
        const raw = await web3Provider.send("eth_requestAccounts", []);
        accounts = Array.isArray(raw) ? (raw as string[]) : [];
      } catch (reqErr: unknown) {
        const code = providerErrorCode(reqErr);
        if (code === 4001) {
          setConnectionError("Connection rejected. Please approve in your wallet.");
        } else if (code === -32002) {
          setConnectionError("A connection request is already pending. Check your wallet.");
        } else {
          setConnectionError("Failed to connect wallet. Please try again.");
        }
        console.warn("[Web3] eth_requestAccounts error:", reqErr);
        return;
      }

      if (!accounts || accounts.length === 0) {
        setConnectionError("No accounts returned. Please unlock your wallet.");
        return;
      }

      await applyConnectedProvider(web3Provider);
    } catch (err: unknown) {
      console.warn("[Web3] Wallet connection failed:", err);
      setConnectionError(getErrorMessage(err) || "Wallet connection failed. Please try again.");
    }
  }, [applyConnectedProvider, teardownWalletConnect]);

  const connectWalletConnect = useCallback(async () => {
    setConnectionError(null);
    if (!WC_PROJECT_ID) {
      setConnectionError("WalletConnect requires VITE_WALLETCONNECT_PROJECT_ID in your environment.");
      return;
    }

    await teardownWalletConnect();

    try {
      const wc = await EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [EXPECTED_CHAIN_ID],
        optionalChains: [EXPECTED_CHAIN_ID],
        showQrModal: true,
        rpcMap: { [EXPECTED_CHAIN_ID]: BSC_TESTNET_RPC },
      });

      await wc.enable();
      wcRef.current = wc;

      const web3Provider = new ethers.providers.Web3Provider(wc as ethers.providers.ExternalProvider, "any");
      await applyConnectedProvider(web3Provider);

      const onAccounts = (accs: string[]) => {
        if (!accs?.length) {
          disconnectWallet();
        } else {
          setAddress(accs[0]);
        }
      };
      const onChain = () => window.location.reload();
      wcHandlersRef.current = { accounts: onAccounts, chain: onChain };
      try {
        wc.on?.("accountsChanged", onAccounts);
        wc.on?.("chainChanged", onChain);
      } catch (e) {
        console.warn("[Web3] WC listeners:", e);
      }
    } catch (err: unknown) {
      console.warn("[Web3] WalletConnect failed:", err);
      setConnectionError(getErrorMessage(err) || "WalletConnect session failed.");
      await teardownWalletConnect();
    }
  }, [applyConnectedProvider, disconnectWallet, teardownWalletConnect]);

  const switchNetwork = useCallback(async () => {
    const eip1193 = (wcRef.current as Eip1193Provider | null) ?? getEthereum();
    if (!eip1193) return;
    setConnectionError(null);
    try {
      await eip1193.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
      });
    } catch (err: unknown) {
      if (providerErrorCode(err) === 4902) {
        try {
          await eip1193.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
                chainName: "BNB Smart Chain Testnet",
                nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
                rpcUrls: [BSC_TESTNET_RPC],
                blockExplorerUrls: ["https://testnet.bscscan.com"],
              },
            ],
          });
        } catch (addErr: unknown) {
          console.warn("[Web3] Failed to add chain:", addErr);
          setConnectionError(getErrorMessage(addErr) || "Could not add BNB testnet to your wallet.");
        }
      } else {
        console.warn("[Web3] Failed to switch chain:", err);
        setConnectionError(getErrorMessage(err) || "Could not switch network. Try switching manually in your wallet.");
      }
    }
  }, []);

  // Injected wallet listeners (ignored while WalletConnect owns the session)
  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (wcRef.current) return;
      if (accounts.length === 0) disconnectWallet();
      else setAddress(accounts[0]);
    };
    const handleChainChanged = () => {
      if (wcRef.current) return;
      window.location.reload();
    };

    try {
      eth.on?.("accountsChanged", handleAccountsChanged);
      eth.on?.("chainChanged", handleChainChanged);
    } catch (e) {
      console.warn("[Web3] Failed to attach wallet listeners:", e);
    }
    return () => {
      try {
        eth.removeListener?.("accountsChanged", handleAccountsChanged);
        eth.removeListener?.("chainChanged", handleChainChanged);
      } catch {
        /* ignore */
      }
    };
  }, [disconnectWallet]);

  return (
    <Web3Context.Provider
      value={{
        address,
        isConnected,
        isCorrectNetwork,
        connectedChainId,
        signer,
        provider,
        hardwareNFTContract,
        lendingPoolContract,
        stablecoinContract,
        connectWallet,
        connectWalletConnect,
        walletConnectAvailable: Boolean(WC_PROJECT_ID),
        disconnectWallet,
        switchNetwork,
        connectionError,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
