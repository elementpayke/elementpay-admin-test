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

    console.log('Proxying password reset request for:', body.email)

    const response = await aggregatorFetch('/auth/password/reset/request', {
      method: 'POST',
      sandbox: isSandbox,
      body: JSON.stringify(body),
    })

    const data = await parseAggregatorJson(response)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Password reset request proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
