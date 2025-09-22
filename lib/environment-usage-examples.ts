/**
 * ElementPay Environment Management Usage Examples
 * 
 * This file demonstrates how to use the new environment management system
 * throughout your application.
 */

import { 
  apiClient, 
  environmentManager, 
  getCurrentEnvironment, 
  getCurrentConfig, 
  switchEnvironment,
  subscribeToEnvironmentChanges 
} from '@/lib/api-config'

// ===== Basic Usage Examples =====

// 1. Get current environment information
export function getEnvironmentInfo() {
  const currentEnv = getCurrentEnvironment() // 'sandbox' | 'live'
  const config = getCurrentConfig() // { baseUrl: string, environment: Environment }
  
  console.log(`Current environment: ${currentEnv}`)
  console.log(`API Base URL: ${config.baseUrl}`)
  
  return {
    environment: currentEnv,
    baseUrl: config.baseUrl,
    isSandbox: currentEnv === 'sandbox',
    isLive: currentEnv === 'live'
  }
}

// 2. Switch environments programmatically
export function switchToSandbox() {
  switchEnvironment('sandbox')
  console.log('Switched to sandbox environment')
}

export function switchToLive() {
  switchEnvironment('live')
  console.log('Switched to live environment')
}

// 3. Subscribe to environment changes
export function setupEnvironmentListener() {
  const unsubscribe = subscribeToEnvironmentChanges((newEnv) => {
    console.log(`Environment changed to: ${newEnv}`)
    
    // Perform any necessary actions when environment changes
    // For example, refresh data, update UI, etc.
  })
  
  // Return unsubscribe function for cleanup
  return unsubscribe
}

// ===== API Client Usage Examples =====

// 1. Basic API calls (automatically use current environment)
export async function fetchRates() {
  try {
    const response = await apiClient.get('/rates')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch rates:', error)
    throw error
  }
}

// 2. Authenticated API calls
export async function fetchUserProfile(token: string) {
  try {
    const response = await apiClient.authenticatedRequest('/auth/me', token)
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    throw error
  }
}

// 3. API key authenticated calls
export async function createOrder(orderData: any, apiKey: string) {
  try {
    const response = await apiClient.apiKeyRequest('/orders/create', apiKey, {
      method: 'POST',
      body: JSON.stringify(orderData)
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to create order:', error)
    throw error
  }
}

// 4. Check current environment before making specific calls
export async function fetchEnvironmentSpecificData(token: string) {
  const { environment } = getEnvironmentInfo()
  
  if (environment === 'sandbox') {
    // Use test data or special handling for sandbox
    console.log('Fetching test data from sandbox')
  } else {
    // Use production data for live environment
    console.log('Fetching production data from live')
  }
  
  const response = await apiClient.authenticatedRequest('/data', token)
  return response.json()
}

// ===== Environment Manager Direct Usage =====

// 1. Direct access to environment manager
export function advancedEnvironmentUsage() {
  // Check current environment
  const currentEnv = environmentManager.getCurrentEnvironment()
  
  // Get configuration for specific environment
  const sandboxConfig = environmentManager.getConfig('sandbox')
  const liveConfig = environmentManager.getConfig('live')
  
  // Check environment types
  const isSandbox = environmentManager.isSandbox()
  const isLive = environmentManager.isLive()
  
  // Get base URLs
  const currentBaseUrl = environmentManager.getBaseUrl()
  const sandboxBaseUrl = environmentManager.getBaseUrlForEnvironment('sandbox')
  const liveBaseUrl = environmentManager.getBaseUrlForEnvironment('live')
  
  return {
    currentEnv,
    sandboxConfig,
    liveConfig,
    isSandbox,
    isLive,
    currentBaseUrl,
    sandboxBaseUrl,
    liveBaseUrl
  }
}

// 2. Environment switching with validation
export async function safeEnvironmentSwitch(targetEnv: 'sandbox' | 'live') {
  const currentEnv = getCurrentEnvironment()
  
  if (currentEnv === targetEnv) {
    console.log(`Already in ${targetEnv} environment`)
    return false
  }
  
  try {
    // You might want to save current state or show confirmation
    switchEnvironment(targetEnv)
    console.log(`Successfully switched from ${currentEnv} to ${targetEnv}`)
    return true
  } catch (error) {
    console.error('Failed to switch environment:', error)
    return false
  }
}

// ===== React Component Integration Examples =====

// 1. Custom hook usage pattern
export function useEnvironmentAwareAPI() {
  // This would typically be in a React component
  const { environment, isSandbox, isLive, config } = getCurrentConfig()
  
  const makeAPICall = async (endpoint: string, options: RequestInit = {}) => {
    return apiClient.request(endpoint, options)
  }
  
  return {
    environment,
    isSandbox,
    isLive,
    baseUrl: config.baseUrl,
    makeAPICall
  }
}

// 2. Environment-aware data fetching
export async function fetchEnvironmentAwareData(dataType: string) {
  const { environment } = getEnvironmentInfo()
  
  // Different endpoints or parameters based on environment
  const endpoint = environment === 'sandbox' 
    ? `/test/${dataType}` 
    : `/production/${dataType}`
  
  const response = await apiClient.get(endpoint)
  return response.json()
}

// ===== Error Handling and Logging =====

// Environment-aware error handling
export function handleAPIError(error: any, context: string) {
  const { environment } = getEnvironmentInfo()
  
  console.error(`[${environment.toUpperCase()}] ${context}:`, error)
  
  // Different error handling strategies based on environment
  if (environment === 'sandbox') {
    // More verbose logging for debugging in sandbox
    console.debug('Full error details:', error)
  } else {
    // Minimal logging for production
    console.error('Production error occurred')
  }
}

// Environment-aware logging
export function logEnvironmentInfo(message: string, data?: any) {
  const { environment, baseUrl } = getEnvironmentInfo()
  
  console.log(`[${environment.toUpperCase()}] ${message}`, {
    environment,
    baseUrl,
    timestamp: new Date().toISOString(),
    data
  })
}
