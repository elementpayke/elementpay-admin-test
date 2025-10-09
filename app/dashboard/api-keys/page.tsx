"use client";

import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import EnhancedApiKeyManager from "@/components/dashboard/enhanced-api-key-manager";
import { useUserProfile } from "@/hooks/use-user-profile";

export default function ApiKeysPage() {
  // Trigger user profile fetch when page loads
  const { userProfile, isLoading: profileLoading } = useUserProfile();

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              API Key Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage your Element Pay API keys for secure
              integration.
            </p>
            {profileLoading && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">
                  Loading user profile...
                </span>
              </div>
            )}
          </div>

          <EnhancedApiKeyManager />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
