import { NextRequest, NextResponse } from 'next/server'
import {
  aggregatorFetch,
  parseAggregatorJson,
} from '@/lib/elementpay-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    console.log('Proxying user info request')

    const response = await aggregatorFetch('/auth/me', {
      method: 'GET',
      request,
      headers: { Authorization: authHeader },
    })

    const data = await parseAggregatorJson(response)

    if (!response.ok) {
      console.log('Element Pay user info API error:', data)
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get user proxy error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
