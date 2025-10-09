"use client";

import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export function useWalletPersistence() {
  const { isConnected, connector } = useAccount();

  useEffect(() => {
    // Store the last connected wallet
    if (isConnected && connector) {
      localStorage.setItem('lastConnectedWallet', connector.id);
    } else {
      // Clear stored wallet if disconnected
      localStorage.removeItem('lastConnectedWallet');
    }
  }, [isConnected, connector]);

  return {
    isConnected,
    connector,
  };
}
