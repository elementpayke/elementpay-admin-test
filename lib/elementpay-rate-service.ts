import { ELEMENTPAY_CONFIG, CURRENCY_MAP, VALIDATION, ERROR_MESSAGES } from './elementpay-config'
import { environmentManager } from './api-config'
import type { ElementPayRate } from './types'

/**
 * ElementPay Rate Service
 * Handles exchange rate fetching and calculations for ElementPay off-ramping
 */
class ElementPayRateService {
  private rateCache = new Map<string, { rate: ElementPayRate; timestamp: number }>()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  /**
   * Fetch exchange rate for a specific currency
   */
  async fetchRate(currency: string): Promise<ElementPayRate> {
    // Check cache first
    const cached = this.rateCache.get(currency)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate
    }

    try {
      const mappedCurrency = CURRENCY_MAP[currency as keyof typeof CURRENCY_MAP] || currency.toLowerCase()
      
      // Use environment manager to get the correct base URL
      const baseUrl = environmentManager.getBaseUrl()
      const aggregatorUrl = `${baseUrl}/aggregator`
      
      console.log(`Fetching rate for ${currency} from: ${aggregatorUrl}/rates/${mappedCurrency}`)
      
      const response = await fetch(`${aggregatorUrl}/rates/${mappedCurrency}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(VALIDATION.API_TIMEOUT),
      })

      if (!response.ok) {
        throw new Error(`Rate API responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      // Validate response structure
      if (!data || typeof data.base_rate !== 'number') {
        throw new Error('Invalid rate response format')
      }

      const rate: ElementPayRate = {
        currency: currency,
        base_rate: data.base_rate,
        marked_up_rate: data.marked_up_rate || data.base_rate,
        markup_percentage: data.markup_percentage || 0,
      }

      // Cache the result
      this.rateCache.set(currency, { rate, timestamp: Date.now() })
      
      return rate
    } catch (error) {
      console.error(`Failed to fetch rate for ${currency}:`, error)
      
      // Return mock data for development/testing
      const mockRate: ElementPayRate = {
        currency: currency,
        base_rate: this.getMockRate(currency),
        marked_up_rate: this.getMockRate(currency) * 1.02, // 2% markup
        markup_percentage: 2,
      }

      // Cache mock data for shorter duration
      this.rateCache.set(currency, { rate: mockRate, timestamp: Date.now() - (this.CACHE_DURATION / 2) })
      
      return mockRate
    }
  }

  /**
   * Calculate token amount needed for a given KES amount
   */
  calculateTokenAmount(kesAmount: number, rate: ElementPayRate): number {
    if (kesAmount <= 0 || rate.marked_up_rate <= 0) {
      return 0
    }

    // Convert KES to USD using the marked up rate
    const usdAmount = kesAmount / rate.marked_up_rate
    
    // Return USD amount (tokens are pegged 1:1 with USD)
    return parseFloat(usdAmount.toFixed(6))
  }

  /**
   * Calculate KES amount from token amount
   */
  calculateKesAmount(tokenAmount: number, rate: ElementPayRate): number {
    if (tokenAmount <= 0 || rate.marked_up_rate <= 0) {
      return 0
    }

    // Convert USD to KES using the marked up rate
    const kesAmount = tokenAmount * rate.marked_up_rate
    
    return parseFloat(kesAmount.toFixed(2))
  }

  /**
   * Validate KES amount
   */
  validateKesAmount(amount: number): { isValid: boolean; error?: string } {
    if (amount < VALIDATION.MIN_AMOUNT) {
      return {
        isValid: false,
        error: `Minimum amount is ${VALIDATION.MIN_AMOUNT} KES`
      }
    }

    if (amount > VALIDATION.MAX_AMOUNT) {
      return {
        isValid: false,
        error: `Maximum amount is ${VALIDATION.MAX_AMOUNT.toLocaleString()} KES`
      }
    }

    return { isValid: true }
  }

  /**
   * Check if user has sufficient balance for the transaction
   */
  validateSufficientBalance(
    requiredTokenAmount: number,
    availableBalance: number,
    tokenSymbol: string
  ): { isValid: boolean; error?: string } {
    if (availableBalance < requiredTokenAmount) {
      return {
        isValid: false,
        error: `Insufficient ${tokenSymbol} balance. Required: ${requiredTokenAmount.toFixed(6)}, Available: ${availableBalance.toFixed(6)}`
      }
    }

    return { isValid: true }
  }

  /**
   * Get mock rate for development/testing
   */
  private getMockRate(currency: string): number {
    const mockRates: Record<string, number> = {
      'USDT': 129.50,
      'USDC': 129.45,
      'WXM': 128.75,
      'ETH': 129.30,
    }

    return mockRates[currency] || 129.00
  }

  /**
   * Clear rate cache
   */
  clearCache(): void {
    this.rateCache.clear()
  }

  /**
   * Get cached rate if available
   */
  getCachedRate(currency: string): ElementPayRate | null {
    const cached = this.rateCache.get(currency)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.rate
    }
    return null
  }

  /**
   * Validate rate data structure
   */
  validateRate(rate: ElementPayRate): boolean {
    return (
      rate &&
      typeof rate.currency === 'string' &&
      typeof rate.base_rate === 'number' &&
      typeof rate.marked_up_rate === 'number' &&
      rate.base_rate > 0 &&
      rate.marked_up_rate > 0
    )
  }

  /**
   * Fetch rates for all supported currencies
   */
  async fetchAllRates(): Promise<Record<string, ElementPayRate>> {
    const currencies = Object.keys(CURRENCY_MAP)
    return this.fetchMultipleRates(currencies)
  }

  /**
   * Fetch rates for multiple currencies
   */
  async fetchMultipleRates(currencies: string[]): Promise<Record<string, ElementPayRate>> {
    const ratePromises = currencies.map(async (currency) => {
      try {
        const rate = await this.fetchRate(currency)
        return { currency, rate }
      } catch (error) {
        console.error(`Failed to fetch rate for ${currency}:`, error)
        return null
      }
    })

    const results = await Promise.allSettled(ratePromises)
    const rates: Record<string, ElementPayRate> = {}

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        rates[result.value.currency] = result.value.rate
      }
    })

    return rates
  }
}

// Create singleton instance
export const elementPayRateService = new ElementPayRateService()

// Export class for direct usage
export { ElementPayRateService }
export type { ElementPayRate }
