import { NextRequest, NextResponse } from 'next/server'
import { aggregatorFetch, parseAggregatorJson } from '@/lib/elementpay-server'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const { keyId } = params

    const response = await aggregatorFetch(`/api-keys/${keyId}`, {
      method: 'DELETE',
      request: req,
      headers: { Authorization: authHeader },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Element Pay API error: ${response.status}` },
        { status: response.status }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const { keyId } = params
    const body = await req.json()

    const response = await aggregatorFetch(`/api-keys/${keyId}/webhook`, {
      method: 'PATCH',
      request: req,
      headers: { Authorization: authHeader },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Element Pay API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Element Pay API error: ${response.status}` },
        { status: response.status }
      )
    }

    const updatedKey = await parseAggregatorJson(response)
    return NextResponse.json(updatedKey, { status: 200 })
  } catch (error: unknown) {
    console.error('Error updating webhook:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
