import { NextRequest, NextResponse } from "next/server"

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

    // Get environment from query parameter or default to sandbox
    const { searchParams } = new URL(req.url)
    const isSandbox = searchParams.get('sandbox') === 'true'
    const elementPayBaseUrl = isSandbox
      ? (process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1')
      : (process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1')

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
    const elementPayUrl = `${elementPayBaseUrl}/orders/me${queryString ? `?${queryString}` : ''}`

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

    // Handle Element Pay API response format: { status: "success", message: "...", data: [...] }
    if (result.status === "success" && result.data && Array.isArray(result.data)) {
      console.log('Returning orders:', result.data.length, 'orders found')
      return NextResponse.json(result)
    }

    // Fallback for different response formats
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
