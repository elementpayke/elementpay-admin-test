import { NextRequest, NextResponse } from "next/server"
import { getServerBaseUrl } from "@/lib/api-config"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    console.log('GET /api/elementpay/me/dashboard - Authorization header:', authHeader ? 'Present' : 'Missing')

    if (!authHeader) {
      return NextResponse.json({
        status: "error",
        message: "Authentication credentials were missing or invalid",
        data: null
      }, { status: 401 })
    }

    // Get environment from centralized configuration
    const elementPayBaseUrl = getServerBaseUrl(req)

    const elementPayUrl = `${elementPayBaseUrl}/users/me/dashboard`

    console.log('Element Pay Dashboard URL:', elementPayUrl)

    const response = await fetch(elementPayUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ElementPay-Frontend/1.0'
      }
    })

    console.log('Dashboard API Response status:', response.status)

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
    console.log('Element Pay dashboard response:', JSON.stringify(result, null, 2))

    // Return the dashboard data as-is from Element Pay API
    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching dashboard:", error)
    return NextResponse.json({
      status: "error",
      message: "Internal server error",
      data: null
    }, { status: 500 })
  }
}
