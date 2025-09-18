import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated" && !!session
  const user = session?.user
  const elementPayToken = session?.elementPayToken
  const userProfile = session?.userProfile

  const logout = async () => {
    try {
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
  }

  const refreshSession = async () => {
    try {
      await update()
    } catch (error) {
      console.error("Session refresh error:", error)
    }
  }

  // Check if token needs refresh or has errors
  const hasTokenError = session?.error === 'RefreshTokenError'

  // Helper to make authenticated API calls
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    if (!elementPayToken) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${elementPayToken}`,
        'Content-Type': 'application/json',
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
        },
      })
      return retryResponse
    }

    return response
  }

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
