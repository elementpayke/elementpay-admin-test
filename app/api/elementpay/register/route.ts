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

    console.log('Proxying registration:', { email: body.email, role: body.role, sandbox: isSandbox })

    const response = await aggregatorFetch('/auth/register', {
      method: 'POST',
      sandbox: isSandbox,
      body: JSON.stringify(body),
    })

    const data = await parseAggregatorJson(response)

    if (!response.ok) {
      console.log('Element Pay register API error:', data)
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Registration proxy error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
