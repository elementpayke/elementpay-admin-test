"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, Copy, LogOut, Settings } from "lucide-react";
import { useWallet } from "@/components/providers/wallet-provider";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface WalletStatusProps {
  className?: string;
}

export default function WalletStatus({ className }: WalletStatusProps) {
  const { isConnected, address, connector, disconnectWallet, isDisconnecting } =
    useWallet();
  const { logout } = useAuth();
  const { toast } = useToast();

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

  // Handle wallet disconnect
  const handleDisconnect = () => {
    disconnectWallet();
  };

  // Handle logout (includes wallet disconnect)
  const handleLogout = () => {
    logout();
  };

  if (!isConnected) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              No wallet connected
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-green-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {formatAddress(address!)}
              </span>
              <Badge variant="secondary" className="text-xs w-fit">
                {connector?.name || "Connected"}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyAddress}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Address
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                <Wallet className="h-4 w-4 mr-2" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect Wallet"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout & Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
