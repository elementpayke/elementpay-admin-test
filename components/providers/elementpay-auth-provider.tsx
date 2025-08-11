"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"
import { elementPayAPI, setElementPayEnvironment, getElementPayEnvironment } from "@/lib/utils"

interface User {
  id: number
  email: string
  role: string
  is_active: boolean
  kyc_verified: boolean
  created_at: string
  updated_at: string
}

interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>
  refreshAccessToken: () => Promise<boolean>
  environment: 'sandbox' | 'live'
  switchEnvironment: (env: 'sandbox' | 'live') => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useElementPayAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useElementPayAuth must be used within an ElementPayAuthProvider")
  }
  return context
}

interface ElementPayAuthProviderProps {
  children: ReactNode
}

export function ElementPayAuthProvider({ children }: ElementPayAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('elementpay_env')
      if (stored === 'live') return 'live'
    }
    // fallback to util's env
    return getElementPayEnvironment().active === 'live' ? 'live' : 'sandbox'
  })

  const tokenStorageKey = useCallback((env: 'sandbox' | 'live') => `elementpay_tokens_${env}`, [])

  // Initialize runtime environment in utils
  useEffect(() => {
    setElementPayEnvironment(environment)
  }, [environment])

  // Load tokens for current environment on mount & when environment changes
  useEffect(() => {
    const key = tokenStorageKey(environment)
    const storedTokens = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    if (storedTokens) {
      try {
        const parsedTokens = JSON.parse(storedTokens)
        setTokens(parsedTokens)
        loadUserProfile(parsedTokens.access_token)
        return
      } catch (e) {
        console.warn('Failed parsing stored tokens', e)
      }
    }
    // No tokens for this environment
    setTokens(null)
    setUser(null)
    setIsLoading(false)
  }, [environment, tokenStorageKey])

  // Persist tokens per environment
  useEffect(() => {
    const currentKey = tokenStorageKey(environment)
    if (tokens) {
      localStorage.setItem(currentKey, JSON.stringify(tokens))
    } else {
      localStorage.removeItem(currentKey)
    }
  }, [tokens, environment, tokenStorageKey])

  const switchEnvironment = async (env: 'sandbox' | 'live') => {
    if (env === environment) return
    setIsLoading(true)
    localStorage.setItem('elementpay_env', env)
    setEnvironment(env)
  }

  const loadUserProfile = async (accessToken: string, clearTokensOnError: boolean = true) => {
    try {
      const userProfile = await elementPayAPI.getCurrentUser(accessToken)
      setUser(userProfile)
    } catch (error) {
      console.error("Failed to load user profile:", error)
      if (clearTokensOnError) {
        setTokens(null)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const extractDetail = (err: any): string | undefined => {
    try {
      const msg: string = String(err?.message || "")
      const idx = msg.indexOf("{")
      if (idx >= 0) {
        const json = JSON.parse(msg.slice(idx))
        if (json?.detail) return typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail)
      }
    } catch {}
    return undefined
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      const response = await elementPayAPI.login({ email, password })
      const authTokens: AuthTokens = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        token_type: response.token_type
      }
      setTokens(authTokens)
      try {
        await loadUserProfile(authTokens.access_token, false)
      } catch (profileError) {
        console.warn("Failed to load user profile after login, but login was successful:", profileError)
      }
      return { success: true }
    } catch (error: any) {
      console.error("Login failed:", error)
      const detail = extractDetail(error)
      return { success: false, error: detail || error.message || "Login failed. Please check your credentials." }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, role: string = "developer"): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      console.log("Registering with:", { email, password: "***", role }) // Debug log
      await elementPayAPI.register({ email, password, role })
      
      return { success: true }
    } catch (error: any) {
      console.error("Registration failed:", error)
      const detail = extractDetail(error)
      return {
        success: false,
        error: detail || error.message || "Registration failed. Please try again."
      }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyEmail = async (email: string, verification_code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)
      await elementPayAPI.verifyEmail({ email, verification_code })
      
      return { success: true }
    } catch (error: any) {
      console.error("Email verification failed:", error)
      const detail = extractDetail(error)
      return {
        success: false,
        error: detail || error.message || "Email verification failed. Please check your code."
      }
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!tokens?.refresh_token) return false
    try {
      const response = await elementPayAPI.refreshToken({ refresh_token: tokens.refresh_token })
      const newTokens: AuthTokens = {
        access_token: response.access_token,
        refresh_token: response.refresh_token,
        token_type: response.token_type
      }
      setTokens(newTokens)
      return true
    } catch (error) {
      console.error("Token refresh failed:", error)
      logout()
      return false
    }
  }

  const logout = () => {
    setTokens(null)
    setUser(null)
    // Clear only current environment tokens
    localStorage.removeItem(tokenStorageKey(environment))
  }

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    register,
    logout,
    verifyEmail,
    refreshAccessToken,
    environment,
    switchEnvironment,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
