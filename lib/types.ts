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
}

export type ApiKeyWithMasked = ApiKey & {
  maskedKey: string
  isRevealed: boolean
}
