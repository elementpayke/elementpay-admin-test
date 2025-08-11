import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying registration request:', { email: body.email, role: body.role })
    
    const response = await fetch('https://sandbox.elementpay.net/api/v1/auth/register', {
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
