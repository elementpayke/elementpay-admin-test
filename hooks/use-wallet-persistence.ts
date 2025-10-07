"use client";

import { useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';

export function useWalletPersistence() {
  const { isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    // Auto-reconnect if wallet was previously connected
    if (!isConnected && typeof window !== 'undefined') {
      const lastConnectedWallet = localStorage.getItem('lastConnectedWallet');
      
      if (lastConnectedWallet) {
        const targetConnector = connectors.find(c => c.id === lastConnectedWallet);
        if (targetConnector) {
          // Try to reconnect silently
          connect({ connector: targetConnector }).catch(() => {
            // If silent reconnect fails, clear the stored preference
            localStorage.removeItem('lastConnectedWallet');
          });
        }
      }
    }
  }, [isConnected, connector, connect, connectors]);

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
