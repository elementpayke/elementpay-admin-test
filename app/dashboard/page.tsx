"use client"

import AuthGuard from "@/components/auth/auth-guard"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
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
} from "lucide-react"
import Link from "next/link"

// Mock data for dashboard stats
const mockStats = {
  totalTransactions: 127,
  pendingOrders: 3,
  settledAmount: 45620.50,
  totalVolume: 128450.75,
}

const mockRecentTransactions = [
  {
    id: "tx_1234567890",
    type: "onramp",
    amount: 1500,
    token: "BASE_USDC",
    status: "settled",
    date: "2024-01-15T10:30:00Z",
  },
  {
    id: "tx_0987654321",
    type: "offramp",
    amount: 2300,
    token: "ETH",
    status: "processing",
    date: "2024-01-15T09:15:00Z",
  },
  {
    id: "tx_1122334455",
    type: "onramp",
    amount: 850,
    token: "BASE_USDC",
    status: "pending",
    date: "2024-01-15T08:45:00Z",
  },
]

export default function DashboardPage() {
  const { user } = useAuth()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'User'}!
            </h1>
          <p className="text-muted-foreground">
              Here's an overview of your Element Pay activity and quick access to key features.
          </p>
        </div>


          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.totalTransactions}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStats.pendingOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Settled Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {mockStats.settledAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +8% from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {mockStats.totalVolume.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +15% from last month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts to get you started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Button asChild className="h-auto p-4 justify-start bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                  <Link href="/dashboard/transactions">
                    <div className="flex flex-col items-start space-y-1">
                      <div className="flex items-center space-x-2">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="font-medium">Create Order</span>
                      </div>
                      <span className="text-xs text-purple-100">
                        Buy or sell crypto instantly
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" asChild className="h-auto p-4 justify-start border-purple-200 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-900/20">
                  <Link href="/dashboard/disbursement">
                    <div className="flex flex-col items-start space-y-1">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="font-medium">Make Payment</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Pay with crypto via M-PESA
                      </span>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" asChild className="h-auto p-4 justify-start">
                  <Link href="/dashboard/api-keys">
                    <div className="flex flex-col items-start space-y-1">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="font-medium">Manage API Keys</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Create and manage your API keys
                      </span>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Your latest transaction activity
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/transactions">
                  View All
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <div className="font-medium">
                          {transaction.type === 'onramp' ? 'Buy' : 'Sell'} {transaction.token}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        KES {transaction.amount.toLocaleString()}
                      </div>
                      <Badge variant={
                        transaction.status === 'settled' ? 'default' :
                        transaction.status === 'processing' ? 'secondary' : 'outline'
                      }>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
    </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
