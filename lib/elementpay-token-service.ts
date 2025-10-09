import { environmentManager } from './api-config'
import { VALIDATION } from './elementpay-config'
import type { ElementPayToken } from './types'

/**
 * ElementPay Token Service
 * Handles fetching supported tokens from the API
 */
class ElementPayTokenService {
  private tokenCache = new Map<string, { tokens: ElementPayToken[]; timestamp: number }>()
  private readonly CACHE_DURATION = 300000 // 5 minutes

  /**
   * Fetch supported tokens from API
   */
  async fetchSupportedTokens(env?: 'live' | 'sandbox' | 'all'): Promise<ElementPayToken[]> {
    const currentEnv = environmentManager.getCurrentEnvironment()
    const environment = env || currentEnv
    
    // Check cache first
    const cacheKey = environment
    const cached = this.tokenCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`Using cached tokens for environment: ${environment}`)
      return cached.tokens
    }

    try {
      const baseUrl = environmentManager.getBaseUrl()
      const url = `${baseUrl}/meta/tokens?env=${environment}`
      
      console.log(`Fetching supported tokens from: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(VALIDATION.API_TIMEOUT),
      })

      if (!response.ok) {
        throw new Error(`Token API responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      // Validate and transform response
      const tokens = this.validateAndTransformTokens(data)
      
      // Cache the result
      this.tokenCache.set(cacheKey, { tokens, timestamp: Date.now() })
      
      console.log(`Successfully fetched ${tokens.length} tokens for environment: ${environment}`)
      return tokens
    } catch (error) {
      console.error(`Failed to fetch tokens for environment ${environment}:`, error)
      
      // Return fallback tokens for development/testing
      const fallbackTokens = this.getFallbackTokens()
      
      // Cache fallback for shorter duration
      this.tokenCache.set(cacheKey, { 
        tokens: fallbackTokens, 
        timestamp: Date.now() - (this.CACHE_DURATION / 2) 
      })
      
      return fallbackTokens
    }
  }

  /**
   * Validate and transform API response to ElementPayToken format
   */
  private validateAndTransformTokens(data: any): ElementPayToken[] {
    if (!Array.isArray(data) && !data.tokens) {
      throw new Error('Invalid token response format - expected array or object with tokens property')
    }

    const tokenArray = Array.isArray(data) ? data : data.tokens
    
    return tokenArray.map((token: any) => {
      // Validate required fields
      if (!token.symbol || !token.name || !token.chain || !token.chainId || !token.tokenAddress || !token.decimals) {
        console.warn('Invalid token data:', token)
        throw new Error(`Invalid token data - missing required fields`)
      }

      return {
        symbol: token.symbol,
        name: token.name,
        chain: token.chain,
        chainId: Number(token.chainId),
        tokenAddress: token.tokenAddress,
        decimals: Number(token.decimals),
        icon: token.icon || `/tokens/${token.symbol.toLowerCase()}.svg`
      } as ElementPayToken
    }).filter(Boolean) // Remove any null/undefined tokens
  }

  /**
   * Get fallback tokens for development/testing
   */
  private getFallbackTokens(): ElementPayToken[] {
    return [
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
  }

  /**
   * Get tokens for specific chain
   */
  async getTokensForChain(chainId: number, env?: 'live' | 'sandbox' | 'all'): Promise<ElementPayToken[]> {
    const allTokens = await this.fetchSupportedTokens(env)
    return allTokens.filter(token => token.chainId === chainId)
  }

  /**
   * Get token by symbol and chain
   */
  async getToken(symbol: string, chainId: number, env?: 'live' | 'sandbox' | 'all'): Promise<ElementPayToken | null> {
    const allTokens = await this.fetchSupportedTokens(env)
    return allTokens.find(token => 
      token.symbol.toLowerCase() === symbol.toLowerCase() && 
      token.chainId === chainId
    ) || null
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear()
  }

  /**
   * Get cached tokens if available
   */
  getCachedTokens(env?: 'live' | 'sandbox' | 'all'): ElementPayToken[] | null {
    const currentEnv = environmentManager.getCurrentEnvironment()
    const environment = env || currentEnv
    
    const cached = this.tokenCache.get(environment)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.tokens
    }
    return null
  }

  /**
   * Refresh tokens (force fetch from API)
   */
  async refreshTokens(env?: 'live' | 'sandbox' | 'all'): Promise<ElementPayToken[]> {
    const currentEnv = environmentManager.getCurrentEnvironment()
    const environment = env || currentEnv
    
    // Clear cache for this environment
    this.tokenCache.delete(environment)
    
    // Fetch fresh data
    return this.fetchSupportedTokens(environment)
  }
}

// Create singleton instance
export const elementPayTokenService = new ElementPayTokenService()

// Export class for direct usage
export { ElementPayTokenService }


