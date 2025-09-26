"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'

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

  const {
    autoRefresh = true,
    refreshInterval = 30
  } = options

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    if (!makeAuthenticatedRequest) {
      console.error('makeAuthenticatedRequest not available')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await makeAuthenticatedRequest(
        '/api/elementpay/me/dashboard',
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()

      if (result.status === "success" && result.data) {
        setDashboardData(result.data)
      } else {
        throw new Error(result.message || 'Failed to fetch dashboard data')
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch dashboard data'
      setError(errorMessage)
      console.error('Dashboard fetch error:', error)
      toast({
        title: "Dashboard Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [makeAuthenticatedRequest, toast])

  // Fetch dashboard data on mount
  useEffect(() => {
    if (makeAuthenticatedRequest) {
      fetchDashboard()
    }
  }, [fetchDashboard, makeAuthenticatedRequest])

  // Auto refresh dashboard data
  useEffect(() => {
    if (!autoRefresh || !makeAuthenticatedRequest) return

    const interval = setInterval(() => {
      fetchDashboard()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [fetchDashboard, autoRefresh, refreshInterval, makeAuthenticatedRequest])

  return {
    dashboardData,
    isLoading,
    error,
    refetch: fetchDashboard,
  }
}
