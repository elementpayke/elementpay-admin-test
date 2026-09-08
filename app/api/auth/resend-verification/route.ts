import { NextResponse } from 'next/server'
import {
  aggregatorFetch,
  isSandboxFlag,
  parseAggregatorJson,
} from '@/lib/elementpay-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, sandbox } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const isSandbox = isSandboxFlag(sandbox)
    console.log('Resending verification code for:', email, isSandbox ? 'SANDBOX' : 'LIVE')

    const response = await aggregatorFetch('/auth/resend-verification', {
      method: 'POST',
      sandbox: isSandbox,
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const data = await parseAggregatorJson(response)
      const error =
        typeof data === 'object' && data !== null && 'error' in data
          ? String((data as { error: unknown }).error)
          : 'Failed to resend verification code'
      return NextResponse.json({ error }, { status: response.status })
    }

    return NextResponse.json(
      { message: 'Verification code resent successfully.' },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error resending verification code:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
