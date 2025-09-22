"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import AuthGuard from "@/components/auth/auth-guard"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Search,
  Filter,
  Download,
  ExternalLink,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Eye,
  Loader2,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ordersClient } from "@/lib/orders-client"
import { useEnvironment } from "@/hooks/use-environment"
import type { ApiOrder, Order, OrderType, CashoutType, Token, Currency, OrderStatus } from "@/lib/types"

// We'll use actual API data

// Helper function to convert ApiOrder to Order format
const convertApiOrderToOrder = (apiOrder: ApiOrder): Order => {
  return {
    id: apiOrder.order_id,
    user_address: apiOrder.wallet_address,
    token: apiOrder.token as Token,
    order_type: apiOrder.order_type === "OnRamp" ? 0 : 1,
    status: apiOrder.status,
    amount_crypto: apiOrder.amount_crypto,
    amount_fiat: apiOrder.amount_fiat,
    exchange_rate: apiOrder.exchange_rate,
    transaction_hash: apiOrder.creation_transaction_hash || apiOrder.settlement_transaction_hash,
    fiat_payload: {
      amount_fiat: apiOrder.amount_fiat,
      cashout_type: "PHONE" as CashoutType, // Default, API doesn't provide this
      phone_number: apiOrder.phone_number,
      reference: apiOrder.file_id || apiOrder.invoice_id || "",
      currency: apiOrder.currency,
      narrative: "",
      client_ref: "",
    },
    created_at: apiOrder.created_at,
    updated_at: apiOrder.updated_at || apiOrder.created_at,
  }
}

