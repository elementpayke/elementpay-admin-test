"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { useWalletPersistence } from "@/hooks/use-wallet-persistence";

interface WalletContextType {
  // Connection state
  isConnected: boolean;
  address: string | undefined;
  connector: any;

  // Connection methods
  connectWallet: (connectorId: string) => Promise<void>;
  disconnectWallet: () => void;

  // Loading states
  isConnecting: boolean;
  isDisconnecting: boolean;

  // Error handling
  error: string | null;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const { toast } = useToast();

  const [error, setError] = useState<string | null>(null);

  // Enable wallet persistence
  useWalletPersistence();

  // Connect to wallet
  const connectWallet = async (connectorId: string) => {
    try {
      setError(null);
      const targetConnector = connectors.find((c) => c.id === connectorId);

      if (!targetConnector) {
        throw new Error(`Connector ${connectorId} not found`);
      }

      await connect({ connector: targetConnector });

      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${targetConnector.name}`,
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to connect wallet";
      setError(errorMessage);
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    try {
      setError(null);
      disconnect();

      toast({
        title: "Wallet Disconnected",
        description: "Wallet has been disconnected successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to disconnect wallet";
      setError(errorMessage);
      toast({
        title: "Disconnect Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Auto-disconnect on component unmount (cleanup)
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, []);

  const value: WalletContextType = {
    isConnected,
    address,
    connector,
    connectWallet,
    disconnectWallet,
    isConnecting,
    isDisconnecting,
    error,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}
