import { NextResponse } from 'next/server'
import { aggregatorFetch, isSandboxFlag } from '@/lib/elementpay-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, reset_code, new_password, sandbox } = body

    if (!email || !reset_code || !new_password) {
      return NextResponse.json(
        { error: 'Email, reset code, and new password are required' },
        { status: 400 }
      )
    }

    const response = await aggregatorFetch('/auth/password/reset/confirm', {
      method: 'POST',
      sandbox: sandbox !== undefined ? isSandboxFlag(sandbox) : true,
      body: JSON.stringify({ email, reset_code, new_password }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || 'Failed to reset password' },
        { status: response.status }
      )
    }

    return NextResponse.json(
      { message: 'Password has been reset successfully.' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
