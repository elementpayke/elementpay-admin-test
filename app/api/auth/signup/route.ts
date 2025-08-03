import { NextResponse } from "next/server"
import { createUser } from "@/lib/mock-db"

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 })
    }

    const user = createUser(name, email, password)

    if (!user) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    return NextResponse.json(
      {
        message: "User created successfully. Please verify your email.",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 },
    )
  } catch (error: any) {
    console.error("Error during signup:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
