"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, CheckCircle, RefreshCw, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { metaMask, coinbaseWallet } from "wagmi/connectors";

interface MultiWalletSelectorProps {
  onConnectionChange?: (isConnected: boolean, address?: string) => void;
  className?: string;
}

export default function MultiWalletSelector({
  onConnectionChange,
  className,
}: MultiWalletSelectorProps) {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();

  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Get available connectors
  const metaMaskConnector = connectors.find((c) => c.id === "metaMask");
  const coinbaseConnector = connectors.find((c) => c.id === "coinbaseWallet");

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyAddress = async (address: string) => {
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
      await connect({ connector });

      // After connection, try to get multiple accounts
      if (connector.id === "metaMask" && window.ethereum) {
        await loadMultipleAccounts();
      }
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  // Load multiple accounts from MetaMask
  const loadMultipleAccounts = async () => {
    if (!window.ethereum) return;

    setIsLoadingAccounts(true);
    try {
      // Request all accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAvailableAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
      toast({
        title: "Error",
        description: "Failed to load multiple accounts",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // Switch to selected account
  const switchAccount = async (newAddress: string) => {
    if (!window.ethereum) return;

    try {
      // Request account switch
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {},
          },
        ],
      });

      setSelectedAccount(newAddress);
      toast({
        title: "Account Switched",
        description: `Switched to ${formatAddress(newAddress)}`,
      });
    } catch (error) {
      console.error("Failed to switch account:", error);
      toast({
        title: "Error",
        description: "Failed to switch account",
        variant: "destructive",
      });
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnect();
    setAvailableAccounts([]);
    setSelectedAccount("");
    toast({
      title: "Wallet Disconnected",
      description: "Wallet has been disconnected",
    });
  };

  // Notify parent component of connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected, address);
  }, [isConnected, address, onConnectionChange]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      setAvailableAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0]);
      } else {
        setSelectedAccount("");
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
  }, []);

  // Check if any wallet is available
  const hasAvailableWallets = metaMaskConnector || coinbaseConnector;

  if (!hasAvailableWallets) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Wallets Available</h3>
            <p className="text-sm text-muted-foreground">
              Please install MetaMask or Coinbase Wallet to continue
            </p>
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
          <span>Multi-Wallet Connection</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="font-medium mb-2">Connect Your Wallet</h4>
              <p className="text-sm text-muted-foreground">
                Choose a wallet to connect and access multiple accounts
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {metaMaskConnector && (
                <Button
                  onClick={() => handleConnect(metaMaskConnector)}
                  disabled={isPending}
                  className="bg-orange-500 hover:bg-orange-600 justify-start"
                  size="lg"
                >
                  {isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded mr-3 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">M</span>
                      </div>
                      Connect MetaMask
                    </>
                  )}
                </Button>
              )}

              {coinbaseConnector && (
                <Button
                  onClick={() => handleConnect(coinbaseConnector)}
                  disabled={isPending}
                  className="bg-blue-500 hover:bg-blue-600 justify-start"
                  size="lg"
                >
                  {isPending ? (
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

            {/* Current Account */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  Current Account
                </span>
                <span className="font-mono text-sm">
                  {formatAddress(address!)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyAddress(address!)}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Multiple Accounts Section */}
            {connector?.id === "metaMask" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium">Multiple Accounts</h5>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMultipleAccounts}
                    disabled={isLoadingAccounts}
                  >
                    {isLoadingAccounts ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {availableAccounts.length > 1 ? (
                  <div className="space-y-2">
                    <Select
                      value={selectedAccount}
                      onValueChange={(value) => switchAccount(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAccounts.map((account, index) => (
                          <SelectItem key={account} value={account}>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">
                                {formatAddress(account)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                Account {index + 1}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Alert>
                      <AlertDescription className="text-xs">
                        You have {availableAccounts.length} accounts available.
                        Switch between them using the dropdown above.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription className="text-xs">
                      Only one account detected. To use multiple accounts,
                      create additional accounts in your MetaMask wallet.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Disconnect Button */}
            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="w-full"
            >
              Disconnect Wallet
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
