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
function buildLinksFromMap(mapping: any, txOrAddress: string, env: string, tokenObj: any) {
  const explorerBase = mapping.env[env] || mapping.env["live"];
  const paths = mapping.paths || { tx: "/tx/", address: "/address/", token: "/token/" };

  // normalize txOrAddress: detect whether it's a tx hash (starts with 0x and length ~66) or an address/contract
  const isTx = /^0x([A-Fa-f0-9]{64})$/.test(txOrAddress);
  const isAddress = /^0x([A-Fa-f0-9]{40})$/.test(txOrAddress);

  const txUrl = isTx ? `${explorerBase}${paths.tx}${txOrAddress}` : null;
  const addressUrl = isAddress ? `${explorerBase}${paths.address}${txOrAddress}` : null;

  // For token contract URL: if tokenObj.address available use it; else null
  const tokenAddr = tokenObj.address;
  const tokenUrl = tokenAddr ? `${explorerBase}${paths.token}${tokenAddr}` : null;

  return { explorerBase, txUrl, addressUrl, tokenUrl, tokenObj };
}

/**
 * generateExplorerLinks
 * - input: token (object from tokens API OR string like "BASE_USDC"), txHash or address,
 *          env: "live" | "sandbox"
 * - output: { explorerBase, txUrl, addressUrl, tokenUrl }
 *
 * Notes:
 * - Explorer paths use common patterns: /tx/<hash>, /address/<address>, /token/<address>.
 * - If an explorer uses different paths, add per-chain overrides in EXPLORER_MAP.
 */
export function generateExplorerLinks({
  tokenInput,
  txOrAddress,
  env = "live",
  tokensList = [],
  chainsList = []
}: {
  tokenInput: any;
  txOrAddress: string;
  env?: "live" | "sandbox";
  tokensList?: any[];
  chainsList?: any[];
}) {
  if (!tokenInput) throw new Error("tokenInput is required (token object or 'CHAIN_TOKEN' string)");
  if (!txOrAddress) throw new Error("txOrAddress (tx hash or address) is required");

  // If tokenInput is an object (from API), use it directly
  let tokenObj = null;
  if (typeof tokenInput === "object" && tokenInput !== null) {
    tokenObj = tokenInput;
  } else if (typeof tokenInput === "string") {
    // tokenInput like "BASE_USDC" or "Base_USDC" or just "USDC"
    const parts = tokenInput.split(/[_\s-]+/);
    if (parts.length >= 2) {
      // first part likely chain name, second token symbol
      const [chainPart, symbolPart] = parts;
      // try to find a matching token entry from tokensList
      if (tokensList && tokensList.length) {
        tokenObj = tokensList.find(
          (t: any) =>
            String(t.symbol).toLowerCase() === String(symbolPart).toLowerCase() &&
            (String(t.chain_name).toLowerCase() === String(chainPart).toLowerCase() ||
             String(t.chain_name).toLowerCase().includes(String(chainPart).toLowerCase()))
        );
      }
      // fallback minimal token object
      if (!tokenObj) tokenObj = { symbol: symbolPart.toUpperCase(), chain_name: chainPart, env };
    } else {
      // just a symbol like "USDC" — try to find the first token in tokensList
      if (tokensList && tokensList.length) {
        tokenObj = tokensList.find((t: any) => String(t.symbol).toLowerCase() === tokenInput.toLowerCase()) || tokensList[0];
      } else {
        tokenObj = { symbol: tokenInput.toUpperCase(), chain_name: "unknown", env };
      }
    }
  } else {
    throw new Error("tokenInput must be an object or string");
  }

  const chainKey = normalizeChainKey(tokenObj.chain_name || "");
  const mapping = EXPLORER_MAP[chainKey as keyof typeof EXPLORER_MAP];

  if (!mapping) {
    // try to resolve by chain_id using chainsList (if provided)
    if (tokenObj.chain_id && chainsList && chainsList.length) {
      const chainInfo = chainsList.find((c: any) => Number(c.chain_id) === Number(tokenObj.chain_id));
      if (chainInfo) {
        const ck = normalizeChainKey(chainInfo.name);
        if (EXPLORER_MAP[ck as keyof typeof EXPLORER_MAP]) {
          return buildLinksFromMap(EXPLORER_MAP[ck as keyof typeof EXPLORER_MAP], txOrAddress, env, tokenObj);
        }
      }
    }
    // unknown chain - return null + hint
    return {
      explorerBase: null,
      txUrl: null,
      addressUrl: null,
      tokenUrl: null,
      message: `No explorer mapping for chain '${tokenObj.chain_name}' (chainKey=${chainKey}). Add one to EXPLORER_MAP.`
    };
  }

  return buildLinksFromMap(mapping, txOrAddress, env, tokenObj);
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