export default function TransactionsPage() {
  const { user } = useAuth()
  const { data: session } = useSession()
  const { toast } = useToast()
  const { environment: apiConfigEnvironment, isSandbox } = useEnvironment()

  const client = useMemo(() => ordersClient(), [])
  const token = session?.elementPayToken as string | undefined

  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [orderTypeFilter, setOrderTypeFilter] = useState("all")
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)

  // Fetch orders using React Query
  const ordersQuery = useQuery({
    queryKey: ["orders", { statusFilter, orderTypeFilter, limit, offset, environment: apiConfigEnvironment }],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated")

      const filters = {
        ...(statusFilter !== "all" && { status_filter: statusFilter as OrderStatus }),
        ...(orderTypeFilter !== "all" && { order_type: orderTypeFilter as "onramp" | "offramp" }),
        limit,
        offset,
      }

      const apiOrders = await client.list(filters, token, isSandbox)
      return apiOrders.map(convertApiOrderToOrder)
    },
  })

  const transactions = ordersQuery.data || []

  // Form state for order creation
  const [orderForm, setOrderForm] = useState({
    token: "BASE_USDC" as Token,
    orderType: 0 as OrderType,
    amountFiat: "",
    cashoutType: "PHONE" as CashoutType,
    phoneNumber: "",
    tillNumber: "",
    paybillNumber: "",
    accountNumber: "",
    reference: "",
    narrative: "",
    clientRef: "",
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SETTLED':
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'SETTLED_UNVERIFIED':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      SETTLED: "default",
      COMPLETED: "default",
      PROCESSING: "secondary",
      PENDING: "outline",
      FAILED: "destructive",
      CANCELLED: "secondary",
      REFUNDED: "secondary",
      SETTLED_UNVERIFIED: "outline",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const handleCreateOrder = async () => {

    // Validate form
    if (!orderForm.amountFiat || !orderForm.phoneNumber || !orderForm.reference) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields."
      })
      return
    }

    try {
      // Mock API call - replace with actual API integration
      const orderPayload = {
        user_address: "demo-address",
        token: orderForm.token,
        order_type: orderForm.orderType,
        fiat_payload: {
          amount_fiat: parseFloat(orderForm.amountFiat),
          cashout_type: orderForm.cashoutType,
          phone_number: orderForm.phoneNumber,
          ...(orderForm.cashoutType === "TILL" && { till_number: orderForm.tillNumber }),
          ...(orderForm.cashoutType === "PAYBILL" && { 
            paybill_number: orderForm.paybillNumber,
            account_number: orderForm.accountNumber 
          }),
          reference: orderForm.reference,
          currency: "KES" as Currency,
          narrative: orderForm.narrative || "Crypto transaction",
          client_ref: orderForm.clientRef || `CLI_${Date.now()}`,
        },
      }

      console.log("Creating order:", orderPayload)

      toast({
        title: "Order Created",
        description: "Your order has been submitted successfully.",
      })

      setIsCreateOrderOpen(false)
      // Reset form
      setOrderForm({
        token: "BASE_USDC",
        orderType: 0,
        amountFiat: "",
        cashoutType: "PHONE",
        phoneNumber: "",
        tillNumber: "",
        paybillNumber: "",
        accountNumber: "",
        reference: "",
        narrative: "",
        clientRef: "",
      })
    } catch (error) {
      console.error("Order creation error:", error)
      toast({
        title: "Order Failed",
        description: "Failed to create order. Please try again.",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.transaction_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.fiat_payload.phone_number?.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
    const matchesOrderType = orderTypeFilter === "all" ||
      (orderTypeFilter === "onramp" && transaction.order_type === 0) ||
      (orderTypeFilter === "offramp" && transaction.order_type === 1)

    return matchesSearch && matchesStatus && matchesOrderType
  })

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-muted-foreground">
                Create orders and manage your transaction history.
              </p>
            </div>
            
            <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                  <DialogDescription>
                    Create a new buy or sell order.
                  </DialogDescription>
                </DialogHeader>


                <div className="space-y-6">
                  {/* Order Type Toggle */}
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={orderForm.orderType === 0}
                          onCheckedChange={(checked) => 
                            setOrderForm(prev => ({ ...prev, orderType: checked ? 0 : 1 }))
                          }
                        />
                        <Label>
                          {orderForm.orderType === 0 ? 'OnRamp (Buy Crypto)' : 'OffRamp (Sell Crypto)'}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Token Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="token">Token</Label>
                    <Select
                      value={orderForm.token}
                      onValueChange={(value: Token) => 
                        setOrderForm(prev => ({ ...prev, token: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASE_USDC">BASE USDC</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (KES)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount in KES"
                      value={orderForm.amountFiat}
                      onChange={(e) => 
                        setOrderForm(prev => ({ ...prev, amountFiat: e.target.value }))
                      }
                    />
                  </div>

                  {/* Cashout Type */}
                  <div className="space-y-2">
                    <Label htmlFor="cashoutType">Cashout Type</Label>
                    <Select
                      value={orderForm.cashoutType}
                      onValueChange={(value: CashoutType) => 
                        setOrderForm(prev => ({ ...prev, cashoutType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PHONE">Mobile Money (Phone)</SelectItem>
                        <SelectItem value="TILL">Till Number</SelectItem>
                        <SelectItem value="PAYBILL">Paybill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+254712345678"
                      value={orderForm.phoneNumber}
                      onChange={(e) => 
                        setOrderForm(prev => ({ ...prev, phoneNumber: e.target.value }))
                      }
                    />
                  </div>

                  {/* Dynamic Fields based on Cashout Type */}
                  {orderForm.cashoutType === "TILL" && (
                    <div className="space-y-2">
                      <Label htmlFor="tillNumber">Till Number</Label>
                      <Input
                        id="tillNumber"
                        placeholder="Enter till number"
                        value={orderForm.tillNumber}
                        onChange={(e) => 
                          setOrderForm(prev => ({ ...prev, tillNumber: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {orderForm.cashoutType === "PAYBILL" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="paybillNumber">Paybill Number</Label>
                        <Input
                          id="paybillNumber"
                          placeholder="Enter paybill number"
                          value={orderForm.paybillNumber}
                          onChange={(e) => 
                            setOrderForm(prev => ({ ...prev, paybillNumber: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          placeholder="Enter account number"
                          value={orderForm.accountNumber}
                          onChange={(e) => 
                            setOrderForm(prev => ({ ...prev, accountNumber: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {/* Reference */}
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      placeholder="Payment reference"
                      value={orderForm.reference}
                      onChange={(e) => 
                        setOrderForm(prev => ({ ...prev, reference: e.target.value }))
                      }
                    />
                  </div>

                  {/* Narrative */}
                  <div className="space-y-2">
                    <Label htmlFor="narrative">Narrative (Optional)</Label>
                    <Textarea
                      id="narrative"
                      placeholder="Additional details about this transaction"
                      value={orderForm.narrative}
                      onChange={(e) => 
                        setOrderForm(prev => ({ ...prev, narrative: e.target.value }))
                      }
                    />
                  </div>

                  {/* Client Reference */}
                  <div className="space-y-2">
                    <Label htmlFor="clientRef">Client Reference (Optional)</Label>
                    <Input
                      id="clientRef"
                      placeholder="Your internal reference"
                      value={orderForm.clientRef}
                      onChange={(e) => 
                        setOrderForm(prev => ({ ...prev, clientRef: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateOrderOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                    >
                      Create Order
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by order ID or transaction hash..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="SETTLED">Settled</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="SETTLED_UNVERIFIED">Settled Unverified</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="onramp">OnRamp (Buy)</SelectItem>
                        <SelectItem value="offramp">OffRamp (Sell)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                    {filteredTransactions.length} transaction(s) found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-gray-600">Loading your orders...</span>
                      </div>
                    </div>
                  ) : ordersQuery.isError ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load orders</h3>
                      <p className="text-red-600 mb-4">{(ordersQuery.error as any)?.message || "An error occurred while loading your orders"}</p>
                      <Button
                        variant="outline"
                        onClick={() => ordersQuery.refetch()}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                              No orders found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm">
                                {transaction.id.slice(0, 12)}...
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(transaction.id)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.order_type === 0 ? 'OnRamp' : 'OffRamp'}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.token}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                KES {transaction.amount_fiat.toLocaleString()}
                              </div>
                              {transaction.amount_crypto && (
                                <div className="text-sm text-muted-foreground">
                                  {transaction.amount_crypto} {transaction.token}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(transaction.status)}
                              {getStatusBadge(transaction.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedOrder(transaction)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Order Details</DialogTitle>
                                    <DialogDescription>
                                      Complete information for order {selectedOrder?.id}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedOrder && (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Order ID</Label>
                                          <div className="font-mono text-sm">
                                            {selectedOrder.id}
                                          </div>
                                        </div>
                                        <div>
                                          <Label>Status</Label>
                                          <div className="flex items-center space-x-2 mt-1">
                                            {getStatusIcon(selectedOrder.status)}
                                            {getStatusBadge(selectedOrder.status)}
                                          </div>
                                        </div>
                                        <div>
                                          <Label>Type</Label>
                                          <div>
                                            {selectedOrder.order_type === 0 ? 'OnRamp (Buy)' : 'OffRamp (Sell)'}
                                          </div>
                                        </div>
                                        <div>
                                          <Label>Token</Label>
                                          <div>{selectedOrder.token}</div>
                                        </div>
                                        <div>
                                          <Label>Fiat Amount</Label>
                                          <div>KES {selectedOrder.amount_fiat.toLocaleString()}</div>
                                        </div>
                                        {selectedOrder.amount_crypto && (
                                          <div>
                                            <Label>Crypto Amount</Label>
                                            <div>{selectedOrder.amount_crypto} {selectedOrder.token}</div>
                                          </div>
                                        )}
                                        {selectedOrder.exchange_rate && (
                                          <div>
                                            <Label>Exchange Rate</Label>
                                            <div>KES {selectedOrder.exchange_rate.toLocaleString()}</div>
                                          </div>
                                        )}
                                        <div>
                                          <Label>Cashout Type</Label>
                                          <div>{selectedOrder.fiat_payload.cashout_type}</div>
                                        </div>
                                      </div>
                                      
                                      {selectedOrder.transaction_hash && (
                                        <div>
                                          <Label>Transaction Hash</Label>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-mono text-sm">
                                              {selectedOrder.transaction_hash}
                                            </span>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => copyToClipboard(selectedOrder.transaction_hash!)}
                                            >
                                              <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              asChild
                                            >
                                              <a
                                                href={`https://basescan.org/tx/${selectedOrder.transaction_hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                              </a>
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <Label>Payment Details</Label>
                                        <div className="mt-2 space-y-2 text-sm">
                                          <div>Phone: {selectedOrder.fiat_payload.phone_number}</div>
                                          {selectedOrder.fiat_payload.till_number && (
                                            <div>Till: {selectedOrder.fiat_payload.till_number}</div>
                                          )}
                                          {selectedOrder.fiat_payload.paybill_number && (
                                            <div>Paybill: {selectedOrder.fiat_payload.paybill_number}</div>
                                          )}
                                          {selectedOrder.fiat_payload.account_number && (
                                            <div>Account: {selectedOrder.fiat_payload.account_number}</div>
                                          )}
                                          <div>Reference: {selectedOrder.fiat_payload.reference}</div>
                                          {selectedOrder.fiat_payload.narrative && (
                                            <div>Narrative: {selectedOrder.fiat_payload.narrative}</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              
                              {transaction.transaction_hash && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                >
                                  <a
                                    href={`https://basescan.org/tx/${transaction.transaction_hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Analytics</CardTitle>
                  <CardDescription>
                    Insights and trends from your transaction history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Analytics dashboard coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
