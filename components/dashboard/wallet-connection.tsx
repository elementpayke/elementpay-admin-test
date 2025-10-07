"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  CheckCircle,
  AlertTriangle,
  Copy,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
} from "wagmi";
import { metaMask, coinbaseWallet } from "wagmi/connectors";
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
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { toast } = useToast();

  // Use global wallet context
  const {
    connectWallet,
    disconnectWallet,
    isConnecting: globalIsConnecting,
    isDisconnecting: globalIsDisconnecting,
    error: globalError,
    clearError,
  } = useWallet();

  // Get available connectors
  const metaMaskConnector = connectors.find((c) => c.id === "metaMaskSDK");
  const coinbaseConnector = connectors.find((c) => c.id === "coinbaseWalletSDK");

  console.log("Available connectors", connectors);

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

  // Handle wallet connection
  const handleConnect = async (connector: any) => {
    try {
      await connectWallet(connector.id);
    } catch (error) {
      console.error("Connection failed:", error);
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

  // Check if any wallet is available
  const hasAvailableWallets = metaMaskConnector || coinbaseConnector;

  if (!hasAvailableWallets) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  To get started with crypto disbursements, please install a
                  supported wallet
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium mb-3">Supported Wallets:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* MetaMask */}
                  <div className="flex flex-col items-center p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-white font-bold text-lg">M</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-sm">MetaMask</p>
                      <p className="text-xs text-muted-foreground">
                        Most popular Ethereum wallet
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        window.open("https://metamask.io/download/", "_blank")
                      }
                      className="bg-orange-500 hover:bg-orange-600 w-full mt-3"
                    >
                      Install
                    </Button>
                  </div>

                  {/* Coinbase Wallet */}
                  <div className="flex flex-col items-center p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-sm">Coinbase Wallet</p>
                      <p className="text-xs text-muted-foreground">
                        Coinbase's self-custody wallet
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        window.open("https://www.coinbase.com/wallet", "_blank")
                      }
                      className="bg-blue-500 hover:bg-blue-600 w-full mt-3"
                    >
                      Install
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bottom Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    After installing a wallet, please refresh this page to
                    connect.
                  </AlertDescription>
                </Alert>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-2">
                    What you can do after connecting:
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Send crypto payments to M-PESA recipients</li>
                    <li>• Upload CSV/Excel files for bulk payments</li>
                    <li>• Track transaction history and status</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>Wallet Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(connectError || globalError) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {connectError?.message || globalError}
            </AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Connect Your Wallet</h4>
              <p className="text-sm text-muted-foreground">
                Choose a wallet to connect and start making crypto disbursements
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {metaMaskConnector && (
                <Button
                  onClick={() => handleConnect(metaMaskConnector)}
                  disabled={isPending || globalIsConnecting}
                  className="bg-orange-500 hover:bg-orange-600 justify-start"
                  size="lg"
                >
                  {isPending || globalIsConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded mr-3 flex items-center justify-center">
                        <Image
                          src="/MetaMask.svg"
                          alt="MetaMask"
                          width={20}
                          height={20}
                        />
                      </div>
                      Connect MetaMask
                    </>
                  )}
                </Button>
              )}

              {coinbaseConnector && (
                <Button
                  onClick={() => handleConnect(coinbaseConnector)}
                  disabled={isPending || globalIsConnecting}
                  className="bg-blue-500 hover:bg-blue-600 justify-start"
                  size="lg"
                >
                  {isPending || globalIsConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded mr-3 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">C</span>
                      </div>
                      Connect Coinbase Wallet
                    </>
                  )}
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Wallet Connected</span>
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                {connector?.name || "Connected"}
              </Badge>
            </div>

            {/* Wallet Address */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Address</span>
                <span className="font-mono text-sm">
                  {formatAddress(address!)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Chain Information */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Network</span>
                <Badge variant="outline">{getChainName(chainId)}</Badge>
              </div>
            </div>

            {/* Token Balances */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Token Balances</h5>
              <div className="space-y-2">
                {/* ETH Balance */}
                <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Ξ</span>
                    </div>
                    <span className="text-sm font-medium">ETH</span>
                  </div>
                  <span className="text-sm font-mono">
                    {isLoadingEthBalance ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      formatBalance(ethBalance?.value, 18, "ETH")
                    )}
                  </span>
                </div>

                {/* USDC Balance */}
                {SUPPORTED_TOKENS[chainId as keyof typeof SUPPORTED_TOKENS]
                  ?.USDC && (
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">$</span>
                      </div>
                      <span className="text-sm font-medium">USDC</span>
                    </div>
                    <span className="text-sm font-mono">
                      {isLoadingUsdcBalance ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        formatBalance(usdcBalance?.value, 6, "USDC")
                      )}
                    </span>
                  </div>
                )}

                {/* USDT Balance */}
                {(
                  SUPPORTED_TOKENS[
                    chainId as keyof typeof SUPPORTED_TOKENS
                  ] as any
                )?.USDT && (
                  <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">T</span>
                      </div>
                      <span className="text-sm font-medium">USDT</span>
                    </div>
                    <span className="text-sm font-mono">
                      {isLoadingUsdtBalance ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        formatBalance(usdtBalance?.value, 6, "USDT")
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Disconnect Button */}
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={globalIsDisconnecting}
              className="w-full"
            >
              {globalIsDisconnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect Wallet"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
