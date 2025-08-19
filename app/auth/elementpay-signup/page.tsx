"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ElementPaySignupRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to NextAuth signup page
    router.replace("/auth/signup")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-lg">Redirecting to signup...</div>
    </div>
  )
}
