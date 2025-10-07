"use client";

import WalletConnection from "@/components/dashboard/wallet-connection";

interface DisbursementWalletConnectionProps {
  onConnectionChange: (connected: boolean, address?: string) => void;
  className?: string;
}

export default function DisbursementWalletConnection({
  onConnectionChange,
  className,
}: DisbursementWalletConnectionProps) {
  return (
    <WalletConnection
      onConnectionChange={onConnectionChange}
      className={className}
    />
  );
}
