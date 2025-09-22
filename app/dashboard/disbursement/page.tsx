"use client"

import { useState, useEffect, useCallback } from "react"
import AuthGuard from "@/components/auth/auth-guard"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { useDisbursement } from "@/hooks/use-disbursement"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Phone,
  Store,
  Building2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Copy,
  ExternalLink,
  Zap,
  Timer,
  DollarSign,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { 
  Token, 
  PaymentMethod, 
  PaymentDestination, 
  TokenBalance, 
  DisbursementQuote, 
  DisbursementOrder,
  PaymentProgress 
} from "@/lib/types"

// We'll use actual API data from the hook

export default function DisbursementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Use actual API data
  const {
    rates,
    isLoadingRates,
    currentQuote: hookCurrentQuote,
    isLoadingQuote,
    recentDisbursements,
    fetchRates,
    getQuote,
    createDisbursement,
  } = useDisbursement()

  // Form state
  const [selectedToken, setSelectedToken] = useState<Token>("BASE_USDC")
  const [kesAmount, setKesAmount] = useState("")
  const [cryptoAmount, setCryptoAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PHONE")
  const [paymentDestination, setPaymentDestination] = useState<PaymentDestination>({
    cashout_type: "PHONE",
    phone_number: "",
    reference: "",
    narrative: "",
  })

  // UI state
  const [currentQuoteSelected, setCurrentQuoteSelected] = useState<DisbursementQuote | null>(null)
  const [rateExpiry, setRateExpiry] = useState<Date | null>(null)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentProgress, setPaymentProgress] = useState<PaymentProgress | null>(null)
  const [activeOrder, setActiveOrder] = useState<DisbursementOrder | null>(null)

  // Get token balance for selected token
  const selectedTokenBalance = { balance: 125.50, token: selectedToken }
  // Get current rate from rates data
  const currentRate = rates?.find(rate => rate.token === selectedToken)?.rate || 0

  // Calculate amounts
  useEffect(() => {
    if (kesAmount && currentRate) {
      const crypto = parseFloat(kesAmount) / currentRate
      setCryptoAmount(crypto.toFixed(6))
    }
  }, [kesAmount, currentRate])

  useEffect(() => {
    if (cryptoAmount && currentRate) {
      const kes = parseFloat(cryptoAmount) * currentRate
      setKesAmount(kes.toFixed(2))
    }
  }, [cryptoAmount, currentRate])

  // Rate refresh functionality
  const refreshRate = useCallback(async () => {
    await fetchRates()
    const newExpiry = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    setRateExpiry(newExpiry)
    
    toast({
      title: "Rate Refreshed",
      description: "Exchange rate has been updated",
    })
  }, [fetchRates, toast])

  // Initialize rate expiry
  useEffect(() => {
    refreshRate()
  }, [refreshRate])

  // Quick amount buttons
  const setQuickAmount = (percentage: number) => {
    if (!selectedTokenBalance) return
    const amount = (selectedTokenBalance.balance * percentage / 100).toFixed(6)
    setCryptoAmount(amount)
  }

  // Form validation
  const isFormValid = () => {
    if (!kesAmount || !paymentDestination.phone_number) return false

    if (paymentMethod === "TILL" && !paymentDestination.till_number) return false
    if (paymentMethod === "PAYBILL" && (!paymentDestination.paybill_number || !paymentDestination.account_number)) return false

    return true
  }

  // Handle payment method change
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setPaymentDestination(prev => ({
      ...prev,
      cashout_type: method,
      till_number: "",
      paybill_number: "",
      account_number: "",
    }))
  }

  // Process payment
  const handleProcessPayment = async () => {
    if (!isFormValid()) return

    setIsProcessingPayment(true)
    setPaymentProgress({
      step: "processing",
      message: "Processing your disbursement request...",
    })

    try {
      // Create actual disbursement order
      const order = await createDisbursement(
        "demo-wallet-address", // Placeholder for demo
        selectedToken,
        parseFloat(kesAmount),
        paymentDestination
      )

      if (order) {
        setPaymentProgress({
          step: "blockchain_processing",
          message: "Processing blockchain transaction...",
          estimatedTimeRemaining: 30,
        })

        // Poll for order status updates
        const pollStatus = async () => {
          // Implementation would poll the order status
          setPaymentProgress({
            step: "completed",
            message: "Payment completed successfully!",
            mpesaReference: order.mpesaReference || "Processing...",
          })
        }

        setTimeout(pollStatus, 5000) // Mock delay

        toast({
          title: "Payment Successful",
          description: `KES ${kesAmount} has been sent via M-PESA`,
        })

        // Reset form
        setKesAmount("")
        setCryptoAmount("")
        setPaymentDestination({
          cashout_type: "PHONE",
          phone_number: "",
          reference: "",
          narrative: "",
        })
      } else {
        throw new Error("Failed to create disbursement order")
      }

    } catch (error) {
      setPaymentProgress({
        step: "failed",
        message: "Payment failed. Please try again.",
      })
      
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment",
      })
    } finally {
      setIsProcessingPayment(false)
      setTimeout(() => setPaymentProgress(null), 5000)
    }
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "PHONE": return <Phone className="h-5 w-5" />
      case "TILL": return <Store className="h-5 w-5" />
      case "PAYBILL": return <Building2 className="h-5 w-5" />
    }
  }

  const getPaymentMethodDescription = (method: PaymentMethod) => {
    switch (method) {
      case "PHONE": return "Send KES directly to a phone number"
      case "TILL": return "Pay a business till number"
      case "PAYBILL": return "Pay via PayBill (utility bills, etc.)"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'settled':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Disbursement</h1>
            <p className="text-muted-foreground">
              Pay with cryptocurrency and receive KES via M-PESA
            </p>
          </div>

          {/* Wallet Connection Status */}
          <Card className="border border-gray-200 rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Wallet Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">Ready to Disburse</span>
                  </div>
                  <span className="text-sm text-blue-700">
                    Demo Mode
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {rates?.map((rate) => (
                    <div
                      key={rate.token}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedToken === rate.token
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedToken(rate.token)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{rate.token.replace('_', ' ')}</div>
                          <div className="text-sm text-muted-foreground">
                            Rate: KES {rate.rate.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">125.50</div>
                          <div className="text-sm text-muted-foreground">Available</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
              {/* Payment Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Amount Selection */}
                <Card className="border border-gray-200 rounded-lg">
                  <CardHeader>
                    <CardTitle>Payment Amount</CardTitle>
                    <CardDescription>
                      Choose the token and amount for your payment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Token</Label>
                      <Select value={selectedToken} onValueChange={(value: Token) => setSelectedToken(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(rates).map((token) => {
                            const tokenKey = token as Token
                            const balance = 125.50 // TODO: Get from wallet
                            return (
                              <SelectItem key={tokenKey} value={tokenKey}>
                                {tokenKey} ({balance} available)
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>KES Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={kesAmount}
                          onChange={(e) => setKesAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{selectedToken} Amount</Label>
                        <Input
                          type="number"
                          placeholder="0.000000"
                          value={cryptoAmount}
                          onChange={(e) => setCryptoAmount(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setQuickAmount(25)}>
                        25%
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQuickAmount(50)}>
                        50%
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQuickAmount(75)}>
                        75%
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQuickAmount(100)}>
                        Max
                      </Button>
                    </div>

                    {selectedTokenBalance && parseFloat(cryptoAmount) > selectedTokenBalance.balance && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          Insufficient balance. Available: {selectedTokenBalance.balance} {selectedToken}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Destination */}
                <Card className="border border-gray-200 rounded-lg">
                  <CardHeader>
                    <CardTitle>Payment Destination</CardTitle>
                    <CardDescription>
                      Choose how you want to send the KES payment
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(["PHONE", "TILL", "PAYBILL"] as PaymentMethod[]).map((method) => (
                        <div
                          key={method}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === method
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => handlePaymentMethodChange(method)}
                        >
                          <div className="flex flex-col items-center text-center space-y-2">
                            {getPaymentMethodIcon(method)}
                            <div className="font-medium">{method}</div>
                            <div className="text-xs text-muted-foreground">
                              {getPaymentMethodDescription(method)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          placeholder="+254712345678"
                          value={paymentDestination.phone_number}
                          onChange={(e) =>
                            setPaymentDestination(prev => ({ ...prev, phone_number: e.target.value }))
                          }
                        />
                      </div>

                      {paymentMethod === "TILL" && (
                        <div className="space-y-2">
                          <Label>Till Number</Label>
                          <Input
                            placeholder="Enter till number"
                            value={paymentDestination.till_number}
                            onChange={(e) =>
                              setPaymentDestination(prev => ({ ...prev, till_number: e.target.value }))
                            }
                          />
                        </div>
                      )}

                      {paymentMethod === "PAYBILL" && (
                        <>
                          <div className="space-y-2">
                            <Label>PayBill Number</Label>
                            <Input
                              placeholder="Enter paybill number"
                              value={paymentDestination.paybill_number}
                              onChange={(e) =>
                                setPaymentDestination(prev => ({ ...prev, paybill_number: e.target.value }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Account Number</Label>
                            <Input
                              placeholder="Enter account number"
                              value={paymentDestination.account_number}
                              onChange={(e) =>
                                setPaymentDestination(prev => ({ ...prev, account_number: e.target.value }))
                              }
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label>Reference</Label>
                        <Input
                          placeholder="Payment reference"
                          value={paymentDestination.reference}
                          onChange={(e) =>
                            setPaymentDestination(prev => ({ ...prev, reference: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Purpose (Optional)</Label>
                        <Textarea
                          placeholder="Brief description of payment purpose"
                          value={paymentDestination.narrative}
                          onChange={(e) =>
                            setPaymentDestination(prev => ({ ...prev, narrative: e.target.value }))
                          }
                          maxLength={120}
                        />
                        <div className="text-xs text-muted-foreground">
                          {paymentDestination.narrative?.length || 0}/120 characters
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rate Preview & Payment Summary */}
                {kesAmount && cryptoAmount && (
                  <Card className="border border-blue-200 bg-blue-50 rounded-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Payment Summary</span>
                        <Button variant="outline" size="sm" onClick={refreshRate}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh Rate
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Exchange Rate:</span>
                          <span className="font-medium">1 {selectedToken} = KES {currentRate.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>You'll spend:</span>
                          <span className="font-medium">{cryptoAmount} {selectedToken}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recipient gets:</span>
                          <span className="font-medium">KES {parseFloat(kesAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Network fee:</span>
                          <span>~$0.50</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Service fee:</span>
                          <span>0.5%</span>
                        </div>
                      </div>

                      {rateExpiry && (
                        <div className="flex items-center space-x-2 text-sm text-blue-700">
                          <Timer className="h-4 w-4" />
                          <span>Rate expires in: {Math.max(0, Math.floor((rateExpiry.getTime() - Date.now()) / 1000 / 60))} minutes</span>
                        </div>
                      )}

                      <Button
                        onClick={handleProcessPayment}
                        disabled={!isFormValid() || isProcessingPayment}
                        className="w-full"
                        size="lg"
                      >
                        {isProcessingPayment ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Send Payment
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Recent Disbursements */}
                <Card className="border border-gray-200 rounded-lg">
                  <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                    <CardDescription>Your latest disbursements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentDisbursements.slice(0, 3).map((disbursement) => (
                        <div
                          key={disbursement.id}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(disbursement.status)}
                            <div>
                              <div className="font-medium text-sm">
                                KES {disbursement.kesAmount.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {disbursement.paymentDestination.cashout_type}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              {disbursement.cryptoAmount} {disbursement.token}
                            </div>
                            <Badge variant={disbursement.status === "settled" ? "default" : "secondary"}>
                              {disbursement.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {recentDisbursements.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No recent payments
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border border-gray-200 rounded-lg">
                  <CardHeader>
                    <CardTitle>Payment Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Today's Payments</span>
                      <span className="font-medium">KES 15,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium">KES 125,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Success Rate</span>
                      <span className="font-medium text-green-600">99.2%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Payment Progress Dialog */}
          <Dialog open={!!paymentProgress} onOpenChange={() => setPaymentProgress(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Processing Payment</DialogTitle>
                <DialogDescription>
                  Please wait while we process your payment
                </DialogDescription>
              </DialogHeader>
              {paymentProgress && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {paymentProgress.step === "completed" ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : paymentProgress.step === "failed" ? (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    ) : (
                      <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    )}
                    <div>
                      <div className="font-medium">{paymentProgress.message}</div>
                      {paymentProgress.estimatedTimeRemaining && (
                        <div className="text-sm text-muted-foreground">
                          ~{paymentProgress.estimatedTimeRemaining} seconds remaining
                        </div>
                      )}
                    </div>
                  </div>

                  {paymentProgress.transactionHash && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium mb-1">Transaction Hash:</div>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {paymentProgress.transactionHash.slice(0, 20)}...
                        </code>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {paymentProgress.mpesaReference && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm font-medium mb-1">M-PESA Reference:</div>
                      <div className="flex items-center space-x-2">
                        <code className="text-xs bg-green-100 px-2 py-1 rounded">
                          {paymentProgress.mpesaReference}
                        </code>
                        <Button variant="ghost" size="sm">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
