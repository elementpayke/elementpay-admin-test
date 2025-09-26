import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying registration request:', { email: body.email, role: body.role })
    
    // Determine environment from request or default to sandbox for registration
    const isSandbox = body.sandbox === true || body.sandbox === 'true'
    const elementPayBaseUrl = isSandbox 
      ? (process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1')
      : (process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1')
    
    const registerUrl = `${elementPayBaseUrl}/auth/register`
    
    console.log('Using ElementPay URL:', registerUrl)
    
    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('Element Pay API response status:', response.status)
    console.log('Element Pay API response headers:', Object.fromEntries(response.headers.entries()))

    // Check content type to determine how to parse the response
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If it's not JSON, get the text response
      const textResponse = await response.text()
      console.log('Non-JSON response from Element Pay:', textResponse)
      data = { error: textResponse || 'Unknown error from Element Pay API' }
    }

    if (!response.ok) {
      console.log('Element Pay API error:', data)
      return NextResponse.json(data, { status: response.status })
    }

    console.log('Registration successful:', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Registration proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
