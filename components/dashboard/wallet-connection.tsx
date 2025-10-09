"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, ChevronDown, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatEther, formatUnits } from "viem";
import { useWallet } from "@/components/providers/wallet-provider";

interface WalletConnectionProps {
  onConnectionChange?: (isConnected: boolean, address?: string) => void;
  className?: string;
}

// Token configurations for balance reading
const SUPPORTED_TOKENS = {
  // Base Mainnet tokens
  8453: {
    ETH: { symbol: "ETH", decimals: 18, name: "Ethereum" },
    USDC: {
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    },
    USDT: {
      symbol: "USDT",
      decimals: 6,
      name: "Tether USD",
      address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    },
  },
  // Ethereum Mainnet tokens
  1: {
    ETH: { symbol: "ETH", decimals: 18, name: "Ethereum" },
    USDC: {
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
      address: "0xA0b86a33E6441b8c4C8C0E4B8c4C8C0E4B8c4C8C0",
    },
    USDT: {
      symbol: "USDT",
      decimals: 6,
      name: "Tether USD",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
  },
  // Sepolia Testnet tokens
  11155111: {
    ETH: { symbol: "ETH", decimals: 18, name: "Ethereum" },
    USDC: {
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
  },
};

export default function WalletConnection({
  onConnectionChange,
  className,
}: WalletConnectionProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();

  // Use global wallet context for additional functionality
  const { disconnectWallet, isDisconnecting: globalIsDisconnecting } =
    useWallet();

  // Get native ETH balance
  const { data: ethBalance, isLoading: isLoadingEthBalance } = useBalance({
    address: address,
  });

  // Get USDC balance
  const { data: usdcBalance, isLoading: isLoadingUsdcBalance } = useBalance({
    address: address,
    token: SUPPORTED_TOKENS[chainId as keyof typeof SUPPORTED_TOKENS]?.USDC
      ?.address as `0x${string}`,
  });

  // Get USDT balance
  const { data: usdtBalance, isLoading: isLoadingUsdtBalance } = useBalance({
    address: address,
    token: (SUPPORTED_TOKENS[chainId as keyof typeof SUPPORTED_TOKENS] as any)
      ?.USDT?.address as `0x${string}`,
  });

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnectWallet();
  };

  // Notify parent component of connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected, address);
  }, [isConnected, address, onConnectionChange]);

  // Format balance for display
  const formatBalance = (
    balance: bigint | undefined,
    decimals: number,
    symbol: string
  ) => {
    if (!balance) return "0.00";
    const formatted = formatUnits(balance, decimals);
    const num = parseFloat(formatted);
    return `${num.toFixed(4)} ${symbol}`;
  };

  // Get current chain name
  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return "Ethereum Mainnet";
      case 8453:
        return "Base Mainnet";
      case 11155111:
        return "Sepolia Testnet";
      default:
        return `Chain ${chainId}`;
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-3">
        <ConnectButton showBalance={false} />

        {isConnected && address && (
          <div className="w-full max-w-md space-y-2">
            {/* Compact wallet info */}
            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {getChainName(chainId)}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatAddress(address)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-6 w-6 p-0 hover:bg-muted"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>

            {/* Balance info */}
            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-mono text-xs">
                {isLoadingEthBalance ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  formatBalance(ethBalance?.value, 18, "ETH")
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
