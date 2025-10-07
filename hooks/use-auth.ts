import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useCallback } from "react"
import { getCurrentEnvironment } from "@/lib/api-config"
import { useWallet } from "@/components/providers/wallet-provider"

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { disconnectWallet, isConnected } = useWallet()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated" && !!session
  const user = session?.user
  const elementPayToken = session?.elementPayToken
  const userProfile = session?.userProfile

  const logout = useCallback(async () => {
    try {
      // Disconnect wallet if connected
      if (isConnected) {
        disconnectWallet()
      }
      
      await signOut({
        redirect: false,
        callbackUrl: "/"
      })
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Logout Failed",
        description: "There was an error logging you out. Please try again.",
      })
    }
  }, [toast, router, disconnectWallet, isConnected])

  const refreshSession = useCallback(async () => {
    try {
      await update()
    } catch (error) {
      console.error("Session refresh error:", error)
    }
  }, [update])

  // Check if token needs refresh or has errors
  const hasTokenError = session?.error === 'RefreshTokenError'

  // Helper to make authenticated API calls
  const makeAuthenticatedRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!elementPayToken) {
      throw new Error('No authentication token available')
    }

    const currentEnvironment = getCurrentEnvironment()

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${elementPayToken}`,
        'Content-Type': 'application/json',
        'x-elementpay-environment': currentEnvironment,
      },
    })

    // If token is expired, try to refresh
    if (response.status === 401 && !hasTokenError) {
      await refreshSession()
      // Retry the request with potentially new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${session?.elementPayToken}`,
          'Content-Type': 'application/json',
          'x-elementpay-environment': currentEnvironment,
        },
      })
      return retryResponse
    }

    return response
  }, [elementPayToken, hasTokenError, refreshSession, session?.elementPayToken])

  return {
    // Session state
    session,
    user,
    userProfile,
    elementPayToken,
    isLoading,
    isAuthenticated,
    hasTokenError,
    
    // Actions
    logout,
    refreshSession,
    makeAuthenticatedRequest,
  }
}

// Helper hook for protected routes
export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  if (!auth.isLoading && !auth.isAuthenticated) {
    router.push("/auth/login")
    return null
  }

  return auth
}
