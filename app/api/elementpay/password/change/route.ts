import { NextRequest, NextResponse } from 'next/server'
import {
  aggregatorFetch,
  isSandboxFlag,
  parseAggregatorJson,
} from '@/lib/elementpay-server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const body = await request.json()
    const envOpts =
      body.sandbox !== undefined && body.sandbox !== null
        ? { sandbox: isSandboxFlag(body.sandbox) }
        : { request }

    const response = await aggregatorFetch('/auth/password/change', {
      method: 'POST',
      ...envOpts,
      headers: { Authorization: authHeader },
      body: JSON.stringify(body),
    })

    const data = await parseAggregatorJson(response)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Password change proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
