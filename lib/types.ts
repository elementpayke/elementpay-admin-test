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

export type OrderStatus = "pending" | "processing" | "settled" | "failed" | "cancelled"

export type Currency = "KES"

export type Token = "BASE_USDC" | "ETH" | "BTC"

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
  expiresAt: string
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