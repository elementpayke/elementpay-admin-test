"use client";

import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import ProfileForm from "@/components/dashboard/profile-form";
import { useUserProfile } from "@/hooks/use-user-profile";

export default function ProfilePage() {
  // Trigger user profile fetch when page loads
  const { userProfile, isLoading: profileLoading } = useUserProfile();

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Profile Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account settings and personal information.
            </p>
          </div>

          <ProfileForm />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
