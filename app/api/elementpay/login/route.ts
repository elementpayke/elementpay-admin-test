import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying login request for:', body.email)
    console.log('Login request body (excluding password):', { 
      email: body.email, 
      hasPassword: !!body.password,
      passwordLength: body.password?.length,
      isSandbox: !!body.sandbox,
      bodyKeys: Object.keys(body)
    })
    
    // Ensure we're sending the exact format Element Pay expects
    const loginPayload = {
      email: body.email,
      password: body.password
    }
    
    console.log('Sending to Element Pay:', { 
      email: loginPayload.email, 
      hasPassword: !!loginPayload.password,
      sandbox: !!body.sandbox
    })
    
    // Choose the correct ElementPay API based on sandbox parameter
    const isSandbox = body.sandbox === true || body.sandbox === 'true'
    const elementPayBaseUrl = isSandbox 
      ? (process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1')
      : (process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1')
    
    const loginUrl = `${elementPayBaseUrl}/auth/login`
    
    console.log('Using ElementPay URL:', loginUrl)
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'LIVE')
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(loginPayload),
    })

    console.log('Element Pay login API response status:', response.status)
    console.log('Element Pay login API response headers:', Object.fromEntries(response.headers.entries()))

    // Check content type to determine how to parse the response
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If it's not JSON, get the text response
      const textResponse = await response.text()
      console.log('Non-JSON login response from Element Pay:', textResponse)
      data = { error: textResponse || 'Unknown error from Element Pay API' }
    }

    if (!response.ok) {
      console.log('Element Pay login API error:', data)
      console.log('Full error response body:', data)
      
      // For development: If Element Pay is having server issues (500), provide helpful error
      if (response.status === 500) {
        const envType = isSandbox ? 'sandbox' : 'live'
        console.log(`Element Pay ${envType} server error (500) - this could be due to:`)
        console.log(`1. Element Pay ${envType} server issues`)
        console.log('2. Invalid request format')
        console.log('3. Database connectivity issues on Element Pay side')
        console.log('4. Authentication service issues')
        
        // Try to provide more specific error information
        const errorMsg = typeof data === 'object' && data.detail ? data.detail : 
                        typeof data === 'string' ? data : 
                        `Element Pay ${envType} server error. The ${envType} environment may be experiencing issues.`
        
        return NextResponse.json({
          error: errorMsg,
          hint: `This appears to be a server-side issue with Element Pay's ${envType} environment. Please try again in a few minutes.`,
          environment: envType
        }, { status: 500 })
      }
      
      return NextResponse.json(data, { status: response.status })
    }

    console.log('Login successful')
    return NextResponse.json(data)
  } catch (error) {
    console.error('Login proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
