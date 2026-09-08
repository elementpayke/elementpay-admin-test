/**
 * Server-only ElementPay aggregator client (BFF).
 *
 * Always attach X-FE-Client-Secret from process.env.FE_CLIENT_SECRET.
 * Never import this module from client components — the secret must not
 * appear in NEXT_PUBLIC_* or the browser bundle.
 */

import {
  getServerBaseUrl,
  type Environment,
} from '@/lib/api-config'

export const FE_CLIENT_SECRET_HEADER = 'X-FE-Client-Secret'

const DEFAULT_SANDBOX_BASE = 'https://sandbox.elementpay.net/api/v1'
const DEFAULT_LIVE_BASE = 'https://api.elementpay.net/api/v1'

export function getFeClientSecret(): string | undefined {
  const secret = process.env.FE_CLIENT_SECRET
  return secret && secret.length > 0 ? secret : undefined
}

export function isSandboxFlag(value: unknown): boolean {
  return value === true || value === 'true'
}

export function resolveAggregatorBaseUrl(options?: {
  request?: Request
  sandbox?: boolean
  environment?: Environment
}): string {
  if (options?.environment === 'sandbox' || options?.sandbox === true) {
    return process.env.NEXT_PRIVATE_ELEMENTPAY_SANDBOX_BASE || DEFAULT_SANDBOX_BASE
  }
  if (options?.environment === 'live' || options?.sandbox === false) {
    return process.env.NEXT_PRIVATE_ELEMENTPAY_LIVE_BASE || DEFAULT_LIVE_BASE
  }
  if (options?.request) {
    return getServerBaseUrl(options.request)
  }
  // Optional single-base override (non-prod / simpler deploys)
  if (process.env.AGGREGATOR_BASE_URL) {
    return process.env.AGGREGATOR_BASE_URL
  }
  return getServerBaseUrl()
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return { ...headers }
}

/**
 * Build headers for aggregator calls. Always includes FE client secret when configured.
 */
export function buildAggregatorHeaders(
  extra?: HeadersInit,
  options?: { authorization?: string | null }
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headersToRecord(extra),
  }

  const secret = getFeClientSecret()
  if (secret) {
    headers[FE_CLIENT_SECRET_HEADER] = secret
  } else if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[elementpay-server] FE_CLIENT_SECRET is not set; auth issuance will fail when the aggregator has FE_CLIENT_SECRET_REQUIRED=true'
    )
  }

  if (options?.authorization) {
    headers.Authorization = options.authorization
  }

  // Never allow callers to override/strip the FE secret via extra headers
  if (secret) {
    headers[FE_CLIENT_SECRET_HEADER] = secret
  } else {
    delete headers[FE_CLIENT_SECRET_HEADER]
    delete headers['x-fe-client-secret']
  }

  return headers
}

export type AggregatorFetchOptions = RequestInit & {
  request?: Request
  sandbox?: boolean
  environment?: Environment
  /** Absolute URL overrides path joining */
  absoluteUrl?: string
}

/**
 * Server → aggregator fetch with X-FE-Client-Secret.
 * `path` is relative to the aggregator base (e.g. `/auth/login`).
 */
export async function aggregatorFetch(
  path: string,
  options: AggregatorFetchOptions = {}
): Promise<Response> {
  const { request, sandbox, environment, absoluteUrl, headers, ...fetchInit } = options
  const baseUrl = resolveAggregatorBaseUrl({ request, sandbox, environment })
  const url =
    absoluteUrl ||
    `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`

  return fetch(url, {
    ...fetchInit,
    headers: buildAggregatorHeaders(headers),
  })
}

export async function parseAggregatorJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }
  const text = await response.text()
  return { error: text || 'Unknown error from Element Pay API' }
}
