import { environmentManager } from './api-config'

// ElementPay Configuration
export const ELEMENTPAY_CONFIG = {
  // Contract Address
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_ELEMENTPAY_CONTRACT_ADDRESS || '0x...',
  
  // Encryption
  SECRET_KEY: process.env.NEXT_PUBLIC_ELEMENTPAY_SECRET_KEY || "Nt-H5Ofmhk1JonVFjrRJr_pV6p-oADX_FdrQyFAqx5Y=",
  
  // Fixed parameters for off-ramp
  CASHOUT_TYPE: "PHONE" as const,
  CURRENCY: "KES" as const,
  ORDER_TYPE: 1 as const, // Off-ramp
  
  // Dynamic API URL getter
  getAggregatorUrl: () => {
    const baseUrl = environmentManager.getBaseUrl()
    return `${baseUrl}/aggregator`
  },
  
  // Get current environment
  getCurrentEnvironment: () => environmentManager.getCurrentEnvironment(),
  
  // Check if sandbox
  isSandbox: () => environmentManager.isSandbox(),
}

import type { ElementPayToken } from './types'

// Legacy fallback tokens (will be replaced by API-fetched tokens)
export const FALLBACK_TOKENS: ElementPayToken[] = [
  {
    symbol: "USDT",
    name: "Tether USD",
    chain: "Lisk",
    chainId: 1135,
    tokenAddress: "0x05D032ac25d322df992303dCa074EE7392C117b9",
    decimals: 6,
    icon: "/tokens/usdt.svg"
  },
  {
    symbol: "USDC", 
    name: "USD Coin",
    chain: "Base",
    chainId: 8453,
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    icon: "/tokens/usdc.svg"
  },
  {
    symbol: "USDC",
    name: "USD Coin", 
    chain: "Scroll",
    chainId: 534352,
    tokenAddress: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
    decimals: 6,
    icon: "/tokens/usdc-scroll.svg"
  },
  {
    symbol: "WXM",
    name: "WXM Coin",
    chain: "Arbitrum", 
    chainId: 42161,
    tokenAddress: "0xB6093B61544572Ab42A0E43AF08aBaFD41bf25A6",
    decimals: 6,
    icon: "/tokens/wxm.svg"
  }
]

// Dynamic function to get supported tokens (lazy import to avoid circular dependency)
export const getSupportedTokens = async (): Promise<ElementPayToken[]> => {
  try {
    const { elementPayTokenService } = await import('./elementpay-token-service')
    return await elementPayTokenService.fetchSupportedTokens()
  } catch (error) {
    console.error('Failed to fetch supported tokens, using fallback:', error)
    return FALLBACK_TOKENS
  }
}

// Synchronous function to get cached tokens (for immediate use)
export const getCachedSupportedTokens = (): ElementPayToken[] => {
  try {
    // This will only work if the token service has been imported elsewhere
    const { elementPayTokenService } = require('./elementpay-token-service')
    const cached = elementPayTokenService.getCachedTokens()
    return cached || FALLBACK_TOKENS
  } catch (error) {
    // If token service not loaded yet, return fallback
    return FALLBACK_TOKENS
  }
}

// For backwards compatibility - use fallback tokens
export const SUPPORTED_TOKENS = FALLBACK_TOKENS
export type SupportedToken = ElementPayToken

// Currency mapping for rate API
export const CURRENCY_MAP = {
  'USDT': 'usdt_lisk',
  'USDC': 'usdc', 
  'WXM': 'wxm',
  'ETH': 'eth'
} as const

// Network configurations
export const NETWORK_CONFIGS = {
  1135: { // Lisk
    name: 'Lisk',
    rpcUrl: 'https://rpc.api.lisk.com',
    blockExplorer: 'https://blockscout.lisk.com'
  },
  8453: { // Base
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org'
  },
  534352: { // Scroll
    name: 'Scroll',
    rpcUrl: 'https://rpc.scroll.io',
    blockExplorer: 'https://scrollscan.com'
  },
  42161: { // Arbitrum
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io'
  }
} as const

// Validation constants
export const VALIDATION = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 1000000, // 1M KES
  PHONE_REGEX: /^(\+254|254|0)?[17]\d{8}$/,
  API_TIMEOUT: 45000, // 45 seconds
} as const

// Error messages
export const ERROR_MESSAGES = {
  INVALID_PHONE: "Please enter a valid Kenyan phone number (+254XXXXXXXXX or 07XXXXXXXX)",
  INVALID_AMOUNT: `Amount must be between ${VALIDATION.MIN_AMOUNT} and ${VALIDATION.MAX_AMOUNT.toLocaleString()} KES`,
  INSUFFICIENT_BALANCE: "Insufficient token balance for this transaction",
  RATE_FETCH_FAILED: "Failed to fetch current exchange rates",
  NETWORK_SWITCH_REQUIRED: "Please switch to the correct network for this token",
  APPROVAL_FAILED: "Token approval failed",
  SIGNING_FAILED: "Message signing failed",
  ORDER_CREATION_FAILED: "Failed to create disbursement order",
} as const
