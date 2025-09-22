import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { environmentManager, apiClient } from '@/lib/api-config'

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
  const defaultHeaders: HeadersInit = { 'Content-Type': 'application/json' }
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
