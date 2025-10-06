import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { environmentManager, apiClient, getCurrentEnvironment } from '@/lib/api-config'

// Explorer link generation utilities
const EXPLORER_MAP = {
  // Base mainnet
  base: {
    env: {
      live: "https://basescan.org",          // Base mainnet explorer
      sandbox: "https://sepolia.basescan.org" // Base Sepolia test explorer
    },
    // default path patterns (optional per-chain overrides)
    paths: { tx: "/tx/", address: "/address/", token: "/token/" }
  },

  // Lisk (chain id 1135)
  lisk: {
    env: { live: "https://blockscout.lisk.com" },
    paths: { tx: "/tx/", address: "/address/", token: "/tokens/" } // Blockscout token pages vary
  },

  // Scroll (chain id 534352)
  scroll: {
    env: { live: "https://scrollscan.com" },
    paths: { tx: "/tx/", address: "/address/", token: "/token/" }
  },

  // Arbitrum One
  arbitrum: {
    env: { live: "https://arbiscan.io" },
    paths: { tx: "/tx/", address: "/address/", token: "/token/" }
  },

  // fallback - you can add more chain mappings here
};

/**
 * Normalize chain name into a key used in EXPLORER_MAP
 */
function normalizeChainKey(chainName = "") {
  return String(chainName).trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Build links from mapping
 */
// Simple chain-to-explorer URL mapping
const CHAIN_EXPLORER_MAP: { [key: string]: string } = {
  "BASE": "https://basescan.org",
  "LISK": "https://blockscout.lisk.com",
  "SCROLL": "https://scrollscan.com",
  "ETHEREUM": "https://etherscan.io",
  "ARBITRUM": "https://arbiscan.io",
};

const TESTNET_EXPLORER_MAP: { [key: string]: string } = {
  "BASE": "https://sepolia.basescan.org",
  "LISK": "https://sepolia.blockscout.lisk.com",
  "SCROLL": "https://sepolia.scrollscan.com",
  "ETHEREUM": "https://sepolia.etherscan.io",
  "ARBITRUM": "https://sepolia.arbiscan.io",
};

/**
 * generateExplorerLinks - Simplified version
 * 
 * @param token - Token string like "BASE_USDC" or "LISK_USDT"
 * @param txHash - Transaction hash (assumes all hashes are tx hashes)
 * @returns Object with explorer base URL and transaction URL
 */
export function generateExplorerLinks(token: string, txHash: string, env: string) {
  if (!token || !txHash) {
    return {
      explorerBase: null,
      txUrl: null,
      error: "Token and txHash are required"
    };
  }

  // Split token by "_" to get chain name
  const parts = token.split('_');
  if (parts.length < 2) {
    return {
      explorerBase: null,
      txUrl: null,
      error: "Token format should be 'CHAIN_SYMBOL' (e.g., 'BASE_USDC')"
    };
  }

  const chainName = parts[0].toUpperCase();
  const explorerBase = env === "sandbox" ? TESTNET_EXPLORER_MAP[chainName] : CHAIN_EXPLORER_MAP[chainName];

  if (!explorerBase) {
    return {
      explorerBase: null,
      txUrl: null,
      error: `No explorer mapping found for chain: ${chainName}. Add it to CHAIN_EXPLORER_MAP.`
    };
  }

  // Assume all hashes are transaction hashes
  const txUrl = `${explorerBase}/tx/0x${txHash.toLowerCase()}`;
  console.log('txUrl', txUrl);

  return {
    explorerBase,
    txUrl,
    chainName,
    error: null
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Legacy environment functions for backwards compatibility
export function setElementPayEnvironment(env: 'sandbox' | 'live') {
  environmentManager.switchEnvironment(env)
}

export function getElementPayEnvironment() {
  const config = environmentManager.getCurrentConfig()
  return { 
    active: config.environment, 
    baseUrl: config.baseUrl 
  }
}


// Local proxy base (relative)
export const API_BASE_URL = "/api/elementpay"

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  apiKey?: string
) {
  const url = `${API_BASE_URL}${endpoint}`
  const currentEnvironment = getCurrentEnvironment()
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-elementpay-environment': currentEnvironment
  }
  if (apiKey) defaultHeaders['Authorization'] = `Bearer ${apiKey}`
  const config: RequestInit = { ...options, headers: { ...defaultHeaders, ...options.headers } }
  try {
    const response = await fetch(url, config)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) return await response.json()
    return await response.text()
  } catch (error) {
    console.error('API request error:', error)
    throw error
  }
}

export const elementPayAPI = {
  // Auth via internal proxy
  register: (data: { email: string; password: string; role?: string }) =>
    apiRequest('/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    apiRequest('/login', { method: 'POST', body: JSON.stringify(data) }),
  verifyEmail: (data: { email: string; verification_code: string }) =>
    apiRequest('/verify-email', { method: 'POST', body: JSON.stringify(data) }),
  requestPasswordReset: (data: { email: string }) =>
    apiRequest('/password/reset/request', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (data: { email: string; reset_code: string; new_password: string }) =>
    apiRequest('/password/reset/confirm', { method: 'POST', body: JSON.stringify(data) }),
  refreshToken: (data: { refresh_token: string }) =>
    apiRequest('/token/refresh', { method: 'POST', body: JSON.stringify(data) }),
  changePassword: (data: { current_password: string; new_password: string }, token: string) =>
    apiRequest('/password/change', { method: 'POST', body: JSON.stringify(data) }, token),
  getCurrentUser: (token: string) =>
    apiRequest('/me', { method: 'GET', headers: { Authorization: `Bearer ${token}` } }),
  healthCheck: () => apiRequest('/me', { method: 'GET' }),

  // External API calls that use the new API client
  createOrder: (orderData: any, apiKey: string) => 
    apiClient.apiKeyRequest('/orders/create', apiKey, { method: 'POST', body: JSON.stringify(orderData) }),
  createOrderLegacy: (payload: any, apiKey: string) => 
    apiClient.apiKeyRequest('/orders/create-legacy', apiKey, { method: 'POST', body: JSON.stringify(payload) }),
  getOrderByTxHash: (txHash: string, apiKey: string) => 
    apiClient.apiKeyRequest(`/orders/tx/${txHash}`, apiKey),
  getOrderStatus: (orderId: string, apiKey: string) => 
    apiClient.apiKeyRequest(`/orders/${orderId}`, apiKey),
  getOrdersForWallet: (apiKey: string) => 
    apiClient.apiKeyRequest('/orders/wallet', apiKey),

  getRates: (apiKey?: string) => 
    apiKey ? apiClient.apiKeyRequest('/rates', apiKey) : apiClient.get('/rates'),
  testWebhook: (webhookData: any, apiKey?: string) => 
    apiKey 
      ? apiClient.apiKeyRequest('/webhooks/test', apiKey, { method: 'POST', body: JSON.stringify(webhookData) })
      : apiClient.post('/webhooks/test', webhookData),

  listApiKeys: (apiKey: string) => 
    apiClient.apiKeyRequest('/api-keys', apiKey),
}
