import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email, password, role } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Proxy to Element Pay signup endpoint (register)
    const response = await fetch(`${process.env.ELEMENT_PAY_API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password,
        role: role || 'developer'  // Default to developer role
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: error || "Signup failed" }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(
      {
        message: "User created successfully. Please verify your email.",
        user: { 
          id: data.id, 
          email: data.email, 
          role: data.role,
          is_active: data.is_active,
          kyc_verified: data.kyc_verified
        },
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Error during signup:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
