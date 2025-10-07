"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, CheckCircle, AlertTriangle, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

interface WalletConnectionProps {
  onConnectionChange?: (isConnected: boolean, address?: string) => void;
  className?: string;
}

export default function WalletConnection({
  onConnectionChange,
  className,
}: WalletConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return (
      typeof window !== "undefined" && typeof window.ethereum !== "undefined"
    );
  };

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      setError(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
      return;
    }

    setIsConnecting(true);
    setError("");

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        setWalletAddress(address);
        setIsConnected(true);
        onConnectionChange?.(true, address);

        toast({
          title: "Wallet Connected",
          description: `Connected to ${formatAddress(address)}`,
        });
      }
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      setError(error.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress("");
    setError("");
    onConnectionChange?.(false);

    toast({
      title: "Wallet Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          setIsConnected(true);
          onConnectionChange?.(true, address);
        }
      } catch (error) {
        console.error("Failed to check wallet connection:", error);
      }
    };

    checkConnection();
  }, [onConnectionChange]);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== walletAddress) {
        setWalletAddress(accounts[0]);
        onConnectionChange?.(true, accounts[0]);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      }
    };
  }, [walletAddress, onConnectionChange]);

  if (!isMetaMaskInstalled()) {
    return (
      <Card className={className + " !w-full "}>
        <CardContent className="p-6 !w-full ">
          <div className="space-y-4 flex flex-col !w-full">
            {/* Header Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Wallet className="h-6 w-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  To get started with crypto disbursements, please connect a
                  supported wallet
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div>
                <p className="text-sm font-medium mb-3">Supported Wallets:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* MetaMask - Primary option */}
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

                  {/* Future wallet options - Coming soon */}
                  <div className="flex flex-col items-center p-4 border rounded-lg bg-muted/20 opacity-60 text-center">
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-white font-bold text-lg">W</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-sm">WalletConnect</p>
                      <p className="text-xs text-muted-foreground">
                        Connect multiple wallet types
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs mt-3">
                      Coming Soon
                    </Badge>
                  </div>

                  <div className="flex flex-col items-center p-4 border rounded-lg bg-muted/20 opacity-60 text-center">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-sm">Coinbase Wallet</p>
                      <p className="text-xs text-muted-foreground">
                        Coinbase's self-custody wallet
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs mt-3">
                      Coming Soon
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Bottom Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    After installing MetaMask, please refresh this page to
                    connect your wallet.
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
            {/* Wallets Section */}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Image src="/MetaMask.svg" alt="MetaMask" width={20} height={20} />
              </div>
              <div>
                <h4 className="font-medium">Connect Your Wallet</h4>
                <p className="text-sm text-muted-foreground">
                  Connect MetaMask to start making crypto disbursements
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <Button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-orange-500 hover:bg-orange-600"
                size="lg"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded mr-2 flex items-center justify-center">
                      <Image src="/MetaMask.svg" alt="MetaMask" width={20} height={20} />
                    </div>
                    Connect MetaMask
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-right">
                By connecting, you agree to our Terms of Service
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Wallet Connected</span>
              </div>
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                Connected
              </Badge>
            </div>

            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Address</span>
                <span className="font-mono text-sm">
                  {formatAddress(walletAddress)}
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

            <Button
              variant="outline"
              onClick={disconnectWallet}
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
