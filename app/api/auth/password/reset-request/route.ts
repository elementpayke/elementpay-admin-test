import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Proxy to Element Pay password reset request endpoint
    const response = await fetch(`${process.env.ELEMENT_PAY_API_BASE_URL}/auth/password/reset/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || "Failed to send reset email" },
        { status: response.status },
      )
    }

    return NextResponse.json(
      { message: "Password reset code has been sent to your email." },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error requesting password reset:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
