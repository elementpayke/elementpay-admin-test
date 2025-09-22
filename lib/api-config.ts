// Environment types
export type Environment = 'sandbox' | 'live'

// API configuration interface
export interface ApiConfig {
  baseUrl: string
  environment: Environment
}

// Environment configurations
const ENVIRONMENTS: Record<Environment, ApiConfig> = {
  sandbox: {
    baseUrl: process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1',
    environment: 'sandbox'
  },
  live: {
    baseUrl: process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1',
    environment: 'live'
  }
}

// Local storage key for environment preference
const ENV_STORAGE_KEY = 'elementpay_environment'

// Default environment
const DEFAULT_ENVIRONMENT: Environment = 'sandbox'

/**
 * Environment Manager Class
 * Handles environment switching and persistence
 */
class EnvironmentManager {
  private currentEnvironment: Environment
  private listeners: Array<(env: Environment) => void> = []
  private initialized = false

  constructor() {
    // Initialize lazily to avoid server-side issues
    this.currentEnvironment = DEFAULT_ENVIRONMENT
  }

  private ensureInitialized() {
    if (!this.initialized && typeof window !== 'undefined') {
      const stored = this.getStoredEnvironment()
      if (stored) {
        this.currentEnvironment = stored
      }
      this.initialized = true
    }
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): Environment {
    this.ensureInitialized()
    return this.currentEnvironment
  }

  /**
   * Get current API configuration
   */
  getCurrentConfig(): ApiConfig {
    this.ensureInitialized()
    return ENVIRONMENTS[this.currentEnvironment]
  }

  /**
   * Get configuration for specific environment
   */
  getConfig(environment: Environment): ApiConfig {
    return ENVIRONMENTS[environment]
  }

  /**
   * Switch to a different environment
   */
  switchEnvironment(environment: Environment): void {
    this.ensureInitialized()
    if (this.currentEnvironment !== environment) {
      this.currentEnvironment = environment
      this.saveEnvironment(environment)
      this.notifyListeners(environment)
    }
  }

  /**
   * Subscribe to environment changes
   */
  subscribe(callback: (env: Environment) => void): () => void {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Get stored environment from localStorage
   */
  private getStoredEnvironment(): Environment | null {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(ENV_STORAGE_KEY)
      if (stored && (stored === 'sandbox' || stored === 'live')) {
        return stored as Environment
      }
    } catch (error) {
      console.warn('Failed to read environment from localStorage:', error)
    }
    
    return null
  }

  /**
   * Save environment to localStorage
   */
  private saveEnvironment(environment: Environment): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(ENV_STORAGE_KEY, environment)
    } catch (error) {
      console.warn('Failed to save environment to localStorage:', error)
    }
  }

  /**
   * Notify all listeners of environment change
   */
  private notifyListeners(environment: Environment): void {
    this.listeners.forEach(callback => {
      try {
        callback(environment)
      } catch (error) {
        console.error('Error in environment change listener:', error)
      }
    })
  }

  /**
   * Get base URL for current environment
   */
  getBaseUrl(): string {
    return this.getCurrentConfig().baseUrl
  }

  /**
   * Get base URL for specific environment
   */
  getBaseUrlForEnvironment(environment: Environment): string {
    return this.getConfig(environment).baseUrl
  }

  /**
   * Check if current environment is sandbox
   */
  isSandbox(): boolean {
    this.ensureInitialized()
    return this.currentEnvironment === 'sandbox'
  }

  /**
   * Check if current environment is live
   */
  isLive(): boolean {
    this.ensureInitialized()
    return this.currentEnvironment === 'live'
  }
}

// Create singleton instance
export const environmentManager = new EnvironmentManager()

/**
 * API Client Class
 * Handles HTTP requests with automatic environment switching
 */
class ApiClient {
  /**
   * Make HTTP request with current environment configuration
   */
  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const config = environmentManager.getCurrentConfig()
    const url = `${config.baseUrl}${path}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, requestOptions)
      return response
    } catch (error) {
      console.error(`API request failed for ${config.environment}:`, error)
      throw error
    }
  }

  /**
   * Make authenticated request with token
   */
  async authenticatedRequest(path: string, token: string, options: RequestInit = {}): Promise<Response> {
    return this.request(path, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  }

  /**
   * Make request with API key
   */
  async apiKeyRequest(path: string, apiKey: string, options: RequestInit = {}): Promise<Response> {
    return this.request(path, {
      ...options,
      headers: {
        ...options.headers,
        'x-api-key': apiKey,
      },
    })
  }

  /**
   * GET request
   */
  async get(path: string, options: RequestInit = {}): Promise<Response> {
    return this.request(path, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post(path: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put(path: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete(path: string, options: RequestInit = {}): Promise<Response> {
    return this.request(path, { ...options, method: 'DELETE' })
  }

  /**
   * Get current environment info
   */
  getEnvironmentInfo() {
    return {
      environment: environmentManager.getCurrentEnvironment(),
      baseUrl: environmentManager.getBaseUrl(),
      isSandbox: environmentManager.isSandbox(),
      isLive: environmentManager.isLive(),
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

/**
 * Helper functions for external use
 */
export const getCurrentEnvironment = () => environmentManager.getCurrentEnvironment()
export const getCurrentConfig = () => environmentManager.getCurrentConfig()
export const switchEnvironment = (env: Environment) => environmentManager.switchEnvironment(env)
export const subscribeToEnvironmentChanges = (callback: (env: Environment) => void) => 
  environmentManager.subscribe(callback)

// Export for backwards compatibility and direct access
export { environmentManager as envManager }
export { ENVIRONMENTS }
