"use client"

import { useState, useMemo, useEffect } from "react"
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
import { toast as sonnerToast } from "sonner"
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

  const [limit, setLimit] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [manualPageInput, setManualPageInput] = useState("")

  // Calculate offset from current page
  const offset = (currentPage - 1) * limit

  // Fetch orders using React Query
  const ordersQuery = useQuery({
    queryKey: ["orders", { statusFilter, orderTypeFilter, limit, currentPage, environment: apiConfigEnvironment, offset }],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error("Not authenticated")

      const filters = {
        ...(statusFilter !== "all" && { status_filter: statusFilter as OrderStatus }),
        ...(orderTypeFilter !== "all" && { order_type: orderTypeFilter as "onramp" | "offramp" }),
        limit,
        offset,
      }

      const response = await client.list(filters, token, isSandbox)

      // The orders client returns the full response object
      if (response) {
        let ordersData: ApiOrder[] = []
        let totalCount = 0
        let hasMore = false

        // Handle both response formats
        if (Array.isArray(response)) {
          // Legacy format - response is just an array
          ordersData = response
          totalCount = response.length
          hasMore = response.length === limit
          // Update pagination state
          setTotalOrders(totalCount)
          setTotalPages(Math.ceil(totalCount / limit))
        } else {
          // Response is an object, try to extract data
          const responseObj = response as any

          if (Array.isArray(responseObj.data)) {
            // Legacy format - data is just an array
            ordersData = responseObj.data
            totalCount = responseObj.data.length
            hasMore = responseObj.data.length === limit
          } else if (responseObj.data?.orders && Array.isArray(responseObj.data.orders)) {
            // New format with pagination metadata
            ordersData = responseObj.data.orders
            totalCount = responseObj.data.total || ordersData.length
            hasMore = responseObj.data.has_more || false

            // Update pagination state based on response
            setTotalOrders(totalCount)
            setTotalPages(Math.ceil(totalCount / limit))
            console.log('Updated pagination state:', {
              totalCount,
              totalPages: Math.ceil(totalCount / limit),
              currentPage,
              limit
            })
          }

          // Update pagination state for non-paginated responses
          if (totalCount > 0 && !responseObj.data?.total) {
            setTotalOrders(totalCount)
            setTotalPages(Math.ceil(totalCount / limit))
          }
        }

        return ordersData.map(convertApiOrderToOrder)
      }

      // Fallback
      console.log('No valid response data, returning empty array')
      return []
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
    switch (status.toUpperCase()) {
      case 'SETTLED':
      case 'COMPLETED':
      case 'SUCCESS':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle className="h-4 w-4 text-gray-600" />
      case 'SETTLED_UNVERIFIED':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SETTLED: { variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
      COMPLETED: { variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
      SUCCESS: { variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" },
      PROCESSING: { variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200" },
      PENDING: { variant: "outline" as const, className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
      FAILED: { variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200" },
      CANCELLED: { variant: "secondary" as const, className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200" },
      REFUNDED: { variant: "secondary" as const, className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200" },
      SETTLED_UNVERIFIED: { variant: "outline" as const, className: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { 
      variant: "outline" as const, 
      className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100" 
    }

    return (
      <Badge variant={config.variant} className={config.className}>
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
    sonnerToast.success("Copied to clipboard", {
      description: `${text.slice(0, 20)}${text.length > 20 ? '...' : ''}`,
      duration: 2000,
    })
  }

  // Pagination helper functions
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageSizeChange = (newLimit: number) => {
    setLimit(newLimit)
    setCurrentPage(1) // Reset to first page when changing page size
    setManualPageInput("") // Clear manual page input
  }

  const handleManualPageSubmit = () => {
    const pageNum = parseInt(manualPageInput)
    if (pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum)
      setManualPageInput("")
    }
  }

  const handleManualPageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualPageSubmit()
    }
  }

  // Generate page numbers for pagination
  const getVisiblePageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisiblePages = 5

    // Ensure totalPages is at least 1
    const actualTotalPages = Math.max(totalPages, 1)

    if (actualTotalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= actualTotalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show ellipsis pattern
      if (currentPage <= 3) {
        // Near beginning: 1, 2, 3, ..., last
        pages.push(1, 2, 3, '...', actualTotalPages)
      } else if (currentPage >= actualTotalPages - 2) {
        // Near end: 1, ..., last-2, last-1, last
        pages.push(1, '...', actualTotalPages - 2, actualTotalPages - 1, actualTotalPages)
      } else {
        // Middle: 1, ..., current-1, current, current+1, ..., last
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', actualTotalPages)
      }
    }

    return pages
  }


  const filteredTransactions = transactions.filter((transaction: Order) => {
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                  <DialogDescription>
                    Create a new buy or sell order.
                  </DialogDescription>
                </DialogHeader>


                <div className="space-y-4">
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
                        <SelectValue placeholder="Select a token" />
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
                        <SelectValue placeholder="Select cashout type" />
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

                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateOrderOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                      className="w-full sm:w-auto"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 lg:col-span-1">
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
                    <Select value={statusFilter} onValueChange={setStatusFilter} defaultValue="all" key={`status-${statusFilter}`}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="SETTLED">Settled</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="SETTLED_UNVERIFIED">Settled Unverified</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter} defaultValue="all" key={`type-${orderTypeFilter}`}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="onramp">OnRamp (Buy)</SelectItem>
                        <SelectItem value="offramp">OffRamp (Sell)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="w-full sm:w-auto">
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
                    {ordersQuery.isLoading ? 'Loading transactions...' :
                     `${filteredTransactions.length} transaction(s) found (${totalOrders} total)`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span className="text-muted-foreground">Loading your orders...</span>
                      </div>
                    </div>
                  ) : ordersQuery.isError ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8 text-destructive" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load orders</h3>
                      <p className="text-destructive mb-4">{(ordersQuery.error as any)?.message || "An error occurred while loading your orders"}</p>
                      <Button
                        variant="outline"
                        onClick={() => ordersQuery.refetch()}
                        className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px] w-[120px]">Order ID</TableHead>
                            <TableHead className="min-w-[90px] w-[90px]">Type</TableHead>
                            <TableHead className="min-w-[90px] w-[90px]">Token</TableHead>
                            <TableHead className="min-w-[110px] w-[110px]">Amount</TableHead>
                            <TableHead className="min-w-[90px] w-[90px]">Status</TableHead>
                            <TableHead className="min-w-[90px] w-[90px]">Date</TableHead>
                            <TableHead className="min-w-[90px] w-[90px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                No orders found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredTransactions.map((transaction: Order) => (
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
                              <div className="flex items-center space-x-2 uppercase">
                                {getStatusIcon(transaction.status)}
                                {getStatusBadge(transaction.status)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setSelectedOrder(transaction)}
                                      title="View order details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
                                    <DialogHeader>
                                      <DialogTitle>Order Details</DialogTitle>
                                      <DialogDescription>
                                        Complete information for order {selectedOrder?.id}
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedOrder && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div>
                                            <Label>Order ID</Label>
                                            <div className="flex items-center space-x-2">
                                              <span className="font-mono text-sm truncate flex-1">
                                                {selectedOrder.id}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(selectedOrder.id)}
                                                title="Copy order ID"
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
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
                                              <span className="font-mono text-sm break-all">
                                                {selectedOrder.transaction_hash}
                                              </span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(selectedOrder.transaction_hash!)}
                                                title="Copy transaction hash"
                                              >
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        )}

                                      <div>
                                        <Label>Payment Details</Label>
                                        <div className="mt-2 space-y-2 text-sm bg-muted/30 p-3 rounded-md">
                                          <div className="flex flex-col sm:flex-row sm:justify-between">
                                            <span className="text-muted-foreground">Phone:</span>
                                            <span className="font-medium break-all">{selectedOrder.fiat_payload.phone_number}</span>
                                          </div>
                                          {selectedOrder.fiat_payload.till_number && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between">
                                              <span className="text-muted-foreground">Till:</span>
                                              <span className="font-medium">{selectedOrder.fiat_payload.till_number}</span>
                                            </div>
                                          )}
                                          {selectedOrder.fiat_payload.paybill_number && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between">
                                              <span className="text-muted-foreground">Paybill:</span>
                                              <span className="font-medium">{selectedOrder.fiat_payload.paybill_number}</span>
                                            </div>
                                          )}
                                          {selectedOrder.fiat_payload.account_number && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between">
                                              <span className="text-muted-foreground">Account:</span>
                                              <span className="font-medium break-all">{selectedOrder.fiat_payload.account_number}</span>
                                            </div>
                                          )}
                                          <div className="flex flex-col sm:flex-row sm:justify-between">
                                            <span className="text-muted-foreground">Reference:</span>
                                            <span className="font-medium break-all">{selectedOrder.fiat_payload.reference}</span>
                                          </div>
                                          {selectedOrder.fiat_payload.narrative && (
                                            <div className="flex flex-col sm:flex-row sm:justify-between">
                                              <span className="text-muted-foreground">Narrative:</span>
                                              <span className="font-medium break-all">{selectedOrder.fiat_payload.narrative}</span>
                                            </div>
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
                                    onClick={() => copyToClipboard(transaction.transaction_hash!)}
                                    title="Copy transaction hash"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pagination Controls - Always visible */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pageSize">Show:</Label>
                      <Select
                        value={limit.toString()}
                        onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                      >
                        <SelectTrigger className="w-20" id="pageSize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="200">200</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>

                    {/* Page Information */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, totalOrders)} of {totalOrders} orders
                      </span>
                    </div>

                    {/* Pagination Navigation */}
                    <div className="flex items-center gap-2">
                      {/* Previous Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      {/* Manual Page Input */}
                      <div className="flex items-center gap-1">
                        <Label htmlFor="pageInput" className="text-sm">Page:</Label>
                        <Input
                          id="pageInput"
                          type="number"
                          min="1"
                          max={Math.max(totalPages, 1)}
                          value={manualPageInput}
                          onChange={(e) => setManualPageInput(e.target.value)}
                          onKeyPress={handleManualPageKeyPress}
                          className="w-16 h-8 text-sm"
                          placeholder={currentPage.toString()}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManualPageSubmit}
                          disabled={!manualPageInput || parseInt(manualPageInput) < 1 || parseInt(manualPageInput) > totalPages}
                          className="h-8 px-2 text-xs"
                        >
                          Go
                        </Button>
                        <span className="text-sm text-muted-foreground">of {Math.max(totalPages, 1)}</span>
                      </div>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {getVisiblePageNumbers().map((page, index) => (
                          <Button
                            key={index}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => typeof page === 'number' && handlePageChange(page)}
                            disabled={page === '...'}
                            className="min-w-[32px] h-8 text-sm"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      {/* Next Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
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
