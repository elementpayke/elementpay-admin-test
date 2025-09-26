"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/auth/login")
    }
  }, [status, session, router])

  if (status === "loading") {
    return fallback || (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <div className="text-lg font-medium">Loading...</div>
          <div className="text-sm text-muted-foreground">Verifying authentication</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to login
  }

  return <>{children}</>
}

