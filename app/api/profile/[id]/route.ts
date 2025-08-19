import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow users to access their own profile
    if (session.user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Return user data from session (Element Pay doesn't have profile endpoints)
    const userProfile = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      // Default profile fields since Element Pay doesn't store these
      phone: "",
      company: "",
      role: "Developer",
      isVerified: true, // Assume verified if they can log in
      createdAt: new Date().toISOString(), // Placeholder
    }
    
    return NextResponse.json(userProfile)
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only allow users to update their own profile
    if (session.user.id !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, company, role } = body

    // Validate input
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    // Since Element Pay doesn't have profile update endpoints,
    // we'll just validate the data and return success
    // In a real implementation, you might store this in a separate database
    // or update it through Element Pay if they add profile endpoints
    
    const updatedProfile = {
      id: session.user.id,
      email: session.user.email,
      name: name.trim(),
      phone: phone?.trim() || "",
      company: company?.trim() || "",
      role: role?.trim() || "Developer",
      isVerified: true,
      createdAt: new Date().toISOString(),
    }
    
    return NextResponse.json(updatedProfile)
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
