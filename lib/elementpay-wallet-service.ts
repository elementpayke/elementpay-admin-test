import { ethers } from 'ethers'
import { parseUnits, formatUnits, erc20Abi } from 'viem'
import { writeContract, switchChain, getAccount, getBalance } from '@wagmi/core'
import { config as wagmiConfig } from './wagmi-config'
import { ELEMENTPAY_CONFIG, getCachedSupportedTokens, ERROR_MESSAGES } from './elementpay-config'
import { elementPayEncryption } from './elementpay-encryption'
import { environmentManager } from './api-config'
import type { ElementPayToken, ElementPayRate, ElementPayOrderPayload, WalletBalance } from './types'
import { elementPayApiClient } from './elementpay-api-client'

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

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
   * Get balance for a specific token using wagmi's getBalance
   * Note: This method requires wagmi config to be passed from the calling context
   */
  async getTokenBalance(userAddress: string, token: ElementPayToken, config?: any): Promise<WalletBalance> {
    try {
      console.log(`🔍 DETAILED: Getting balance for ${token.symbol} on ${token.chain}`)
      console.log(`📋 Input parameters:`, {
        userAddress,
        userAddressType: typeof userAddress,
        userAddressLength: userAddress?.length,
        tokenAddress: token.tokenAddress,
        tokenAddressType: typeof token.tokenAddress,
        tokenAddressLength: token.tokenAddress?.length,
        chainId: token.chainId,
        chainIdType: typeof token.chainId,
        decimals: token.decimals,
        decimalsType: typeof token.decimals,
        configProvided: !!config,
        configType: typeof config
      })

      // Validate inputs before calling getBalance
      if (!userAddress || !token.tokenAddress || !token.chainId) {
        throw new Error(`Invalid parameters: userAddress=${userAddress}, tokenAddress=${token.tokenAddress}, chainId=${token.chainId}`)
      }

      console.log(`🔧 Calling getBalance with parameters:`)
      const getBalanceParams = {
        address: userAddress as `0x${string}`,
        token: token.tokenAddress as `0x${string}`,
        chainId: token.chainId as any,
      }
      console.log(`📤 getBalance params:`, getBalanceParams)

      // Use wagmi's getBalance function with config if provided
      let balance
      try {
        console.log(`🔧 Using getBalance call`)
        balance = await getBalance(wagmiConfig, getBalanceParams)
        
        console.log(`📥 Raw getBalance response:`, {
          balance,
          balanceType: typeof balance,
          balanceKeys: balance ? Object.keys(balance) : 'null',
          value: balance?.value,
          valueType: typeof balance?.value,
          valueString: balance?.value?.toString(),
          formatted: balance?.formatted,
          formattedType: typeof balance?.formatted,
          symbol: balance?.symbol,
          decimals: balance?.decimals
        })
      } catch (balanceError) {
        console.error(`❌ getBalance call failed:`, balanceError)
        throw balanceError
      }

      if (!balance || balance.value === undefined) {
        throw new Error(`getBalance returned invalid response: ${JSON.stringify(balance)}`)
      }

      console.log(`🧮 Processing balance value:`)
      console.log(`📊 Raw value: ${balance.value.toString()} (type: ${typeof balance.value})`)
      console.log(`📊 Token decimals: ${token.decimals} (type: ${typeof token.decimals})`)
      
      const formattedBalance = formatUnits(balance.value, token.decimals)
      console.log(`📊 formatUnits result: ${formattedBalance} (type: ${typeof formattedBalance})`)
      
      const parsedBalance = parseFloat(formattedBalance)
      console.log(`📊 parseFloat result: ${parsedBalance} (type: ${typeof parsedBalance})`)
      
      const finalFormattedBalance = parsedBalance.toFixed(6)
      console.log(`📊 Final formatted: ${finalFormattedBalance}`)
      
      const result = {
        token,
        balance: parsedBalance,
        formattedBalance: finalFormattedBalance
      }
      
      console.log(`✅ Final balance result for ${token.symbol}:`, result)
      
      return result
    } catch (error) {
      console.error(`❌ DETAILED ERROR for ${token.symbol}:`, {
        error,
        tokenDetails: {
          symbol: token.symbol,
          address: token.tokenAddress,
          chainId: token.chainId,
          decimals: token.decimals
        },
        userAddress
      })
      return {
        token,
        balance: 0,
        formattedBalance: '0.000000'
      }
    }
  }

  /**
   * Check if user has sufficient balance
   */
  async checkSufficientBalance(
    userAddress: string,
    token: ElementPayToken,
    requiredAmount: number,
    config?: any
  ): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(userAddress, token, config)
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
      // Map token chain to correct wagmi chain ID
      const chainId = this.mapTokenToChainId(token)
      await switchChain(wagmiConfig, { chainId: chainId as any })
      return true
    } catch (error) {
      console.error(`Failed to switch to ${token.chain}:`, error)
      throw new Error(ERROR_MESSAGES.NETWORK_SWITCH_REQUIRED)
    }
  }

  /**
   * Get the correct chain ID for a token based on current environment
   */
  getChainIdForToken(token: ElementPayToken): number {
    return this.mapTokenToChainId(token)
  }

  /**
   * Simple chain mapping for common networks
   */
  private mapTokenToChainId(token: ElementPayToken): number {
    const isTestnet = environmentManager.isSandbox()
    const chainName = token.chain.toLowerCase()

    // Environment-aware chain mappings
    const chainMappings = {
      // Ethereum
      'ethereum': isTestnet ? 11155111 : 1, // Sepolia : Mainnet
      'mainnet': 1,

      // Base
      'base': isTestnet ? 84532 : 8453, // Base Sepolia : Base

      // Arbitrum
      'arbitrum': isTestnet ? 421614 : 42161, // Arbitrum Sepolia : Arbitrum One
      'arbitrum one': isTestnet ? 421614 : 42161,

      // Scroll
      'scroll': isTestnet ? 534351 : 534352, // Scroll Sepolia : Scroll

      // Lisk
      'lisk': isTestnet ? 4202 : 1135, // Lisk Sepolia : Lisk
    }

    // Try to match by chain name
    if (chainMappings[chainName as keyof typeof chainMappings]) {
      const chainId = chainMappings[chainName as keyof typeof chainMappings]
      console.log(`🔄 Mapped ${token.chain} (${token.env}) to chain ID: ${chainId} (${isTestnet ? 'testnet' : 'mainnet'})`)
      return chainId
    }

    // Fallback: use the token's chainId directly
    console.warn(`⚠️ Unknown chain "${token.chain}", using token chainId: ${token.chainId}`)
    return token.chainId
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
      const hash = await writeContract(wagmiConfig, {
        abi: erc20Abi,
        address: token.tokenAddress as `0x${string}`,
        functionName: 'approve',
        args: [
          ELEMENTPAY_CONFIG.getContractAddress() as `0x${string}`,
          amountInUnits
        ],
        chainId: token.chainId as any,
      } as any)

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
      console.log('📝 [WALLET-SERVICE] Creating signed message with:', {
        cashout_type: ELEMENTPAY_CONFIG.CASHOUT_TYPE,
        amount_fiat: kesAmount,
        currency: ELEMENTPAY_CONFIG.CURRENCY,
        rate: rate.marked_up_rate,
        phone_number: phoneNumber.substring(0, 8) + '***',
        expectedTokenAmount: (kesAmount / rate.marked_up_rate) + 0.01
      })

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
   * Simplified off-ramp process - only handles blockchain operations
   * Expects all validation to be done by the caller (ElementPay Calculator)
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
    console.log('🚀 [WALLET-SERVICE] Starting simplified off-ramp process:', {
      userAddress,
      token: token.symbol,
      kesAmount,
      phoneNumber: phoneNumber.substring(0, 8) + '***', // Mask phone for privacy
      rate: rate.marked_up_rate
    });

    try {
      // Calculate token amount - using marked_up_rate only as instructed by backend
      // Add 0.01 buffer as requested to account for precision differences
      const tokenAmount = (Number(kesAmount) / (rate.marked_up_rate || 1)).toFixed(token.decimals) 
      const tokenAmountInUnits = parseUnits(tokenAmount.toString(), token.decimals)
      console.log('💰 [WALLET-SERVICE] Calculated token amount:', {
        kesAmount,
        rate: rate.marked_up_rate,
        tokenAmount,
        tokenAmountType: typeof tokenAmount,
        tokenAmountToString: tokenAmount.toString(),
        tokenAmountInUnits: tokenAmountInUnits.toString(),
        tokenAmountInUnitsLength: tokenAmountInUnits.toString().length,
        tokenSymbol: token.symbol,
        tokenDecimals: token.decimals,
        calculation: `${kesAmount} / ${rate.marked_up_rate} + 0.01 = ${tokenAmount}`
      });

      // Step 1: Switch network if needed
      console.log('🔄 [WALLET-SERVICE] Step 1: Network switch');
      onProgress?.('network_switch', `Switching to ${token.chain} network...`)
      await this.switchToTokenNetwork(token)
      console.log('✅ [WALLET-SERVICE] Network switch completed');

      // Step 2: Approve token spending
      console.log('🔄 [WALLET-SERVICE] Step 2: Token approval');
      onProgress?.('token_approval', 'Requesting token approval...')

      // Debug what we're actually approving
      const approvalAmountInUnits = parseUnits(tokenAmount.toString(), token.decimals)
      console.log('🔍 [WALLET-SERVICE] Approval details:', {
        tokenAmount,
        tokenDecimals: token.decimals,
        approvalAmountInUnits: approvalAmountInUnits.toString(),
        approvalAmountReadable: parseFloat(tokenAmount.toString()).toFixed(6)
      })

      const approvalHash = await this.approveTokenSpending(token, Number(tokenAmount))
      console.log('✅ [WALLET-SERVICE] Token approval successful:', approvalHash);

      // Step 3: Sign order message
      console.log('🔄 [WALLET-SERVICE] Step 3: Message signing');
      onProgress?.('message_signing', 'Requesting message signature...')
      const { signature, orderPayload } = await this.signOrderMessage(
        userAddress,
        token,
        kesAmount,
        phoneNumber,
        rate
      )
      console.log('✅ [WALLET-SERVICE] Message signing successful');

      const result = {
        approvalHash,
        signature,
        orderPayload
      };

      console.log('🎉 [WALLET-SERVICE] Off-ramp process completed successfully:', {
        approvalHash,
        signature: signature.substring(0, 10) + '...',
        hasOrderPayload: !!orderPayload
      });

      return result;
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
      const account = getAccount(wagmiConfig)
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

/**
 * Simple utility function for chain mapping
 * Can be used anywhere without instantiating the wallet service
 */
export function getChainIdForToken(token: ElementPayToken): number {
  const isTestnet = environmentManager.isSandbox()
  const chainName = token.chain.toLowerCase()

  const chainMappings = {
    'ethereum': isTestnet ? 11155111 : 1,
    'mainnet': 1,
    'base': isTestnet ? 84532 : 8453,
    'arbitrum': isTestnet ? 421614 : 42161,
    'arbitrum one': isTestnet ? 421614 : 42161,
    'scroll': isTestnet ? 534351 : 534352,
    'lisk': isTestnet ? 4202 : 1135,
  }

  return chainMappings[chainName as keyof typeof chainMappings] || token.chainId
}

