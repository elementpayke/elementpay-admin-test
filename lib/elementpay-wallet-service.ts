import { ethers } from 'ethers'
import { parseUnits, formatUnits, erc20Abi } from 'viem'
import { writeContract, switchChain, getAccount, getBalance } from '@wagmi/core'
import { getConfig } from '@wagmi/core'
import { ELEMENTPAY_CONFIG, getCachedSupportedTokens, ERROR_MESSAGES } from './elementpay-config'
import { elementPayEncryption } from './elementpay-encryption'
import type { ElementPayToken, ElementPayRate, ElementPayOrderPayload, WalletBalance } from './types'

/**
 * ElementPay Wallet Service
 * Handles wallet interactions for ElementPay off-ramping
 */
class ElementPayWalletService {
  /**
   * Get wallet balances for all supported tokens
   */
  async getWalletBalances(userAddress: string): Promise<WalletBalance[]> {
    if (!userAddress) {
      console.warn('No user address provided for balance fetch')
      return []
    }

    console.log(`Fetching balances for address: ${userAddress}`)
    const balances: WalletBalance[] = []
    
    // Get supported tokens dynamically
    const supportedTokens = getCachedSupportedTokens()

    for (const token of supportedTokens) {
      try {
        console.log(`Fetching balance for ${token.symbol} on ${token.chain}`)
        const balance = await this.getTokenBalance(userAddress, token)
        balances.push(balance)
        console.log(`Successfully fetched ${token.symbol} balance: ${balance.formattedBalance}`)
      } catch (error) {
        console.error(`Failed to get balance for ${token.symbol}:`, error)
        // Add zero balance for failed tokens to prevent breaking the UI
        balances.push({
          token,
          balance: 0,
          formattedBalance: '0.00'
        })
      }
    }

    console.log(`Completed balance fetch for ${balances.length} tokens`)
    return balances
  }

  /**
   * Get balance for a specific token
   */
  async getTokenBalance(userAddress: string, token: ElementPayToken): Promise<WalletBalance> {
    try {
      const config = getConfig()
      const balance = await getBalance(config, {
        address: userAddress as `0x${string}`,
        token: token.tokenAddress as `0x${string}`,
        chainId: token.chainId,
      })

      const formattedBalance = formatUnits(balance.value, token.decimals)
      
      return {
        token,
        balance: parseFloat(formattedBalance),
        formattedBalance: parseFloat(formattedBalance).toFixed(6)
      }
    } catch (error) {
      console.error(`Failed to get balance for ${token.symbol}:`, error)
      return {
        token,
        balance: 0,
        formattedBalance: '0.00'
      }
    }
  }

