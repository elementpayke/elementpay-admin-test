export type User = {
  id: string
  name: string
  email: string
  password?: string
  emailVerified?: boolean
  verificationCode?: string
  avatar?: string
  phone?: string
  company?: string
  role?: string
  createdAt?: string
  lastLoginAt?: string
}

export type Environment = "mainnet" | "testnet"

export type ApiKey = {
  id: string
  userId: string
  name: string
  key: string
  environment: Environment
  status: "active" | "revoked"
  createdAt: string
  webhookUrl?: string
  webhookSecret?: string
}

export type ApiKeyWithMasked = ApiKey & {
  maskedKey: string
  isRevealed: boolean
}

// Wallet Integration Types
export type WalletConnectionState = {
  isConnected: boolean
  address: string | null
  chainId: number | null
  isConnecting: boolean
  error: string | null
}

// Order Types
export type OrderType = 0 | 1 // 0 for onramp, 1 for offramp

export type CashoutType = "PHONE" | "TILL" | "PAYBILL"

export type OrderStatus = "PENDING" | "PROCESSING" | "SETTLED" | "FAILED" | "CANCELLED" | "COMPLETED" | "SETTLED_UNVERIFIED" | "REFUNDED" | "SUCCESS"

export type Currency = "KES"

export type Token = "BASE_USDC" | "ETH" | "BTC" | "BASE_USDC(Testnet)" | "USDT" | "USDC" | "WXM"

export type FiatPayload = {
  amount_fiat: number
  cashout_type: CashoutType
  phone_number: string
  till_number?: string
  paybill_number?: string
  account_number?: string
  reference: string
  currency: Currency
  narrative: string
  client_ref: string
}

export type OrderCreatePayload = {
  user_address: string
  token: Token
  order_type: OrderType
  fiat_payload: FiatPayload
}

// API response order type
export type ApiOrder = {
  order_id: string
  status: OrderStatus
  amount_crypto: number
  amount_fiat: number
  currency: Currency
  exchange_rate: number
  token: string
  file_id?: string
  invoice_id?: string
  phone_number: string
  creation_transaction_hash?: string
  settlement_transaction_hash?: string
  refund_transaction_hash?: string
  order_type: 0 | 1
  wallet_address: string
  created_at: string
  updated_at?: string
}

// Internal Order type for frontend use
export type Order = {
  id: string
  user_address: string
  token: Token
  order_type: OrderType
  status: OrderStatus
  amount_crypto?: number
  amount_fiat: number
  exchange_rate?: number
  transaction_hash?: string
  creation_transaction_hash?: string
  settlement_transaction_hash?: string
  refund_transaction_hash?: string
  fiat_payload: FiatPayload
  created_at: string
  updated_at: string
  settled_at?: string
}

// Dashboard Stats
export type DashboardStats = {
  totalTransactions: number
  pendingOrders: number
  settledAmount: number
  totalVolume: number
}

// KYC Types
export type KYCStatus = "not_started" | "pending" | "under_review" | "approved" | "rejected"

export type KYCDocument = {
  id: string
  type: "national_id" | "passport" | "driving_license"
  status: "pending" | "approved" | "rejected"
  file_url: string
  uploaded_at: string
}

export type KYCProfile = {
  status: KYCStatus
  documents: KYCDocument[]
  rejection_reason?: string
  approved_at?: string
}

// Disbursement Types
export type PaymentMethod = "PHONE" | "TILL" | "PAYBILL"

export type PaymentDestination = {
  cashout_type: PaymentMethod
  phone_number?: string
  till_number?: string
  paybill_number?: string
  account_number?: string
  reference?: string
  narrative?: string
}

export type TokenBalance = {
  token: Token
  balance: number
  usdValue: number
  address: string
}

export type ExchangeRate = {
  token: Token
  rate: number // KES per token
  lastUpdated: string
  expiresAt?: string
}

// ElementPay specific types
export type ElementPayToken = {
  symbol: string
  // name: string
  chain: string
  chainId: number
  tokenAddress: string
  decimals: number
  icon?: string | null
  env: "live" | "sandbox" | null| any
}

export type ElementPayRate = {
  currency: string
  base_rate: number
  marked_up_rate: number
  markup_percentage: number
}

export type ElementPayOrderPayload = {
  user_address: string
  token: string // Token contract address
  order_type: 1 // Always 1 for off-ramp
  fiat_payload: {
    amount_fiat: number
    cashout_type: "PHONE"
    phone_number: string
    currency: "KES"
  }
  message_hash?: string // Encrypted message
  reason?: string // Optional reason field
}

export type WalletBalance = {
  token: ElementPayToken
  balance: number
  formattedBalance: string
}

export type DisbursementQuote = {
  token: Token
  cryptoAmount: number
  kesAmount: number
  rate: number
  networkFee: number
  serviceFee: number
  totalCost: number
  expiresAt: string
  quoteId: string
}

export type DisbursementOrder = {
  id: string
  quoteId: string
  user_address: string
  token: Token
  cryptoAmount: number
  kesAmount: number
  paymentDestination: PaymentDestination
  status: OrderStatus
  transactionHash?: string
  mpesaReference?: string
  created_at: string
  updated_at: string
  completed_at?: string
  estimatedCompletion?: string
}

export type PaymentProgress = {
  step: "wallet_confirmation" | "blockchain_processing" | "mpesa_processing" | "completed" | "failed"
  message: string
  estimatedTimeRemaining?: number
  transactionHash?: string
  mpesaReference?: string
}

export type ElementPayOrderResponse =any;