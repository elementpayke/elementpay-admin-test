import { ELEMENTPAY_CONFIG, VALIDATION, ERROR_MESSAGES } from './elementpay-config'
import type { ElementPayOrderPayload } from './types'

export interface ElementPayOrderResponse {
  id: string
  status: string
  user_address: string
  token: string
  order_type: number
  fiat_payload: {
    amount_fiat: number
    cashout_type: string
    phone_number: string
    currency: string
  }
  message_hash: string
  created_at: string
  updated_at: string
  transaction_hash?: string
  mpesa_reference?: string
  estimated_completion?: string
}

/**
 * ElementPay API Client
 * Handles API communication with ElementPay aggregator
 */
class ElementPayApiClient {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_ELEMENTPAY_API_KEY || ''
  }

  /**
   * Get current aggregator URL
   */
  private getAggregatorUrl(): string {
    return ELEMENTPAY_CONFIG.getAggregatorUrl()
  }

  /**
   * Create disbursement order
   */
  async createOrder(
    orderPayload: ElementPayOrderPayload,
    signature: string
  ): Promise<ElementPayOrderResponse> {
    const baseUrl = ELEMENTPAY_CONFIG.getCurrentEnvironment() === 'sandbox'
      ? process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1'
      : process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1'

    console.log('🔄 [ELEMENTPAY-API-CLIENT] createOrder method called with:', {
      orderPayload,
      signatureLength: signature.length,
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey.length,
      baseUrl
    })

    if (!this.apiKey) {
      console.error('❌ [ELEMENTPAY-API-CLIENT] No API key configured!')
      throw new Error('ElementPay API key not configured')
    }
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VALIDATION.API_TIMEOUT)

      const response = await fetch(`${baseUrl}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': this.apiKey ? `${this.apiKey}` : '',
          'X-Signature': signature,
        },
        body: JSON.stringify(orderPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const orderData = await response.json()
      return orderData as ElementPayOrderResponse
    } catch (error) {
      console.error('Order creation failed:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again')
        }
        throw error
      }
      throw new Error(ERROR_MESSAGES.ORDER_CREATION_FAILED)
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<ElementPayOrderResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VALIDATION.API_TIMEOUT)

      const response = await fetch(`${this.getAggregatorUrl()}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': `${this.apiKey}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const orderData = await response.json()
      return orderData as ElementPayOrderResponse
    } catch (error) {
      console.error('Failed to get order status:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again')
        }
        throw error
      }
      throw new Error('Failed to fetch order status')
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(
    userAddress: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ orders: ElementPayOrderResponse[]; total: number }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VALIDATION.API_TIMEOUT)

      const params = new URLSearchParams({
        user_address: userAddress,
        order_type: '1', // Off-ramp only
        limit: limit.toString(),
        offset: offset.toString(),
      })

      const response = await fetch(`${this.getAggregatorUrl()}/orders?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': `${this.apiKey}`,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()
      return {
        orders: data.orders || [],
        total: data.total || 0,
      }
    } catch (error) {
      console.error('Failed to get user orders:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again')
        }
        throw error
      }
      throw new Error('Failed to fetch user orders')
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<ElementPayOrderResponse> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), VALIDATION.API_TIMEOUT)

      const response = await fetch(`${this.getAggregatorUrl()}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-api-key': this.apiKey ? `${this.apiKey}` : '',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || 
          `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const orderData = await response.json()
      return orderData as ElementPayOrderResponse
    } catch (error) {
      console.error('Failed to cancel order:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again')
        }
        throw error
      }
      throw new Error('Failed to cancel order')
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`${this.getAggregatorUrl()}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  /**
   * Update API key
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  /**
   * Get current configuration
   */
  getConfig(): { baseUrl: string; aggregatorUrl: string; hasApiKey: boolean; environment: string } {
    return {
      baseUrl: ELEMENTPAY_CONFIG.getCurrentEnvironment() === 'sandbox' 
        ? process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1'
        : process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1',
      aggregatorUrl: this.getAggregatorUrl(),
      hasApiKey: !!this.apiKey,
      environment: ELEMENTPAY_CONFIG.getCurrentEnvironment(),
    }
  }
}

// Create singleton instance
export const elementPayApiClient = new ElementPayApiClient()

// Export for direct usage
export { ElementPayApiClient }
