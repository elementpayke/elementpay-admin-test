import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    console.log('Proxying user info request')
    
    const response = await fetch('https://sandbox.elementpay.net/api/v1/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })

    console.log('Element Pay user info API response status:', response.status)

    // Check content type to determine how to parse the response
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If it's not JSON, get the text response
      const textResponse = await response.text()
      console.log('Non-JSON user info response from Element Pay:', textResponse)
      data = { error: textResponse || 'Unknown error from Element Pay API' }
    }

    if (!response.ok) {
      console.log('Element Pay user info API error:', data)
      return NextResponse.json(data, { status: response.status })
    }

    console.log('User info retrieved successfully')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Get user proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
