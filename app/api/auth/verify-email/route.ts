import { NextResponse } from 'next/server'
import { aggregatorFetch, isSandboxFlag } from '@/lib/elementpay-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, code, sandbox } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    const response = await aggregatorFetch('/auth/verify-email', {
      method: 'POST',
      sandbox: sandbox !== undefined ? isSandboxFlag(sandbox) : true,
      body: JSON.stringify({ email, code }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || 'Email verification failed' },
        { status: response.status }
      )
    }

    return NextResponse.json({ message: 'Email verified successfully.' }, { status: 200 })
  } catch (error: unknown) {
    console.error('Error verifying email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
