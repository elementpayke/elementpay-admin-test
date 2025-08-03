import type { User, ApiKey, Environment } from "./types"
import bcrypt from "bcryptjs"

const users: User[] = []
const apiKeys: ApiKey[] = []

// Helper to generate a random API key
function generateApiKey(environment: Environment): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < 32; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  const prefix = environment === "mainnet" ? "mk-" : "tk-"
  return `${prefix}${result}`
}

// User functions
export function getUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email)
}

export async function verifyPassword(password: string, hashedPassword?: string): Promise<boolean> {
  if (!hashedPassword) return false
  return bcrypt.compare(password, hashedPassword)
}

export function createUser(name: string, email: string, passwordPlain: string): User | null {
  if (getUserByEmail(email)) {
    return null // User already exists
  }

  const hashedPassword = bcrypt.hashSync(passwordPlain, 10)
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString() // 6-digit code

  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email,
    password: hashedPassword,
    emailVerified: false, // Set to false initially
    verificationCode,
  }
  users.push(newUser)
  console.log(`User created: ${newUser.email}, Verification Code: ${newUser.verificationCode}`)
  return newUser
}

export function verifyUserEmail(email: string, code: string): boolean {
  const user = getUserByEmail(email)
  if (user && user.verificationCode === code && !user.emailVerified) {
    user.emailVerified = true
    user.verificationCode = undefined // Clear the code after verification
    console.log(`Email verified for user: ${user.email}`)
    return true
  }
  return false
}

export function resendVerificationCode(email: string): boolean {
  const user = getUserByEmail(email)
  if (user && !user.emailVerified) {
    user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    console.log(`New verification code for ${user.email}: ${user.verificationCode}`)
    return true
  }
  return false
}

// API Key functions
export function getApiKeysByUserId(userId: string, environment?: Environment): ApiKey[] {
  const userKeys = apiKeys.filter((key) => key.userId === userId && key.status === "active")
  if (environment) {
    return userKeys.filter((key) => key.environment === environment)
  }
  return userKeys
}

export function createApiKey(userId: string, name: string, environment: Environment): ApiKey {
  const newKey: ApiKey = {
    id: crypto.randomUUID(),
    userId,
    name,
    key: generateApiKey(environment),
    environment,
    status: "active",
    createdAt: new Date().toISOString(),
  }
  apiKeys.push(newKey)
  return newKey
}

export function regenerateApiKey(id: string, userId: string): ApiKey | null {
  const index = apiKeys.findIndex((key) => key.id === id && key.userId === userId)
  if (index === -1) {
    return null
  }
  apiKeys[index].key = generateApiKey(apiKeys[index].environment)
  apiKeys[index].createdAt = new Date().toISOString()
  return apiKeys[index]
}

export function revokeApiKey(id: string, userId: string): boolean {
  const index = apiKeys.findIndex((key) => key.id === id && key.userId === userId)
  if (index === -1) {
    return false
  }
  apiKeys[index].status = "revoked"
  return true
}

export function deleteApiKey(id: string, userId: string): boolean {
  const initialLength = apiKeys.length
  const updatedKeys = apiKeys.filter((key) => !(key.id === id && key.userId === userId))
  apiKeys.splice(0, apiKeys.length, ...updatedKeys) // Mutate the original array
  return apiKeys.length < initialLength
}

// Seed some initial data for testing
if (users.length === 0) {
  const testUser = createUser("Test User", "test@example.com", "password123")
  if (testUser) {
    testUser.emailVerified = true // Auto-verify for easier testing
    testUser.verificationCode = undefined
    createApiKey(testUser.id, "Production API Key", "mainnet")
    createApiKey(testUser.id, "Development API Key", "testnet")
    createApiKey(testUser.id, "Another Testnet Key", "testnet")
  }
}
