import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and verification code are required" }, { status: 400 })
    }

    // Proxy to Element Pay email verification endpoint
    const response = await fetch(`${process.env.ELEMENT_PAY_API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: error || "Email verification failed" }, { status: response.status })
    }

    return NextResponse.json({ message: "Email verified successfully." }, { status: 200 })
  } catch (error: any) {
    console.error("Error verifying email:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
