import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest, { params }: { params: { keyId: string } }) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const { keyId } = params

    // Forward request to Element Pay with user's Bearer token
    const elementPayBaseUrl = process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://api.elementpay.net/api/v1'
    const elementPayUrl = `${elementPayBaseUrl}/api-keys/${keyId}`
    
    const response = await fetch(elementPayUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader, // Forward user's Bearer token
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `Element Pay API error: ${response.status}` 
      }, { status: response.status })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error("Error deleting API key:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { keyId: string } }) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
    }

    const { keyId } = params
    const body = await req.json()

    // Forward request to Element Pay webhook endpoint with user's Bearer token
    const elementPayBaseUrl = process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://api.elementpay.net/api/v1'
    const elementPayUrl = `${elementPayBaseUrl}/api-keys/${keyId}/webhook`
    
    const response = await fetch(elementPayUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': authHeader, // Forward user's Bearer token
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)
      return NextResponse.json({ 
        error: `Element Pay API error: ${response.status}` 
      }, { status: response.status })
    }

    const updatedKey = await response.json()
    return NextResponse.json(updatedKey, { status: 200 })
  } catch (error: any) {
    console.error("Error updating webhook:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
