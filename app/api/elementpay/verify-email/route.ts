import { NextRequest, NextResponse } from 'next/server'
import {
  aggregatorFetch,
  isSandboxFlag,
  parseAggregatorJson,
} from '@/lib/elementpay-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const isSandbox = isSandboxFlag(body.sandbox)

    console.log('Proxying email verification for:', body.email)

    const response = await aggregatorFetch('/auth/verify-email', {
      method: 'POST',
      sandbox: isSandbox,
      body: JSON.stringify(body),
    })

    const data = await parseAggregatorJson(response)

    if (!response.ok) {
      console.log('Element Pay verify email API error:', data)
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Verify email proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
