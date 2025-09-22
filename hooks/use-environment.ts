'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Environment, 
  environmentManager, 
  getCurrentEnvironment, 
  switchEnvironment,
  getCurrentConfig
} from '@/lib/api-config'

/**
 * Hook for managing environment state across the application
 */
export function useEnvironment() {
  const [environment, setEnvironment] = useState<Environment>(() => getCurrentEnvironment())
  const [isLoading, setIsLoading] = useState(false)

  // Subscribe to environment changes
  useEffect(() => {
    const unsubscribe = environmentManager.subscribe((newEnv) => {
      setEnvironment(newEnv)
    })

    return unsubscribe
  }, [])

  // Handle environment switching with loading state
  const handleSwitchEnvironment = useCallback(async (newEnv: Environment) => {
    if (newEnv === environment) return

    setIsLoading(true)
    try {
      switchEnvironment(newEnv)
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error('Failed to switch environment:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [environment])

  // Toggle between sandbox and live
  const toggleEnvironment = useCallback(() => {
    const newEnv = environment === 'sandbox' ? 'live' : 'sandbox'
    return handleSwitchEnvironment(newEnv)
  }, [environment, handleSwitchEnvironment])

  // Switch to sandbox
  const switchToSandbox = useCallback(() => {
    return handleSwitchEnvironment('sandbox')
  }, [handleSwitchEnvironment])

  // Switch to live
  const switchToLive = useCallback(() => {
    return handleSwitchEnvironment('live')
  }, [handleSwitchEnvironment])

  return {
    // Current state
    environment,
    isLoading,
    isSandbox: environment === 'sandbox',
    isLive: environment === 'live',
    
    // Configuration
    config: getCurrentConfig(),
    baseUrl: getCurrentConfig().baseUrl,
    
    // Actions
    switchEnvironment: handleSwitchEnvironment,
    toggleEnvironment,
    switchToSandbox,
    switchToLive,
  }
}

/**
 * Hook for components that need to react to environment changes
 * but don't need to control the environment
 */
export function useEnvironmentState() {
  const [environment, setEnvironment] = useState<Environment>(() => getCurrentEnvironment())

  useEffect(() => {
    const unsubscribe = environmentManager.subscribe((newEnv) => {
      setEnvironment(newEnv)
    })

    return unsubscribe
  }, [])

  return {
    environment,
    isSandbox: environment === 'sandbox',
    isLive: environment === 'live',
    config: getCurrentConfig(),
    baseUrl: getCurrentConfig().baseUrl,
  }
}
