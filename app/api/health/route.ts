import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        elementpay_sandbox: process.env.NEXT_PRIVATE_ELEMENTPAY_SANDBOX_BASE ? 'configured' : 'not configured',
        elementpay_live: process.env.NEXT_PRIVATE_ELEMENTPAY_LIVE_BASE ? 'configured' : 'not configured',
        auth: process.env.AUTH_SECRET ? 'configured' : 'not configured'
      }
    }

    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
