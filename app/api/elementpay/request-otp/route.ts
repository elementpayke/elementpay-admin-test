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

    const response = await aggregatorFetch('/auth/request-otp', {
      method: 'POST',
      sandbox: isSandbox,
      body: JSON.stringify(body),
    })

    const data = await parseAggregatorJson(response)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Request OTP proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
