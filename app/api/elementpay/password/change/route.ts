import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })

    const body = await request.json()

    // Use live ElementPay API from environment variable
    const elementPayBaseUrl = process.env.NEXT_PRIVATE_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1'
    const changePasswordUrl = `${elementPayBaseUrl}/auth/password/change`
    
    const response = await fetch(changePasswordUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get('content-type')
    let data: any

    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { error: text || 'Unknown response from Element Pay' }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Password change proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
