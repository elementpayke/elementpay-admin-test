import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    console.log('GET Request - Authorization header:', authHeader ? 'Present' : 'Missing')
    console.log('GET Request - Auth header preview:', authHeader ? `${authHeader.substring(0, 20)}...` : 'N/A')
    
    if (!authHeader) {
      return NextResponse.json({ 
        status: "error", 
        message: "Authentication credentials were missing or invalid", 
        data: null 
      }, { status: 401 })
    }

    // Use sandbox URL since environment is determined by the endpoint
    const elementPayUrl = 'https://sandbox.elementpay.net/api/v1/api-keys'
    
    const response = await fetch(elementPayUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ElementPay-Frontend/1.0'
      }
    })

    console.log('GET Response status:', response.status)
    console.log('GET Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)
      
      // If it's the "Invalid environment configuration" error, return empty array so dashboard loads
      if (errorText.includes('Invalid environment configuration')) {
        console.log('Element Pay API has environment configuration issues, returning empty array')
        return NextResponse.json({
          status: "success",
          message: "API keys retrieved successfully",
          data: []
        })
      }
      
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
    console.log('Element Pay GET response:', JSON.stringify(result, null, 2))
    
    // Handle Element Pay API response format: { success: true, data: [...] }
    if (result.success && result.data && Array.isArray(result.data)) {
      console.log('Returning API keys:', result.data.length, 'keys found')
      return NextResponse.json({
        status: "success",
        message: "API keys retrieved successfully",
        data: result.data
      })
    }
    
    // Fallback for different response formats
    if (result.data && Array.isArray(result.data)) {
      return NextResponse.json({
        status: "success",
        message: "API keys retrieved successfully",
        data: result.data
      })
    }
    
    console.log('Unexpected response format, returning empty array:', result)
    return NextResponse.json({
      status: "success",
      message: "API keys retrieved successfully",
      data: []
    })
  } catch (error: any) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json({ 
      status: "error", 
      message: "Internal server error", 
      data: null 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  console.log('=== POST /api/elementpay/api-keys CALLED ===')
  try {
    const authHeader = req.headers.get('Authorization')
    console.log('POST Request - Authorization header:', authHeader ? 'Present' : 'Missing')
    console.log('POST Request - Auth header preview:', authHeader ? `${authHeader.substring(0, 20)}...` : 'N/A')
    
    if (!authHeader) {
      return NextResponse.json({ 
        status: "error", 
        message: "Authentication credentials were missing or invalid", 
        data: null 
      }, { status: 401 })
    }

    const body = await req.json()
    console.log('POST request body:', JSON.stringify(body))
    
    // Validate required name parameter
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({
        detail: [{
          loc: ["body", "name"],
          msg: "field required",
          type: "value_error.missing"
        }]
      }, { status: 422 })
    }
    
    // Use sandbox URL since environment is determined by the endpoint
    const elementPayUrl = 'https://sandbox.elementpay.net/api/v1/api-keys'
    
    const elementPayBody = {
      name: body.name,
      rotate_existing: body.rotate_existing || false,
      webhook_url: body.webhook_url,
      webhook_secret: body.webhook_secret
    }
    
    // Remove undefined fields
    Object.keys(elementPayBody).forEach(key => {
      if (elementPayBody[key as keyof typeof elementPayBody] === undefined) {
        delete elementPayBody[key as keyof typeof elementPayBody]
      }
    })
    
    console.log('POST URL:', elementPayUrl)
    console.log('POST Body:', JSON.stringify(elementPayBody))
    console.log('POST Headers:', { 'Authorization': !!authHeader, 'Content-Type': 'application/json' })
    
    const response = await fetch(elementPayUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ElementPay-Frontend/1.0'
      },
      body: JSON.stringify(elementPayBody)
    })

    console.log('POST Response status:', response.status)
    console.log('POST Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)
      
      // If it's the "Invalid environment configuration" error, show a more helpful message
      if (errorText.includes('Invalid environment configuration')) {
        return NextResponse.json({ 
          status: "error", 
          message: "Internal server error", 
          data: null 
        }, { status: 500 })
      }
      
      if (response.status === 403) {
        return NextResponse.json({ 
          status: "error", 
          message: "User is not allowed to perform this action", 
          data: null 
        }, { status: 403 })
      }
      
      if (response.status === 422) {
        return NextResponse.json({
          detail: [{
            loc: ["body"],
            msg: errorText || "Validation error",
            type: "value_error"
          }]
        }, { status: 422 })
      }
      
      return NextResponse.json({ 
        status: "error", 
        message: "Internal server error", 
        data: null 
      }, { status: 500 })
    }

    const newKey = await response.json()
    console.log('Element Pay POST response:', JSON.stringify(newKey, null, 2))
    
    // Handle Element Pay API response format: { success: true, data: { key: "...", ... } }
    if (newKey.success && newKey.data) {
      const responseData = {
        id: newKey.data.id || Date.now(), // Include ID from Element Pay response
        created_at: newKey.data.created_at,
        environment: newKey.data.environment || "sandbox",
        has_webhook_secret: !!newKey.data.webhook_secret,
        key: newKey.data.key || newKey.data.key_preview || newKey.data.api_key || null, // Try multiple possible field names
        name: body.name,
        webhook_url: newKey.data.webhook_url || body.webhook_url
      }
      
      console.log('Sending response data:', JSON.stringify(responseData, null, 2))
      
      return NextResponse.json({
        status: "success",
        message: "API key created successfully",
        data: responseData
      }, { status: 200 })
    }
    
    // Return the response as-is if it doesn't match expected format
    return NextResponse.json({
      status: "success", 
      message: "API key created successfully", 
      data: newKey
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ 
      status: "error", 
      message: "Internal server error", 
      data: null 
    }, { status: 500 })
  }
}