import { NextResponse } from "next/server"
import { verifyUserEmail } from "@/lib/mock-db"

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 })
    }

    const success = verifyUserEmail(email, code)

    if (!success) {
      return NextResponse.json({ error: "Invalid email or verification code" }, { status: 400 })
    }

    return NextResponse.json({ message: "Email verified successfully." }, { status: 200 })
  } catch (error: any) {
    console.error("Error verifying email:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
