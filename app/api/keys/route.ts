import { NextRequest, NextResponse } from "next/server"
import { createApiKey, getApiKeysByUserId } from "@/lib/mock-db"
import type { Environment } from "@/lib/types"

// Helper function to extract user ID from Element Pay token
async function getUserFromToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  
  // For mock tokens, return a mock user ID
  if (token === 'mock.jwt.token.for.testing') {
    return { id: 'mock-user-123', email: 'user@example.com' }
  }

  // For real tokens, we could validate with Element Pay API
  // For now, we'll extract user info from the token (this is simplified)
  try {
    // In a real implementation, you'd validate the token with Element Pay
    // and get the actual user ID. For now, we'll use a mock approach.
    return { id: 'elementpay-user-' + token.slice(-10), email: 'user@elementpay.com' }
  } catch (error) {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    const user = await getUserFromToken(authHeader)
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized - Valid Element Pay token required" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const environment = searchParams.get("environment") as Environment

    // For now, only allow testnet
    if (environment && environment !== "testnet") {
      return NextResponse.json({ error: "Only testnet environment is currently supported" }, { status: 400 })
    }

    const apiKeys = getApiKeysByUserId(user.id, environment || "testnet")
    return NextResponse.json(apiKeys, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    const user = await getUserFromToken(authHeader)
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized - Valid Element Pay token required" }, { status: 401 })
    }

    const { name, environment } = await req.json()
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // For now, only allow testnet
    const targetEnvironment = environment || "testnet"
    if (targetEnvironment !== "testnet") {
      return NextResponse.json({ error: "Only testnet environment is currently supported" }, { status: 400 })
    }

    const newKey = createApiKey(user.id, name, targetEnvironment)
    return NextResponse.json(newKey, { status: 201 })
  } catch (error: any) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
