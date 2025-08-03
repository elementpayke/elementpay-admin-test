import { NextResponse } from "next/server"
import { createApiKey, getApiKeysByUserId } from "@/lib/mock-db"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import type { Environment } from "@/lib/types"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const environment = searchParams.get("environment") as Environment

    const apiKeys = getApiKeysByUserId(session.user.id, environment)
    return NextResponse.json(apiKeys, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching API keys:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, environment } = await req.json()
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!environment || !["mainnet", "testnet"].includes(environment)) {
      return NextResponse.json({ error: "Valid environment is required" }, { status: 400 })
    }

    const newKey = createApiKey(session.user.id, name, environment)
    return NextResponse.json(newKey, { status: 201 })
  } catch (error: any) {
    console.error("Error creating API key:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
