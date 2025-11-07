import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying password reset request for:', body.email)
    console.log('Password reset request body:', { 
      email: body.email, 
      isSandbox: !!body.sandbox,
      bodyKeys: Object.keys(body)
    })

    // Choose the correct ElementPay API based on sandbox parameter
    const isSandbox = body.sandbox === true || body.sandbox === 'true'
    const elementPayBaseUrl = isSandbox 
      ? (process.env.NEXT_PRIVATE_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1')
      : (process.env.NEXT_PRIVATE_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1')
    
    const resetRequestUrl = `${elementPayBaseUrl}/auth/password/reset/request`
    
    console.log('Using ElementPay URL:', resetRequestUrl)
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'LIVE')
    
    const response = await fetch(resetRequestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
    console.error('Password reset request proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
