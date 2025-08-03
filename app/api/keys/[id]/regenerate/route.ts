import { NextResponse } from "next/server"
import { regenerateApiKey } from "@/lib/mock-db"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const userId = session.user.id

    const regeneratedKey = regenerateApiKey(id, userId)

    if (!regeneratedKey) {
      return NextResponse.json({ error: "API key not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json(regeneratedKey, { status: 200 })
  } catch (error: any) {
    console.error("Error regenerating API key:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
