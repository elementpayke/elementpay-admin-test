import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, reset_code, new_password } = await req.json()

    if (!email || !reset_code || !new_password) {
      return NextResponse.json({ 
        error: "Email, reset code, and new password are required" 
      }, { status: 400 })
    }

    // Proxy to Element Pay password reset confirm endpoint
    const response = await fetch(`${process.env.ELEMENT_PAY_API_BASE_URL}/auth/password/reset/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, reset_code, new_password }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || "Failed to reset password" },
        { status: response.status },
      )
    }

    return NextResponse.json(
      { message: "Password has been reset successfully." },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
