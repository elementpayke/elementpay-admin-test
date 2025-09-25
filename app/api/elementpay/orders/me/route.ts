import { NextRequest, NextResponse } from "next/server"
import { getServerBaseUrl } from "@/lib/api-config"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    console.log('GET /api/elementpay/orders - Authorization header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      return NextResponse.json({
        status: "error",
        message: "Authentication credentials were missing or invalid",
        data: null
      }, { status: 401 })
    }

    // Get environment from centralized configuration
    const elementPayBaseUrl = getServerBaseUrl(req)

    // Get query parameters from request
    const { searchParams } = new URL(req.url)

    // Build query string for Element Pay API
    const params = new URLSearchParams()

    // Forward query parameters to Element Pay API
    const statusFilter = searchParams.get('status_filter')
    const orderType = searchParams.get('order_type')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    if (statusFilter) params.set('status_filter', statusFilter)
    if (orderType) params.set('order_type', orderType)
    if (limit) params.set('limit', limit)
    if (offset) params.set('offset', offset)

    const queryString = params.toString()
    const elementPayUrl = `${elementPayBaseUrl}/users/me/orders${queryString ? `?${queryString}` : ''}`

    console.log('Element Pay Orders URL:', elementPayUrl)

    const response = await fetch(elementPayUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ElementPay-Frontend/1.0'
      }
    })

    console.log('Orders API Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)

      if (response.status === 401) {
        return NextResponse.json({
          status: "error",
          message: "Authentication credentials were missing or invalid",
          data: null
        }, { status: 401 })
      }

      return NextResponse.json({
        status: "error",
        message: "Internal server error",
        data: null
      }, { status: 500 })
    }

    const result = await response.json()
    console.log('Element Pay orders response:', JSON.stringify(result, null, 2))

    // Handle Element Pay API response format
    // ElementPay returns: { status: "success", data: { orders: [...], total: N, limit: N, offset: N, has_more: boolean } }
    if (result.status === "success" && result.data) {
      // Check if data has orders array (paginated response)
      if (result.data.orders && Array.isArray(result.data.orders)) {
        console.log('Returning orders:', result.data.orders.length, 'orders found')
        return NextResponse.json({
          status: "success",
          message: result.message || "Orders fetched successfully",
          data: result.data.orders  // Extract orders array from nested structure
        })
      }
      
      // Check if data is directly an array (non-paginated response)
      if (Array.isArray(result.data)) {
        console.log('Returning orders:', result.data.length, 'orders found')
        return NextResponse.json(result)
      }
    }

    // Fallback for other response formats
    if (result.data && Array.isArray(result.data)) {
      return NextResponse.json({
        status: "success",
        message: "Orders fetched successfully",
        data: result.data
      })
    }

    console.log('Unexpected response format, returning empty array:', result)
    return NextResponse.json({
      status: "success",
      message: "Orders fetched successfully",
      data: []
    })
  } catch (error: any) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({
      status: "error",
      message: "Internal server error",
      data: null
    }, { status: 500 })
  }
}
