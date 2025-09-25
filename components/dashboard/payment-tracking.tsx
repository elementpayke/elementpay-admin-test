"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Download,
  Eye,
  Copy,
  ExternalLink,
  Phone,
  Store,
  Building2,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { toast as sonnerToast } from "sonner"
import type { DisbursementOrder, PaymentMethod } from "@/lib/types"

interface PaymentTrackingProps {
  orders: DisbursementOrder[]
  onRefresh?: () => void
  isLoading?: boolean
}

export default function PaymentTracking({ orders, onRefresh, isLoading }: PaymentTrackingProps) {
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<DisbursementOrder | null>(null)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      settled: "default",
      completed: "default",
      processing: "secondary",
      pending: "outline",
      failed: "destructive",
      cancelled: "secondary",
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    )
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "PHONE": return <Phone className="h-4 w-4" />
      case "TILL": return <Store className="h-4 w-4" />
      case "PAYBILL": return <Building2 className="h-4 w-4" />
    }
  }

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'pending': return 25
      case 'processing': return 75
      case 'settled':
      case 'completed': return 100
      case 'failed':
      case 'cancelled': return 0
      default: return 0
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    sonnerToast.success("Copied to clipboard", {
      description: `${label}: ${text.slice(0, 20)}${text.length > 20 ? '...' : ''}`,
      duration: 2000,
    })
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.transactionHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.mpesaReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.paymentDestination.phone_number?.includes(searchTerm)
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getEstimatedTimeRemaining = (order: DisbursementOrder) => {
    if (!order.estimatedCompletion) return null
    
    const now = new Date().getTime()
    const estimated = new Date(order.estimatedCompletion).getTime()
    const remaining = Math.max(0, estimated - now)
    
    if (remaining === 0) return null
    
    const minutes = Math.floor(remaining / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
    
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      {/* Active Payments */}
      {orders.some(order => ['pending', 'processing'].includes(order.status)) && (
        <Card className="border border-blue-200 bg-blue-50 rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Payments</span>
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              Payments currently being processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders
                .filter(order => ['pending', 'processing'].includes(order.status))
                .map((order) => {
                  const timeRemaining = getEstimatedTimeRemaining(order)
                  return (
                    <div
                      key={order.id}
                      className="p-4 bg-white border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(order.status)}
                          <div>
                            <div className="font-medium">
                              KES {order.kesAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.cryptoAmount} {order.token} → {order.paymentDestination.cashout_type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(order.status)}
                          {timeRemaining && (
                            <div className="text-xs text-muted-foreground mt-1">
                              ~{timeRemaining} remaining
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Progress 
                        value={getProgressPercentage(order.status)} 
                        className="h-2 mb-2" 
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Order ID: {order.id}</span>
                        <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card className="border border-gray-200 rounded-lg">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All your disbursement transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, transaction hash, or phone..."
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Orders Table */}
          <div className="border border-gray-200 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Details</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono text-sm">
                          {order.id.slice(0, 12)}...
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.cryptoAmount} {order.token}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        KES {order.kesAmount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getPaymentMethodIcon(order.paymentDestination.cashout_type)}
                        <div>
                          <div className="text-sm">
                            {order.paymentDestination.phone_number}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.paymentDestination.cashout_type}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(order.status)}
                        {getStatusBadge(order.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payment Details</DialogTitle>
                              <DialogDescription>
                                Complete information for order {selectedOrder?.id}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedOrder && (
                              <div className="space-y-6">
                                {/* Order Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground">Order ID</div>
                                    <div className="font-mono text-sm">{selectedOrder.id}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                                    <div className="flex items-center space-x-2 mt-1">
                                      {getStatusIcon(selectedOrder.status)}
                                      {getStatusBadge(selectedOrder.status)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground">Crypto Amount</div>
                                    <div>{selectedOrder.cryptoAmount} {selectedOrder.token}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground">KES Amount</div>
                                    <div>KES {selectedOrder.kesAmount.toLocaleString()}</div>
                                  </div>
                                </div>

                                {/* Transaction Details */}
                                {selectedOrder.transactionHash && (
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-2">Transaction Hash</div>
                                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                                      <code className="text-xs flex-1">{selectedOrder.transactionHash}</code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(selectedOrder.transactionHash!, "Transaction hash")}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                      >
                                        <a
                                          href={`https://basescan.org/tx/${selectedOrder.transactionHash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* M-PESA Details */}
                                {selectedOrder.mpesaReference && (
                                  <div>
                                    <div className="text-sm font-medium text-muted-foreground mb-2">M-PESA Reference</div>
                                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                                      <code className="text-xs flex-1">{selectedOrder.mpesaReference}</code>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(selectedOrder.mpesaReference!, "M-PESA reference")}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {/* Payment Destination */}
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-2">Payment Destination</div>
                                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                                    <div className="flex items-center space-x-2">
                                      {getPaymentMethodIcon(selectedOrder.paymentDestination.cashout_type)}
                                      <span className="font-medium">{selectedOrder.paymentDestination.cashout_type}</span>
                                    </div>
                                    <div className="text-sm space-y-1">
                                      <div>Phone: {selectedOrder.paymentDestination.phone_number}</div>
                                      {selectedOrder.paymentDestination.till_number && (
                                        <div>Till: {selectedOrder.paymentDestination.till_number}</div>
                                      )}
                                      {selectedOrder.paymentDestination.paybill_number && (
                                        <div>PayBill: {selectedOrder.paymentDestination.paybill_number}</div>
                                      )}
                                      {selectedOrder.paymentDestination.account_number && (
                                        <div>Account: {selectedOrder.paymentDestination.account_number}</div>
                                      )}
                                      {selectedOrder.paymentDestination.reference && (
                                        <div>Reference: {selectedOrder.paymentDestination.reference}</div>
                                      )}
                                      {selectedOrder.paymentDestination.narrative && (
                                        <div>Purpose: {selectedOrder.paymentDestination.narrative}</div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Timeline */}
                                <div>
                                  <div className="text-sm font-medium text-muted-foreground mb-2">Timeline</div>
                                  <div className="space-y-2 text-sm">
                                    <div>Created: {new Date(selectedOrder.created_at).toLocaleString()}</div>
                                    <div>Updated: {new Date(selectedOrder.updated_at).toLocaleString()}</div>
                                    {selectedOrder.completed_at && (
                                      <div>Completed: {new Date(selectedOrder.completed_at).toLocaleString()}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {order.transactionHash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`https://basescan.org/tx/${order.transactionHash}`}
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
                ))}
              </TableBody>
            </Table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No payments found matching your filters" 
                  : "No payments yet"
                }
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

