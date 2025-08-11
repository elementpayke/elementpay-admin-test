import { NextRequest, NextResponse } from "next/server"

// Mock Element Pay API endpoint for testing
export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url)
  
  // Simulate API response delay
  await new Promise(resolve => setTimeout(resolve, 500))

  switch (pathname) {
    case "/api/mock-elementpay/health":
      return NextResponse.json({
        status: "healthy",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        service: "Element Pay Sandbox API"
      })

    default:
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 }
      )
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url)
  const body = await request.json().catch(() => ({}))
  
  // Simulate API response delay
  await new Promise(resolve => setTimeout(resolve, 800))

  switch (pathname) {
    case "/api/mock-elementpay/payments":
      return NextResponse.json({
        id: `pay_${Math.random().toString(36).substr(2, 9)}`,
        amount: body.amount || 1000,
        currency: body.currency || "USD",
        status: "pending",
        description: body.description || "Test payment",
        customer_email: body.customer_email,
        created_at: new Date().toISOString(),
        payment_method: "card"
      })

    case "/api/mock-elementpay/customers":
      return NextResponse.json({
        id: `cust_${Math.random().toString(36).substr(2, 9)}`,
        email: body.email,
        name: body.name,
        phone: body.phone,
        created_at: new Date().toISOString(),
        status: "active"
      })

    case "/api/mock-elementpay/transactions":
      return NextResponse.json({
        data: [
          {
            id: `txn_${Math.random().toString(36).substr(2, 9)}`,
            amount: 2500,
            currency: "USD",
            status: "completed",
            type: "payment",
            created_at: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: `txn_${Math.random().toString(36).substr(2, 9)}`,
            amount: 1200,
            currency: "USD",
            status: "pending",
            type: "payment",
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2
        }
      })

    default:
      return NextResponse.json(
        { error: "Endpoint not found" },
        { status: 404 }
      )
  }
}
