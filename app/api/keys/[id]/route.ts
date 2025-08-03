import { NextResponse } from "next/server"
import { deleteApiKey } from "@/lib/mock-db"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const userId = session.user.id

    const success = deleteApiKey(id, userId)

    if (!success) {
      return NextResponse.json({ error: "API key not found or unauthorized" }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error("Error deleting API key:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
