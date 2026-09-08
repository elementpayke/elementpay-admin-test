import { NextRequest, NextResponse } from 'next/server'
import {
  aggregatorFetch,
  isSandboxFlag,
  parseAggregatorJson,
  resolveAggregatorBaseUrl,
} from '@/lib/elementpay-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const loginPayload = {
      email: body.email,
      password: body.password,
    }

    const isSandbox = isSandboxFlag(body.sandbox)
    const loginUrl = `${resolveAggregatorBaseUrl({ sandbox: isSandbox })}/auth/login`

    console.log('Proxying login for:', body.email, isSandbox ? 'SANDBOX' : 'LIVE')

    const response = await aggregatorFetch('/auth/login', {
      method: 'POST',
      sandbox: isSandbox,
      body: JSON.stringify(loginPayload),
    })

    const data = await parseAggregatorJson(response)

    if (!response.ok) {
      console.log('Element Pay login API error:', data)

      if (response.status === 500) {
        const envType = isSandbox ? 'sandbox' : 'live'
        const errorMsg =
          typeof data === 'object' && data !== null && 'detail' in data
            ? (data as { detail: unknown }).detail
            : typeof data === 'string'
              ? data
              : `Element Pay ${envType} server error. The ${envType} environment may be experiencing issues.`

        return NextResponse.json(
          {
            error: errorMsg,
            hint: `This appears to be a server-side issue with Element Pay's ${envType} environment. Please try again in a few minutes.`,
            environment: envType,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(data, { status: response.status })
    }

    console.log('Login successful via', loginUrl)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Login proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
