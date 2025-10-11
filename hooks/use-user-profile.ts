"use client"

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useEnvironment } from '@/hooks/use-environment'
import { useEffect, useRef } from 'react'

export interface UserProfile {
  email: string
  role: string
  id: number
  is_active: boolean
  kyc_verified: boolean
  created_at: string
  updated_at: string
}

interface UseUserProfileOptions {
  autoRefresh?: boolean
  refreshInterval?: number // seconds
}

export function useUserProfile(options: UseUserProfileOptions = {}) {
  const { makeAuthenticatedRequest, isAuthenticated } = useAuth()
  const { environment } = useEnvironment()
  const previousEnvironmentRef = useRef<string>(environment)

  const {
    autoRefresh = true,
    refreshInterval = 60 // Refresh every minute
  } = options

  const userProfileQuery = useQuery({
    queryKey: ['userProfile', environment],
    enabled: isAuthenticated && !!makeAuthenticatedRequest,
    staleTime: autoRefresh ? refreshInterval * 1000 : 0,
    queryFn: async () => {
      if (!makeAuthenticatedRequest) {
        throw new Error('Authentication not available')
      }

      try {
        const response = await makeAuthenticatedRequest('/api/elementpay/me', {
          method: 'GET',
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch user profile`)
        }

        const result = await response.json()
        
        // Handle different response formats
        if (result.data) {
          return result.data as UserProfile
        } else if (result.email) {
          return result as UserProfile
        } else {
          throw new Error('Invalid user profile response format')
        }
      } catch (error: any) {
        console.error('User profile fetch error:', error)
        throw error
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Refetch when environment changes
  useEffect(() => {
    if (previousEnvironmentRef.current !== environment && isAuthenticated && !!makeAuthenticatedRequest) {
      console.log('Environment changed from', previousEnvironmentRef.current, 'to', environment, '- refetching user profile')
      userProfileQuery.refetch()
      previousEnvironmentRef.current = environment
    }
  }, [environment, isAuthenticated, makeAuthenticatedRequest])

  return {
    userProfile: userProfileQuery.data,
    isLoading: userProfileQuery.isLoading,
    error: userProfileQuery.error?.message || null,
    refetch: userProfileQuery.refetch,
    
    // Convenience properties
    isKycVerified: userProfileQuery.data?.kyc_verified || false,
    canCreateLiveApiKeys: userProfileQuery.data?.kyc_verified || false,
    userRole: userProfileQuery.data?.role,
    isActive: userProfileQuery.data?.is_active || false,
  }
}


