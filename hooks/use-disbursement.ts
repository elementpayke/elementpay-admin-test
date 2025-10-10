"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { elementPayRateService, type ElementPayRate } from '@/lib/elementpay-rate-service'
import { elementPayWalletService } from '@/lib/elementpay-wallet-service'
import { elementPayApiClient } from '@/lib/elementpay-api-client'
import { getSupportedTokens, getCachedSupportedTokens, CURRENCY_MAP } from '@/lib/elementpay-config'
import { getBalance } from '@wagmi/core'
import { useConfig } from 'wagmi'
import type { 
  Token, 
  ExchangeRate, 
  DisbursementQuote, 
  DisbursementOrder, 
  PaymentDestination,
  ElementPayToken,
  WalletBalance
} from '@/lib/types'

interface UseDisbursementOptions {
  autoRefreshRates?: boolean
  refreshInterval?: number // seconds
}

export function useDisbursement(options: UseDisbursementOptions = {}) {
  const { makeAuthenticatedRequest } = useAuth()
  const { toast } = useToast()
  const wagmiConfig = useConfig()
  
  const {
    autoRefreshRates = true,
    refreshInterval = 30
  } = options

  // ElementPay specific state
  const [elementPayRates, setElementPayRates] = useState<Record<string, ElementPayRate>>({})
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([])
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [supportedTokens, setSupportedTokens] = useState<ElementPayToken[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isProcessingOffRamp, setIsProcessingOffRamp] = useState(false)
  
  // Legacy state for backward compatibility
  const [rates, setRates] = useState<Record<Token, ExchangeRate>>({} as Record<Token, ExchangeRate>)
  const [isLoadingRates, setIsLoadingRates] = useState(false)
  const [currentQuote, setCurrentQuote] = useState<DisbursementQuote | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [recentDisbursements, setRecentDisbursements] = useState<DisbursementOrder[]>([])



  // Get quote for disbursement
  const getQuote = useCallback(async (
    token: Token,
    kesAmount: number
  ): Promise<DisbursementQuote | null> => {
    setIsLoadingQuote(true)
    try {
      // Mock API call - replace with actual Element Pay API
      const response = await makeAuthenticatedRequest(
        `/api/elementpay/quote?token=${token}&amount_fiat=${kesAmount}&order_type=1`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error('Failed to get quote')
      }

      const quoteData = await response.json()
      
      const quote: DisbursementQuote = {
        token,
        cryptoAmount: quoteData.crypto_amount || kesAmount / rates[token]?.rate || 0,
        kesAmount,
        rate: quoteData.rate || rates[token]?.rate || 0,
        networkFee: quoteData.network_fee || 0.5,
        serviceFee: quoteData.service_fee || kesAmount * 0.005,
        totalCost: quoteData.total_cost || (kesAmount / (rates[token]?.rate || 1)) + 0.5,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        quoteId: quoteData.quote_id || `quote_${Date.now()}`,
      }

      setCurrentQuote(quote)
      return quote
    } catch (error) {
      console.error('Failed to get quote:', error)
      toast({
        title: "Quote Failed",
        description: "Unable to get payment quote",
      })
      return null
    } finally {
      setIsLoadingQuote(false)
    }
  }, [makeAuthenticatedRequest, rates, toast])

  // Create disbursement order
  const createDisbursement = useCallback(async (
    userAddress: string,
    token: Token,
    kesAmount: number,
    paymentDestination: PaymentDestination
  ): Promise<DisbursementOrder | null> => {
    try {
      const orderPayload = {
        user_address: userAddress,
        token,
        order_type: 1, // OffRamp
        fiat_payload: {
          amount_fiat: kesAmount,
          cashout_type: paymentDestination.cashout_type,
          phone_number: paymentDestination.phone_number,
          till_number: paymentDestination.till_number,
          paybill_number: paymentDestination.paybill_number,
          account_number: paymentDestination.account_number,
          reference: paymentDestination.reference || "Crypto disbursement",
          currency: "KES" as const,
          narrative: paymentDestination.narrative || "Payment via Element Pay",
          client_ref: `disb_${Date.now()}`,
        },
      }

      const response = await makeAuthenticatedRequest(
        '/api/elementpay/orders/create',
        {
          method: 'POST',
          body: JSON.stringify(orderPayload),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create disbursement order')
      }

      const orderData = await response.json()
      
      const order: DisbursementOrder = {
        id: orderData.id,
        quoteId: currentQuote?.quoteId || '',
        user_address: userAddress,
        token,
        cryptoAmount: currentQuote?.cryptoAmount || 0,
        kesAmount,
        paymentDestination,
        status: orderData.status || 'pending',
        created_at: orderData.created_at || new Date().toISOString(),
        updated_at: orderData.updated_at || new Date().toISOString(),
        estimatedCompletion: orderData.estimated_completion,
      }

      // Add to recent disbursements
      setRecentDisbursements(prev => [order, ...prev.slice(0, 9)])
      
      toast({
        title: "Order Created",
        description: "Your disbursement order has been created successfully",
      })

      return order
    } catch (error) {
      console.error('Failed to create disbursement:', error)
      toast({
        title: "Order Failed",
        description: "Failed to create disbursement order",
      })
      return null
    }
  }, [makeAuthenticatedRequest, currentQuote, toast])

  // Fetch recent disbursements
  const fetchRecentDisbursements = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest(
        '/orders/me?order_type=1&limit=10',
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch disbursements')
      }

      const ordersData = await response.json()
      
      const orders: DisbursementOrder[] = ordersData.orders?.map((order: any) => ({
        id: order.id,
        quoteId: order.quote_id || '',
        user_address: order.user_address,
        token: order.token,
        cryptoAmount: order.crypto_amount || 0,
        kesAmount: order.fiat_payload.amount_fiat,
        paymentDestination: {
          cashout_type: order.fiat_payload.cashout_type,
          phone_number: order.fiat_payload.phone_number,
          till_number: order.fiat_payload.till_number,
          paybill_number: order.fiat_payload.paybill_number,
          account_number: order.fiat_payload.account_number,
          reference: order.fiat_payload.reference,
          narrative: order.fiat_payload.narrative,
        },
        status: order.status,
        transactionHash: order.transaction_hash,
        mpesaReference: order.mpesa_reference,
        created_at: order.created_at,
        updated_at: order.updated_at,
        completed_at: order.completed_at,
        estimatedCompletion: order.estimated_completion,
      })) || []

      setRecentDisbursements(orders)
    } catch (error) {
      console.error('Failed to fetch recent disbursements:', error)
    }
  }, [makeAuthenticatedRequest])

  // Get order status
  const getOrderStatus = useCallback(async (orderId: string): Promise<DisbursementOrder | null> => {
    try {
      const response = await makeAuthenticatedRequest(
        `/api/elementpay/orders/${orderId}`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch order status')
      }

      const orderData = await response.json()
      
      const order: DisbursementOrder = {
        id: orderData.id,
        quoteId: orderData.quote_id || '',
        user_address: orderData.user_address,
        token: orderData.token,
        cryptoAmount: orderData.crypto_amount || 0,
        kesAmount: orderData.fiat_payload.amount_fiat,
        paymentDestination: {
          cashout_type: orderData.fiat_payload.cashout_type,
          phone_number: orderData.fiat_payload.phone_number,
          till_number: orderData.fiat_payload.till_number,
          paybill_number: orderData.fiat_payload.paybill_number,
          account_number: orderData.fiat_payload.account_number,
          reference: orderData.fiat_payload.reference,
          narrative: orderData.fiat_payload.narrative,
        },
        status: orderData.status,
        transactionHash: orderData.transaction_hash,
        mpesaReference: orderData.mpesa_reference,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        completed_at: orderData.completed_at,
        estimatedCompletion: orderData.estimated_completion,
      }

      return order
    } catch (error) {
      console.error('Failed to fetch order status:', error)
      return null
    }
  }, [makeAuthenticatedRequest])

 

  // Fetch recent disbursements on mount
  useEffect(() => {
    fetchRecentDisbursements()
  }, [fetchRecentDisbursements])

  // Legacy fetch rates method (placeholder)
  const fetchRates = useCallback(async () => {
    // This will be replaced by fetchElementPayRates
  }, [])

  // ElementPay specific functions
  const fetchElementPayRates = useCallback(async (currencies?: string[]) => {
    try {
      setIsLoadingRates(true)
      const currenciesToFetch = currencies || Object.keys(CURRENCY_MAP)
      
      const ratePromises = currenciesToFetch.map(async (currency) => {
        try {
          const rate = await elementPayRateService.fetchRate(currency)
          return { currency, rate }
        } catch (error) {
          console.error(`Failed to fetch rate for ${currency}:`, error)
          return null
        }
      })

      const results = await Promise.allSettled(ratePromises)
      const newRates: Record<string, ElementPayRate> = {}

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          newRates[result.value.currency] = result.value.rate
        }
      })

      setElementPayRates(newRates)
    } catch (error) {
      console.error('Failed to fetch ElementPay rates:', error)
      toast({
        title: "Rate Fetch Failed",
        description: "Failed to fetch current exchange rates",
        variant: "destructive"
      })
    } finally {
      setIsLoadingRates(false)
    }
  }, [toast])

  const fetchWalletBalances = useCallback(async (userAddress: string) => {
    if (!userAddress) return

    try {
      setIsLoadingBalances(true)
      
      // Use a simpler approach that doesn't rely on getConfig
      const supportedTokens = getCachedSupportedTokens()
      const balances: WalletBalance[] = []
      
      for (const token of supportedTokens) {
        try {
          // Use wagmi's getBalance with proper config parameter structure
          const balance = await getBalance(wagmiConfig, {
            address: userAddress as `0x${string}`,
            token: token.tokenAddress as `0x${string}`,
            chainId: token.chainId,
          })

          const formattedBalance = parseFloat(balance.formatted).toFixed(6)
          
          balances.push({
            token,
            balance: parseFloat(balance.formatted),
            formattedBalance
          })
          
          console.log(`✅ Fetched balance for ${token.symbol}: ${formattedBalance}`)
        } catch (error) {
          console.error(`❌ Failed to get balance for ${token.symbol}:`, error)
          // Add zero balance for failed tokens
          balances.push({
            token,
            balance: 0,
            formattedBalance: '0.000000'
          })
        }
      }
      
      setWalletBalances(balances)
      console.log(`✅ Successfully fetched balances for ${balances.length} tokens`)
    } catch (error) {
      console.error('Failed to fetch wallet balances:', error)
      toast({
        title: "Balance Fetch Failed",
        description: "Failed to fetch wallet balances",
        variant: "destructive"
      })
    } finally {
      setIsLoadingBalances(false)
    }
  }, [toast])

  const fetchSupportedTokens = useCallback(async () => {
    try {
      setIsLoadingTokens(true)
      const tokens = await getSupportedTokens()
      setSupportedTokens(tokens)
    } catch (error) {
      console.error('Failed to fetch supported tokens:', error)
      // Use cached tokens as fallback
      const cachedTokens = getCachedSupportedTokens()
      setSupportedTokens(cachedTokens)
    } finally {
      setIsLoadingTokens(false)
    }
  }, [])

  const processElementPayOffRamp = useCallback(async (
    userAddress: string,
    token: ElementPayToken,
    kesAmount: number,
    phoneNumber: string,
    onProgress?: (step: string, message: string) => void,
    providedRate?: ElementPayRate // Add optional rate parameter
  ) => {
    try {
      setIsProcessingOffRamp(true)
      
      // Get current rate - try provided rate first, then stored rates, then fetch fresh
      let rate = providedRate || elementPayRates[token.symbol]
      
      if (!rate) {
        onProgress?.('rate_fetch', 'Fetching current exchange rate...')
        try {
          rate = await elementPayRateService.fetchRate(token.symbol)
          // Store the fetched rate
          setElementPayRates(prev => ({
            ...prev,
            [token.symbol]: rate!
          }))
        } catch (error) {
          console.error('Failed to fetch rate:', error)
          throw new Error('Unable to fetch current exchange rate. Please try again.')
        }
      }
      
      if (!rate) {
        throw new Error('Exchange rate not available')
      }

      // Process wallet interactions
      const { approvalHash, signature, orderPayload } = await elementPayWalletService.processOffRamp(
        userAddress,
        token,
        kesAmount,
        phoneNumber,
        rate,
        onProgress
      )

      // Create order via API
      onProgress?.('order_creation', 'Creating disbursement order...')
      const order = await elementPayApiClient.createOrder(orderPayload, signature)

      toast({
        title: "Order Created Successfully",
        description: `Order ${order.id} has been created and is being processed`,
      })

      // Refresh recent disbursements
      await fetchRecentDisbursements()

      return {
        orderId: order.id,
        approvalHash,
        signature,
        order
      }
    } catch (error) {
      console.error('ElementPay off-ramp failed:', error)
      toast({
        title: "Off-Ramp Failed",
        description: error instanceof Error ? error.message : "Failed to process off-ramp",
        variant: "destructive"
      })
      throw error
    } finally {
      setIsProcessingOffRamp(false)
    }
  }, [elementPayRates, toast, fetchRecentDisbursements])

  // Initialize supported tokens on mount
  useEffect(() => {
    fetchSupportedTokens()
  }, [fetchSupportedTokens])

  return {
    // Legacy state for backward compatibility
    rates,
    isLoadingRates,
    currentQuote,
    isLoadingQuote,
    recentDisbursements,

    // ElementPay specific state
    elementPayRates,
    walletBalances,
    isLoadingBalances,
    supportedTokens,
    isLoadingTokens,
    isProcessingOffRamp,

    // Legacy actions
    fetchRates,
    getQuote,
    createDisbursement,
    fetchRecentDisbursements,
    getOrderStatus,

    // ElementPay specific actions
    fetchElementPayRates,
    fetchWalletBalances,
    fetchSupportedTokens,
    processElementPayOffRamp,
  }
}

