import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, sandbox } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log('Resending verification code for:', email)
    console.log('Resend verification request body:', { 
      email: email, 
      isSandbox: !!sandbox,
      bodyKeys: Object.keys(body)
    })

    // Choose the correct ElementPay API based on sandbox parameter
    const isSandbox = sandbox === true || sandbox === 'true'
    const elementPayBaseUrl = isSandbox 
      ? (process.env.NEXT_PUBLIC_ELEMENTPAY_SANDBOX_BASE || 'https://sandbox.elementpay.net/api/v1')
      : (process.env.NEXT_PUBLIC_ELEMENTPAY_LIVE_BASE || 'https://api.elementpay.net/api/v1')
    
    const resendUrl = `${elementPayBaseUrl}/auth/resend-verification`
    
    console.log('Using ElementPay URL:', resendUrl)
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'LIVE')
    
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
