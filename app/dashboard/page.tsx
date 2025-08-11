"use client"

import { useElementPayAuth } from "@/components/providers/elementpay-auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import EnhancedApiKeyManager from "@/components/dashboard/enhanced-api-key-manager"
import ApiTester from "@/components/dashboard/api-tester"

export default function DashboardPage() {
  const { user, tokens, isLoading } = useElementPayAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !tokens) {
      router.push("/auth/login")
    }
  }, [isLoading, tokens, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!tokens) {
    return null // Will redirect to login
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your API keys and test Element Pay integration
          </p>
        </div>
        <EnhancedApiKeyManager />
        <ApiTester />
      </main>
    </div>
  )
}
