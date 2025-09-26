"use client"

import AuthGuard from "@/components/auth/auth-guard"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { useDashboard } from "@/hooks/use-dashboard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  RefreshCw,
  Coins,
  Wallet,
  Settings,
} from "lucide-react"
import Link from "next/link"

// Reusable components
const SummaryCard = ({ title, value, icon: Icon, growth, description }: {
  title: string
  value: string | number
  icon: any
  growth?: number
  description?: string
}) => (
  <Card className="bg-card border-border hover:bg-accent/50 transition-all duration-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-purple-500 dark:text-purple-400" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {(growth !== undefined || description) && (
        <div className="flex items-center space-x-2 mt-2">
          {growth !== undefined && growth > 0 && (
            <Badge className="bg-green-600 text-green-100 hover:bg-green-700 animate-pulse">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{growth}%
            </Badge>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </CardContent>
  </Card>
)

const ActionButton = ({ icon: Icon, title, description, href, gradient }: {
  icon: any
  title: string
  description: string
  href: string
  gradient: string
}) => (
  <Button
    asChild
    className={`h-auto p-6 justify-start ${gradient} hover:opacity-90 transition-all duration-200 text-white border-0 dark:text-white dark:hover:opacity-90`}
  >
    <Link href={href}>
      <div className="flex flex-col items-start space-y-2">
        <div className="flex items-center space-x-3">
          <Icon className="h-6 w-6 text-white/90" />
          <span className="font-semibold text-lg text-white">{title}</span>
        </div>
        <span className="text-sm text-white/80">
          {description}
        </span>
      </div>
    </Link>
  </Button>
)

const BreakdownCard = ({ title, icon: Icon, data, type }: {
  title: string
  icon: any
  data: any
  type: 'fiat' | 'crypto'
}) => (
  <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle className="text-lg text-foreground flex items-center space-x-2">
        <Icon className="h-5 w-5 text-purple-500 dark:text-purple-400" />
        <span>{title}</span>
      </CardTitle>
      <CardDescription className="text-muted-foreground">
        {type === 'fiat' ? 'Cash disbursement statistics' : 'Digital asset conversion statistics'}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {Object.entries(data).map(([key, value]: [string, any]) => {
        const displayName = type === 'fiat' ? key : key.replace('(Testnet)', '').replace('_', ' ')
        return (
          <div key={key} className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${type === 'fiat' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
              <span className="font-medium text-foreground">{displayName}</span>
              {value.weekly_growth > 0 && (
                <Badge className="bg-green-600 text-green-100 hover:bg-green-700 animate-pulse">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{value.weekly_growth}%
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-lg font-semibold text-foreground">
                  {type === 'fiat' ? `KES ${value.total_volume.toLocaleString()}` : `${value.total_volume.toFixed(6)}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Settled</p>
                <p className="text-lg font-semibold text-foreground">
                  {type === 'fiat' ? `KES ${value.settled_amount.toLocaleString()}` : `${value.settled_amount.toFixed(6)}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-lg font-semibold text-foreground">{value.transaction_count}</p>
              </div>
            </div>
          </div>
        )
      })}
    </CardContent>
  </Card>
)

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { dashboardData, isLoading, error, refetch } = useDashboard()

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500 dark:text-purple-400" />
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Extract data from dashboard API response
  // If there's an error or no data, show zeros
  const summaryData = dashboardData?.summary || {
    total_transactions: 0,
    pending_orders: 0,
    settled_orders: 0,
    total_currencies: 0,
    total_tokens: 0
  }

  const fiatBreakdown = dashboardData?.fiat_breakdown || {}
  const cryptoBreakdown = dashboardData?.crypto_breakdown || {}

  // Show error state with zeros when there's an error
  const hasError = error && !dashboardData

  // Quic                                                                                                                                                                                                                                                                                                                                                                                  k Actions configuration
  const quickActions = [
    // {
    //   icon: ArrowUpRight,
    //   title: "Create Order",
    //   description: "Buy or sell crypto instantly",
    //   href: "/dashboard/transactions",
    //   gradient: "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
    // },
    {
      icon: DollarSign,
      title: "Make Payment ",
      description: "Pay with crypto via M-PESA (Coming Soon)",
      href: "/dashboard",
      gradient: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
    },
    {
      icon: Settings,
      title: "Manage API Keys",
      description: "Create and manage your API keys",
      href: "/dashboard/api-keys",
      gradient: "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
    }
  ]

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8 bg-background min-h-screen">
          {/* Header Section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back, {user?.name || 'User'}!
              </h1>
                <p className="text-muted-foreground mt-2">
                  Here's an overview of your Element Pay activity and quick access to key features.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-purple-500 dark:text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
        </div>

          {/* Error State - Show only when explicitly needed */}
          {error && dashboardData && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="py-3 px-4">
                <div className="text-destructive text-sm">
                  Some data may be outdated: {error}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard
              title="Total Transactions"
              value={isLoading ? "..." : (hasError ? 0 : summaryData.total_transactions)}
              icon={Activity}
              growth={100}
            />

            <SummaryCard
              title="Pending Orders"
              value={isLoading ? "..." : (hasError ? 0 : summaryData.pending_orders)}
              icon={Clock}
              description="Awaiting processing"
            />

            <SummaryCard
              title="Settled Orders"
              value={isLoading ? "..." : (hasError ? 0 : summaryData.settled_orders)}
              icon={CheckCircle}
              growth={100}
              description="Successfully completed"
            />

            <SummaryCard
              title="Fiat Currencies"
              value={isLoading ? "..." : (hasError ? 0 : summaryData.total_currencies)}
              icon={DollarSign}
              description="Supported currencies"
            />

            <SummaryCard
              title="Crypto Tokens"
              value={isLoading ? "..." : (hasError ? 0 : summaryData.total_tokens)}
              icon={Coins}
              description="BASE network"
            />
          </div>

          {/* Breakdown Sections */}
          <div className="grid gap-6 md:grid-cols-1 xl:grid-cols-2">
            <BreakdownCard
              title="Fiat Currency Breakdown"
              icon={DollarSign}
              data={hasError ? {} : fiatBreakdown}
              type="fiat"
            />

            <BreakdownCard
              title="Crypto Token Breakdown"
              icon={Coins}
              data={hasError ? {} : cryptoBreakdown}
              type="crypto"
            />
          </div>
          {/* Quick Actions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
              <CardDescription className="text-muted-foreground">
                Common tasks and shortcuts to get you started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {quickActions.map((action, index) => (
                  <ActionButton key={index} {...action} />
                ))}
              </div>
            </CardContent>
          </Card>

         
    </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
