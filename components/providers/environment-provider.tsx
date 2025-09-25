'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  Environment,
  environmentManager,
  getCurrentEnvironment,
  switchEnvironment,
  getCurrentConfig,
  SERVER_DEFAULT_ENVIRONMENT
} from '@/lib/api-config'

interface EnvironmentContextType {
  // Current state
  environment: Environment
  isLoading: boolean
  isSandbox: boolean
  isLive: boolean

  // Configuration
  config: ReturnType<typeof getCurrentConfig>
  baseUrl: string

  // Actions
  switchEnvironment: (env: Environment) => Promise<void>
  toggleEnvironment: () => Promise<void>
  switchToSandbox: () => Promise<void>
  switchToLive: () => Promise<void>
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined)

interface EnvironmentProviderProps {
  children: ReactNode
  initialEnvironment?: Environment
}

/**
 * Environment Provider Component
 * Provides centralized environment management to the React component tree
 */
export function EnvironmentProvider({
  children,
  initialEnvironment = SERVER_DEFAULT_ENVIRONMENT
}: EnvironmentProviderProps) {
  const [environment, setEnvironment] = useState<Environment>(() => {
    // Try to get from environmentManager, fallback to initialEnvironment
    try {
      return getCurrentEnvironment()
    } catch {
      return initialEnvironment
    }
  })
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
      // Add a small delay to show loading state and ensure state propagation
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

  const contextValue: EnvironmentContextType = {
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

  return (
    <EnvironmentContext.Provider value={contextValue}>
      {children}
    </EnvironmentContext.Provider>
  )
}

/**
 * Hook to use environment context
 * Throws error if used outside EnvironmentProvider
 */
export function useEnvironment(): EnvironmentContextType {
  const context = useContext(EnvironmentContext)
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider')
  }
  return context
}

/**
 * Hook for components that only need to read environment state
 * but don't need to control environment switching
 */
export function useEnvironmentState() {
  const context = useEnvironment()
  return {
    environment: context.environment,
    isSandbox: context.isSandbox,
    isLive: context.isLive,
    config: context.config,
    baseUrl: context.baseUrl,
  }
}
