import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Proxy to Element Pay resend verification endpoint
    const elementPayBaseUrl = process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1'
    const resendUrl = `${elementPayBaseUrl}/auth/resend-verification`
    
    console.log('Resending verification code for:', email)
    console.log('Using ElementPay URL:', resendUrl)
    
    const response = await fetch(resendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || "Failed to resend verification code" },
        { status: response.status },
      )
    }

    return NextResponse.json({ message: "Verification code resent successfully." }, { status: 200 })
  } catch (error: any) {
    console.error("Error resending verification code:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
