import { createConfig, http } from 'wagmi'
import { base, mainnet, sepolia } from 'wagmi/chains'
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors'

// Get project ID from environment variable
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id'

export const wagmiConfig = createConfig({
  chains: [base, mainnet, sepolia],
  connectors: [
    metaMask(),
    coinbaseWallet({
      appName: 'Element Pay Dashboard',
      appLogoUrl: '/elementpay.png',
    }),
    walletConnect({
      projectId,
    }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

// Chain configurations
export const SUPPORTED_CHAINS = {
  [base.id]: {
    name: 'Base',
    nativeCurrency: 'ETH',
    blockExplorer: 'https://basescan.org',
    tokens: {
      USDC: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        symbol: 'USDC',
      },
    },
  },
  [mainnet.id]: {
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    blockExplorer: 'https://etherscan.io',
    tokens: {
      USDC: {
        address: '0xA0b86a33E6441e0e0f0c6F2b8e4b9e7E4c8c2e3a',
        decimals: 6,
        symbol: 'USDC',
      },
    },
  },
  [sepolia.id]: {
    name: 'Sepolia Testnet',
    nativeCurrency: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
    tokens: {
      USDC: {
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        decimals: 6,
        symbol: 'USDC',
      },
    },
  },
}

export const DEFAULT_CHAIN = base

