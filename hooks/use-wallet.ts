"use client"

import { useAccount, useConnect, useDisconnect, useSignMessage, useChainId } from 'wagmi'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import type { WalletConnectionState } from '@/lib/types'

export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const chainId = useChainId()
  const { toast } = useToast()

  const [walletState, setWalletState] = useState<WalletConnectionState>({
    isConnected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
  })

  // Update wallet state when wagmi state changes
  useEffect(() => {
    setWalletState({
      isConnected,
      address: address || null,
      chainId: chainId || null,
      isConnecting,
      error: connectError?.message || null,
    })
  }, [isConnected, address, chainId, isConnecting, connectError])

  // Persist wallet connection preference
  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem('wallet_connected', 'true')
      localStorage.setItem('wallet_address', address)
    } else {
      localStorage.removeItem('wallet_connected')
      localStorage.removeItem('wallet_address')
    }
  }, [isConnected, address])

  const connectWallet = async (connectorId?: string) => {
    try {
      // Map our custom wallet IDs to wagmi connector IDs
      const connectorMap: Record<string, string> = {
        'metaMask': 'metaMask',
        'coinbaseWallet': 'coinbaseWallet',
        'walletConnect': 'walletConnect',
      }

      const wagmiConnectorId = connectorId ? connectorMap[connectorId] || connectorId : undefined
      const connector = wagmiConnectorId 
        ? connectors.find(c => c.id === wagmiConnectorId) 
        : connectors[0] // Default to first available connector

      if (!connector) {
        throw new Error('No wallet connector available')
      }

      await connect({ connector })
      
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been successfully connected.",
      })
    } catch (error) {
      console.error('Wallet connection error:', error)
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
      })
    }
  }

  const disconnectWallet = () => {
    disconnect()
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    })
  }

  const signMessage = async (message: string): Promise<string> => {
    if (!isConnected) {
      throw new Error('Wallet not connected')
    }

    try {
      const signature = await signMessageAsync({ message })
      return signature
    } catch (error) {
      console.error('Message signing error:', error)
      throw error instanceof Error ? error : new Error('Failed to sign message')
    }
  }

  // Auto-reconnect on app load if previously connected
  useEffect(() => {
    const wasConnected = localStorage.getItem('wallet_connected') === 'true'
    if (wasConnected && !isConnected && !isConnecting) {
      // Small delay to ensure wagmi is ready
      setTimeout(() => {
        connectWallet()
      }, 100)
    }
  }, [])

  return {
    ...walletState,
    connectors,
    connectWallet,
    disconnectWallet,
    signMessage,
    // Helper methods
    isMetaMaskAvailable: () => connectors.some(c => c.id === 'metaMask'),
    getShortAddress: () => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
  }
}
