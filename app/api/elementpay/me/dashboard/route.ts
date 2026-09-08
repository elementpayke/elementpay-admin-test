import { NextRequest, NextResponse } from 'next/server'
import { aggregatorFetch } from '@/lib/elementpay-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Authentication credentials were missing or invalid',
          data: null,
        },
        { status: 401 }
      )
    }

    const response = await aggregatorFetch('/users/me/dashboard', {
      method: 'GET',
      request: req,
      headers: {
        Authorization: authHeader,
        'User-Agent': 'ElementPay-Frontend/1.0',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)

      if (response.status === 401) {
        return NextResponse.json(
          {
            status: 'error',
            message: 'Authentication credentials were missing or invalid',
            data: null,
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          status: 'error',
          message: 'Internal server error',
          data: null,
        },
        { status: 500 }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Internal server error',
        data: null,
      },
      { status: 500 }
    )
  }
}
