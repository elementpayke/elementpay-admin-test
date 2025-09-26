"use client"

import AuthGuard from "@/components/auth/auth-guard"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import EnhancedApiKeyManager from "@/components/dashboard/enhanced-api-key-manager"

export default function ApiKeysPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Key Management</h1>
            <p className="text-muted-foreground">
              Create and manage your Element Pay API keys for secure integration.
            </p>
          </div>
          
          <EnhancedApiKeyManager />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

