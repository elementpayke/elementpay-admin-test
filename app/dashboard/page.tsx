import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import EnhancedApiKeyManager from "@/components/dashboard/enhanced-api-key-manager"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6">
        <EnhancedApiKeyManager />
      </main>
    </div>
  )
}
