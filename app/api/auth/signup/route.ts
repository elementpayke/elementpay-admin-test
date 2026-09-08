import { NextResponse } from 'next/server'
import { aggregatorFetch, isSandboxFlag } from '@/lib/elementpay-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, role, sandbox } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const response = await aggregatorFetch('/auth/register', {
      method: 'POST',
      sandbox: sandbox !== undefined ? isSandboxFlag(sandbox) : true,
      body: JSON.stringify({
        email,
        password,
        role: role || 'developer',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({ error: error || 'Signup failed' }, { status: response.status })
    }

    const data = await response.json()

    return NextResponse.json(
      {
        message: 'User created successfully. Please verify your email.',
        user: {
          id: data.id,
          email: data.email,
          role: data.role,
          is_active: data.is_active,
          kyc_verified: data.kyc_verified,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Error during signup:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
