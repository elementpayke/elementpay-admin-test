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
  async fetchSupportedTokens(): Promise<ElementPayToken[]> {
    const environment = environmentManager.getCurrentEnvironment()

    console.log(`🔄 [TOKEN-SERVICE] Using environment: ${environment}`)


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
      console.log(`Fetched token data structure:`, data)
      console.log(`Token data array:`, data.data)
      for (const token of data.data) {
        console.log(`Token object:`, token)
      }
      
      // Validate and transform response
      const tokens = this.validateAndTransformTokens(data.data)

      
      // Cache the result
      // this.tokenCache.set(cacheKey, { tokens, timestamp: Date.now() })
      
      console.log(`Nimepata tokens as: ${tokens}`)
      return tokens
    } catch (error) {
      console.error(`Failed to fetch tokens for environment ${environment}:`, error)
      
      // Return fallback tokens for development/testing
      const fallbackTokens = this.getFallbackTokens()
      
      // // Cache fallback for shorter duration
      // this.tokenCache.set(cacheKey, { 
      //   tokens: fallbackTokens, 
      //   timestamp: Date.now() - (this.CACHE_DURATION / 2) 
      // })
      
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
      // Validate required fields - handle both API response formats
      const symbol = token.symbol
      const chain = token.chain || token.chain_name
      const chainId = token.chainId || token.chain_id
      const tokenAddress = token.tokenAddress || token.address
      const decimals = token.decimals
      const env = token.env

      // Validate required fields exist
      if (!symbol || !chain || chainId == null || !tokenAddress || decimals == null) {
        console.warn('Invalid token data - missing required fields:', { symbol, chain, chainId, tokenAddress, decimals, env })
        console.warn('Full token object:', token)
        throw new Error(`Invalid token data - missing required fields: symbol=${symbol}, chain=${chain}, chainId=${chainId}, address=${tokenAddress}, decimals=${decimals}`)
      }

      return {
        symbol: symbol,
        chain: chain,
        chainId: Number(chainId),
        tokenAddress: tokenAddress,
        decimals: Number(decimals),
        env: env,
      } as ElementPayToken
    }).filter(Boolean) // Remove any null/undefined tokens
  }

  /**
   * Get fallback tokens for development/testing
   */
  private getFallbackTokens(): ElementPayToken[] {
    return [
      
          {
            "symbol": "USDC",
            "decimals": 6,
            "tokenAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
            "chainId": 8453,
            "chain": "Base",
            "env": "live"
          },
          {
            "symbol": "USDT",
            "decimals": 6,
            "tokenAddress": "0x05d032ac25d322df992303dca074ee7392c117b9",
            "chainId": 1135,
            "chain": "Lisk",
            "env": "live"
          },
          {
            "symbol": "USDC",
            "decimals": 6,
            "tokenAddress": "0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4",
            "chainId": 534352,
            "chain": "Scroll",
            "env": "live"
          },
          {
            "symbol": "USDT",
            "decimals": 6,
            "tokenAddress": "0xf55bec9cafdbe8730f096aa55dad6d22d44099df",
            "chainId": 534352,
            "chain": "Scroll",
            "env": "live"
          },
          {
            "symbol": "WXM",
            "decimals": 18,
            "tokenAddress": "0xb6093b61544572ab42a0e43af08abafd41bf25a6",
            "chainId": 42161,
            "chain": "Arbitrum One",
            "env": "live"
          },
          {
            "symbol": "bKES",
            "decimals": 18,
            "tokenAddress": "0xd62fBDd984241BcFdEe96915b43101912a9fcE69",
            "chainId": 534352,
            "chain": "Scroll",
            "env": "live"
          }
      
     
    ]
  }

  /**
   * Get tokens for specific chain
   */
  async getTokensForChain(chainId: number, env?: 'live' | 'sandbox' | 'all'): Promise<ElementPayToken[]> {
    const allTokens = await this.fetchSupportedTokens()
    return allTokens.filter(token => token.chainId === chainId)
  }

  /**
   * Get token by symbol and chain
   */
  async getToken(symbol: string, chainId: number, env?: 'live' | 'sandbox' | 'all'): Promise<ElementPayToken | null> {
    const allTokens = await this.fetchSupportedTokens()
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
    return this.fetchSupportedTokens()
  }
}

// Create singleton instance
export const elementPayTokenService = new ElementPayTokenService()

// Export class for direct usage
export { ElementPayTokenService }

// Debug function for testing environment mapping
if (typeof window !== 'undefined') {
  (window as any).testTokenEnvironment = async () => {
    console.log('🧪 Testing token environment mapping...')
    const env = environmentManager.getCurrentEnvironment()
    console.log(`Environment: ${env}`)

    try {
      const tokens = await elementPayTokenService.fetchSupportedTokens()
      console.log(`Fetched ${tokens.length} tokens for ${env} environment`)
      return tokens
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    }
  }
}



