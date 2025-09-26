import type { ApiOrder, OrderStatus } from "./types"
import { getCurrentEnvironment } from "./api-config"

interface OrdersClientConfig {
  fetch?: typeof fetch
}

interface OrdersFilter {
  status_filter?: OrderStatus | null
  order_type?: "onramp" | "offramp" | null
  limit?: number
  offset?: number
}

const DEFAULT_HEADERS: HeadersInit = {
  'Content-Type': 'application/json'
}

/**
 * Get headers with current environment
 */
function getHeadersWithEnvironment(additionalHeaders?: HeadersInit): HeadersInit {
  return {
    ...DEFAULT_HEADERS,
    'x-elementpay-environment': getCurrentEnvironment(),
    ...additionalHeaders
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type')
  let body: any = null

  console.log('handleResponse - status:', res.status, 'content-type:', contentType)

  if (contentType && contentType.includes('application/json')) {
    try {
      body = await res.json()
      console.log('handleResponse - parsed JSON body:', JSON.stringify(body, null, 2))
    } catch (error) {
      console.error('handleResponse - failed to parse JSON:', error)
      body = null
    }
  } else {
    try {
      body = await res.text()
      console.log('handleResponse - text body:', body)
    } catch (error) {
      console.error('handleResponse - failed to read text:', error)
      body = null
    }
  }

  if (!res.ok) {
    const message = (body && (body.error || body.message || body.detail)) || `Request failed (${res.status})`
    console.error('handleResponse - request failed:', message)
    throw new Error(message)
  }

  console.log('handleResponse - returning body as T:', body)
  return body as T
}

/**
 * Orders client for fetching user orders
 */
export const ordersClient = (config: OrdersClientConfig = {}) => {
  const fetchImpl = config.fetch || fetch

  return {
    /**
     * List orders for the authenticated user
     */
    async list(filters: OrdersFilter = {}, userToken?: string, isSandbox: boolean = true): Promise<ApiOrder[]> {
      if (!userToken) {
        throw new Error('User authentication token is required')
      }

      // Build URL with query parameters
      const params = new URLSearchParams()

      // Add sandbox parameter for environment
      params.set('sandbox', isSandbox.toString())

      // Add filter parameters
      if (filters.status_filter) params.set('status_filter', filters.status_filter)
      if (filters.order_type) params.set('order_type', filters.order_type)
      if (filters.limit) params.set('limit', filters.limit.toString())
      if (filters.offset) params.set('offset', filters.offset.toString())

      const url = `/api/elementpay/orders/me?${params.toString()}`

      console.log('Fetching orders from:', url)
      console.log('Filters:', filters)

      const res = await fetchImpl(url, {
        headers: getHeadersWithEnvironment({
          'Authorization': `Bearer ${userToken}`
        })
      })

      const response = await handleResponse<{
        status: string
        message: string
        data: ApiOrder[] | { orders: ApiOrder[], total: number, limit: number, offset: number, has_more: boolean }
      }>(res)

      console.log('Orders client received response:', response)

      // Return the full response object so the component can access both orders and pagination metadata
      return response
    }
  }
}

export type OrdersClient = ReturnType<typeof ordersClient>
