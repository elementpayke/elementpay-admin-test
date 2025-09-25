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
  Wallet,
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
  // const {
  //   rates,
  //   isLoadingRates,
  //   currentQuote: hookCurrentQuote,
  //   isLoadingQuote,
  //   recentDisbursements,
  //   fetchRates,
  //   getQuote,
  //   createDisbursement,
  // } = useDisbursement()

  const rates = {}
  const isLoadingRates = false
  const hookCurrentQuote = null
  const isLoadingQuote = false
  const recentDisbursements = []
  const fetchRates = () => {}
  const getQuote = () => {}
  const createDisbursement = () => {}

  // Form state - commented out for debugging
  // const [selectedToken, setSelectedToken] = useState<Token>("BASE_USDC")
  // const [kesAmount, setKesAmount] = useState("")
  // const [cryptoAmount, setCryptoAmount] = useState("")
  // const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PHONE")
  // const [paymentDestination, setPaymentDestination] = useState<PaymentDestination>({
  //   cashout_type: "PHONE",
  //   phone_number: "",
  //   reference: "",
  //   narrative: "",
  // })

  // UI state - commented out for debugging
  // const [currentQuoteSelected, setCurrentQuoteSelected] = useState<DisbursementQuote | null>(null)
  // const [rateExpiry, setRateExpiry] = useState<Date | null>(null)
  // const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  // const [paymentProgress, setPaymentProgress] = useState<PaymentProgress | null>(null)
  // const [activeOrder, setActiveOrder] = useState<DisbursementOrder | null>(null)

  const selectedToken = "BASE_USDC"
  const kesAmount = ""
  const cryptoAmount = ""
  const paymentMethod = "PHONE"
  const paymentDestination = {
    cashout_type: "PHONE",
    phone_number: "",
    reference: "",
    narrative: "",
  }
  const currentQuoteSelected = null
  const rateExpiry = null
  const isProcessingPayment = false
  const paymentProgress = null
  const activeOrder = null

  // Get token balance for selected token
  const selectedTokenBalance = { balance: 125.50, token: selectedToken }
  // Get current rate from rates data
  const currentRate = rates?.[selectedToken]?.rate || 0

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
      step: "blockchain_processing",
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


  return (
    <div>
      <h1>Disbursement Page</h1>
    </div>
  )
}
