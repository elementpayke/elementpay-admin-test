import { NextResponse } from 'next/server'
import { aggregatorFetch, isSandboxFlag } from '@/lib/elementpay-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, sandbox } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const response = await aggregatorFetch('/auth/password/reset/request', {
      method: 'POST',
      sandbox: sandbox !== undefined ? isSandboxFlag(sandbox) : true,
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || 'Failed to send reset email' },
        { status: response.status }
      )
    }

    return NextResponse.json(
      { message: 'Password reset code has been sent to your email.' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
