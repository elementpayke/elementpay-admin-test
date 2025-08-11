import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Environment configuration for Element Pay (runtime switchable)
const SANDBOX_BASE = process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1'
const LIVE_BASE = process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1'
let currentEnv: 'sandbox' | 'live' = (process.env.NEXT_PUBLIC_ELEMENTPAY_ENV || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox'

export function setElementPayEnvironment(env: 'sandbox' | 'live') {
  currentEnv = env
}
export function getElementPayEnvironment() {
  return { active: currentEnv, baseUrl: currentEnv === 'live' ? LIVE_BASE : SANDBOX_BASE }
}

// Local proxy base (relative)
export const API_BASE_URL = "/api/elementpay"

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  apiKey?: string
) {
  const url = `${API_BASE_URL}${endpoint}`
  const envHeader = getElementPayEnvironment().active
  const defaultHeaders: HeadersInit = { 'Content-Type': 'application/json', 'x-elementpay-env': envHeader }
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

// External (direct) calls requiring API keys (bypassing internal proxy)
function ext(path: string) {
  const { baseUrl } = getElementPayEnvironment()
  return `${baseUrl}${path}`
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

  // External corrected paths (use dynamic env)
  createOrder: (orderData: any, apiKey: string) => fetch(ext('/orders/create'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(orderData)
  }),
  createOrderLegacy: (payload: any, apiKey: string) => fetch(ext('/orders/create-legacy'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(payload)
  }),
  getOrderByTxHash: (txHash: string, apiKey: string) => fetch(ext(`/orders/tx/${txHash}`), { headers: { 'x-api-key': apiKey } }),
  getOrderStatus: (orderId: string, apiKey: string) => fetch(ext(`/orders/${orderId}`), { headers: { 'x-api-key': apiKey } }),
  getOrdersForWallet: (apiKey: string) => fetch(ext('/orders/wallet'), { headers: { 'x-api-key': apiKey } }),

  getRates: (apiKey?: string) => fetch(ext('/rates'), { method: 'GET', headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) } }),
  testWebhook: (webhookData: any, apiKey?: string) => fetch(ext('/webhooks/test'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'x-api-key': apiKey } : {}) }, body: JSON.stringify(webhookData) }),

  listApiKeys: (apiKey: string) => fetch(ext('/api-keys'), { headers: { 'x-api-key': apiKey } }),
}
