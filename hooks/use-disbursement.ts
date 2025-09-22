"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import type { 
  Token, 
  ExchangeRate, 
  DisbursementQuote, 
  DisbursementOrder, 
  PaymentDestination 
} from '@/lib/types'

interface UseDisbursementOptions {
  autoRefreshRates?: boolean
  refreshInterval?: number // seconds
}

export function useDisbursement(options: UseDisbursementOptions = {}) {
  const { makeAuthenticatedRequest } = useAuth()
  const { toast } = useToast()
  
  const {
    autoRefreshRates = true,
    refreshInterval = 30
  } = options

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

  return {
    // State
    currentQuote,
    isLoadingQuote,
    recentDisbursements,

    // Actions
    getQuote,
    createDisbursement,
    fetchRecentDisbursements,
    getOrderStatus,

  }
}

