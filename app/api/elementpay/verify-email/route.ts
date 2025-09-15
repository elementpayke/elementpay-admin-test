import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying email verification request for:', body.email)
    
    // Use live ElementPay API from environment variable
    const elementPayBaseUrl = process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://api.elementpay.net/api/v1'
    const verifyUrl = `${elementPayBaseUrl}/auth/verify-email`
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('Element Pay verify email API response status:', response.status)

    // Check content type to determine how to parse the response
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If it's not JSON, get the text response
      const textResponse = await response.text()
      console.log('Non-JSON verify email response from Element Pay:', textResponse)
      data = { error: textResponse || 'Unknown error from Element Pay API' }
    }

    if (!response.ok) {
      console.log('Element Pay verify email API error:', data)
      return NextResponse.json(data, { status: response.status })
    }

    console.log('Email verification successful')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Verify email proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
