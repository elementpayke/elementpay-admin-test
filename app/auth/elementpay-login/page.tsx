"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ElementPayLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to NextAuth login page
    router.replace("/auth/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">Redirecting to login...</div>
    </div>
  )
}
