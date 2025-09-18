"use client"

import { useState } from "react"
import Image from "next/image"
import { useWallet } from "@/hooks/use-wallet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react"
import { SiMetamask } from "react-icons/si"
import { useToast } from "@/components/ui/use-toast"

interface WalletOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  iconUrl?: string
  installed: boolean
  downloadUrl?: string
}

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WalletConnectModal({ open, onOpenChange }: WalletConnectModalProps) {
  const { connectWallet, connectors, isConnecting } = useWallet()
  const { toast } = useToast()
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null)

  // Define wallet options with proper icons and metadata
  const walletOptions: WalletOption[] = [
    {
      id: "metaMask",
      name: "MetaMask",
      description: "Connect using browser extension",
      icon: <SiMetamask className="h-8 w-8" style={{ color: "#F6851B" }} />,
      installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
      downloadUrl: "https://metamask.io/download/",
    },
    {
      id: "coinbaseWallet",
      name: "Coinbase Wallet",
      description: "Connect using Coinbase Wallet",
      icon: (
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">CB</span>
        </div>
      ),
      installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
      downloadUrl: "https://www.coinbase.com/wallet",
    },
    {
      id: "walletConnect",
      name: "WalletConnect",
      description: "Scan with WalletConnect to connect",
      icon: (
        <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">WC</span>
        </div>
      ),
      installed: true, // WalletConnect is always available
    },
  ]

  const handleWalletConnect = async (walletId: string) => {
    const wallet = walletOptions.find(w => w.id === walletId)
    if (!wallet) return

    if (!wallet.installed && wallet.downloadUrl) {
      window.open(wallet.downloadUrl, '_blank')
      toast({
        title: "Wallet Not Installed",
        description: `Please install ${wallet.name} and refresh the page.`,
        variant: "destructive",
      })
      return
    }

    setConnectingWallet(walletId)
    try {
      await connectWallet(walletId)
      onOpenChange(false)
      toast({
        title: "Wallet Connected",
        description: `Successfully connected to ${wallet.name}`,
      })
    } catch (error) {
      console.error('Wallet connection error:', error)
      toast({
        title: "Connection Failed",
        description: `Failed to connect to ${wallet.name}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setConnectingWallet(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Connect Wallet</DialogTitle>
          <DialogDescription className="text-center">
            Choose a wallet to connect to Element Pay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {walletOptions.map((wallet) => (
            <Card 
              key={wallet.id}
              className={`cursor-pointer transition-all hover:border-purple-300 hover:shadow-sm ${
                !wallet.installed ? 'opacity-75' : ''
              }`}
              onClick={() => handleWalletConnect(wallet.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {wallet.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{wallet.name}</h3>
                      {!wallet.installed && (
                        <span className="text-xs text-muted-foreground bg-yellow-100 px-2 py-1 rounded">
                          Not Installed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{wallet.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {connectingWallet === wallet.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : !wallet.installed ? (
                      <ExternalLink className="h-5 w-5 text-muted-foreground" />
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Only connect to wallets you trust. Never share your private keys or seed phrase.
          </AlertDescription>
        </Alert>

        <div className="text-center text-sm text-muted-foreground">
          New to wallets?{" "}
          <a 
            href="https://ethereum.org/en/wallets/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-600 hover:underline"
          >
            Learn more
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WalletConnectModal

