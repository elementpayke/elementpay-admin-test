"use client"

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useEnvironment } from '@/hooks/use-environment'
import { getCurrentEnvironment } from '@/lib/api-config'
import { useEffect, useRef } from 'react'

export interface DashboardSummary {
  total_transactions: number
  pending_orders: number
  settled_orders: number
  total_currencies: number
  total_tokens: number
}

export interface CurrencyBreakdown {
  total_volume: number
  settled_amount: number
  transaction_count: number
  weekly_growth: number
}

export interface DashboardData {
  summary: DashboardSummary
  fiat_currencies: string[]
  crypto_tokens: string[]
  fiat_breakdown: Record<string, CurrencyBreakdown>
  crypto_breakdown: Record<string, CurrencyBreakdown>
}

interface UseDashboardOptions {
  autoRefresh?: boolean
  refreshInterval?: number // seconds
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { makeAuthenticatedRequest } = useAuth()
  const { toast } = useToast()
  const { environment: apiConfigEnvironment } = useEnvironment()
  const previousEnvironmentRef = useRef<string>(apiConfigEnvironment)

  const {
    autoRefresh = true,
    refreshInterval = 30
  } = options

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', apiConfigEnvironment],
    enabled: !!makeAuthenticatedRequest,
    staleTime: autoRefresh ? refreshInterval * 1000 : 0, // Cache for refresh interval duration
    queryFn: async () => {
      if (!makeAuthenticatedRequest) {
        throw new Error('Authentication not available')
      }

      try {
        const response = await makeAuthenticatedRequest(
          '/api/elementpay/me/dashboard',
          {
            method: 'GET',
            headers: {
              'x-elementpay-environment': getCurrentEnvironment()
            }
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch dashboard data`)
        }

        const result = await response.json()

        if (result.status === "success" && result.data) {
          return result.data
        } else {
          throw new Error(result.message || 'Failed to fetch dashboard data')
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Failed to fetch dashboard data'
        console.error('Dashboard fetch error:', error)

        // Show error toast
        toast({
          title: "Dashboard Error",
          description: errorMessage,
          type: "destructive",
        })

        // Return default data structure with zeros
        return {
          summary: {
            total_transactions: 0,
            pending_orders: 0,
            settled_orders: 0,
            total_currencies: 0,
            total_tokens: 0
          },
          fiat_currencies: [],
          crypto_tokens: [],
          fiat_breakdown: {},
          crypto_breakdown: {}
        }
      }
    },
    // Refetch on environment change
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Refetch when environment changes
  useEffect(() => {
    if (previousEnvironmentRef.current !== apiConfigEnvironment && !!makeAuthenticatedRequest) {
      console.log('Environment changed from', previousEnvironmentRef.current, 'to', apiConfigEnvironment, '- refetching dashboard data')
      dashboardQuery.refetch()
      previousEnvironmentRef.current = apiConfigEnvironment
    }
  }, [apiConfigEnvironment, makeAuthenticatedRequest])

  return {
    dashboardData: dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error?.message || null,
    refetch: dashboardQuery.refetch,
  }
}