  /**
   * Check if user has sufficient balance
   */
  async checkSufficientBalance(
    userAddress: string,
    token: ElementPayToken,
    requiredAmount: number
  ): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(userAddress, token)
      return balance.balance >= requiredAmount
    } catch (error) {
      console.error('Failed to check balance:', error)
      return false
    }
  }

  /**
   * Switch to the correct network for the token
   */
  async switchToTokenNetwork(token: ElementPayToken): Promise<boolean> {
    try {
      const config = getConfig()
      await switchChain(config, { chainId: token.chainId })
      return true
    } catch (error) {
      console.error(`Failed to switch to ${token.chain}:`, error)
      throw new Error(ERROR_MESSAGES.NETWORK_SWITCH_REQUIRED)
    }
  }

  /**
   * Approve ElementPay contract to spend tokens
   */
  async approveTokenSpending(
    token: ElementPayToken,
    amount: number
  ): Promise<string> {
    try {
      // Ensure we're on the correct network
      await this.switchToTokenNetwork(token)

      // Convert amount to proper units
      const amountInUnits = parseUnits(amount.toString(), token.decimals)

      // Execute approval transaction
      const config = getConfig()
      const hash = await writeContract(config, {
        abi: erc20Abi,
        address: token.tokenAddress as `0x${string}`,
        functionName: 'approve',
        args: [
          ELEMENTPAY_CONFIG.getContractAddress() as `0x${string}`,
          amountInUnits
        ]
      })

      return hash
    } catch (error) {
      console.error('Token approval failed:', error)
      throw new Error(ERROR_MESSAGES.APPROVAL_FAILED)
    }
  }

  /**
   * Sign message for ElementPay order
   */
  async signOrderMessage(
    userAddress: string,
    token: ElementPayToken,
    kesAmount: number,
    phoneNumber: string,
    rate: ElementPayRate
  ): Promise<{ signature: string; orderPayload: ElementPayOrderPayload }> {
    try {
      // Ensure we have a provider
      if (!window.ethereum) {
        throw new Error('MetaMask not found')
      }

      // Create encrypted message hash using the detailed method
      const messageHash = elementPayEncryption.encryptMessageDetailed({
        cashout_type: ELEMENTPAY_CONFIG.CASHOUT_TYPE,
        amount_fiat: kesAmount,
        currency: ELEMENTPAY_CONFIG.CURRENCY,
        rate: rate.marked_up_rate,
        phone_number: phoneNumber
      })

      // Create order payload
      const orderPayload: ElementPayOrderPayload = {
        user_address: userAddress,
        token: token.tokenAddress,
        order_type: ELEMENTPAY_CONFIG.ORDER_TYPE,
        fiat_payload: {
          amount_fiat: kesAmount,
          cashout_type: ELEMENTPAY_CONFIG.CASHOUT_TYPE,
          phone_number: phoneNumber,
          currency: ELEMENTPAY_CONFIG.CURRENCY,
        },
        message_hash: messageHash,
        reason: "Off-ramp" // Add reason field as per requirements
      }

      // Sign the message
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const message = JSON.stringify(orderPayload)
      const signature = await signer.signMessage(message)

      return { signature, orderPayload }
    } catch (error) {
      console.error('Message signing failed:', error)
      throw new Error(ERROR_MESSAGES.SIGNING_FAILED)
    }
  }

  /**
   * Complete off-ramp process (approval + signing)
   */
  async processOffRamp(
    userAddress: string,
    token: ElementPayToken,
    kesAmount: number,
    phoneNumber: string,
    rate: ElementPayRate,
    onProgress?: (step: string, message: string) => void
  ): Promise<{
    approvalHash: string
    signature: string
    orderPayload: ElementPayOrderPayload
  }> {
    try {
      // Step 1: Check balance
      onProgress?.('balance_check', 'Checking wallet balance...')
      const tokenAmount = kesAmount / rate.marked_up_rate
      const hasSufficientBalance = await this.checkSufficientBalance(
        userAddress,
        token,
        tokenAmount
      )

      if (!hasSufficientBalance) {
        throw new Error(ERROR_MESSAGES.INSUFFICIENT_BALANCE)
      }

      // Step 2: Switch network if needed
      onProgress?.('network_switch', `Switching to ${token.chain} network...`)
      await this.switchToTokenNetwork(token)

      // Step 3: Approve token spending
      onProgress?.('token_approval', 'Requesting token approval...')
      const approvalHash = await this.approveTokenSpending(token, tokenAmount)

      // Step 4: Sign order message
      onProgress?.('message_signing', 'Requesting message signature...')
      const { signature, orderPayload } = await this.signOrderMessage(
        userAddress,
        token,
        kesAmount,
        phoneNumber,
        rate
      )

      return {
        approvalHash,
        signature,
        orderPayload
      }
    } catch (error) {
      console.error('Off-ramp process failed:', error)
      throw error
    }
  }

  /**
   * Get current wallet account
   */
  getCurrentAccount(): { address: string; chainId: number } | null {
    try {
      const config = getConfig()
      const account = getAccount(config)
      if (account.address && account.chainId) {
        return {
          address: account.address,
          chainId: account.chainId
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get current account:', error)
      return null
    }
  }

  /**
   * Check if wallet is connected to correct network for token
   */
  isCorrectNetwork(token: ElementPayToken): boolean {
    const account = this.getCurrentAccount()
    return account?.chainId === token.chainId
  }

  /**
   * Format phone number for ElementPay API
   */
  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('254')) {
      return `+${cleaned}`
    } else if (cleaned.startsWith('0')) {
      return `+254${cleaned.substring(1)}`
    }
    return phone
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    const kenyanPhoneRegex = /^(\+254|254|0)?[17]\d{8}$/
    return kenyanPhoneRegex.test(phone.replace(/\s/g, ''))
  }
}

// Create singleton instance
export const elementPayWalletService = new ElementPayWalletService()

// Export for direct usage
export { ElementPayWalletService }

