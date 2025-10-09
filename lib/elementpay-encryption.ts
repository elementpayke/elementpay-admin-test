import Fernet from 'fernet'
import { ELEMENTPAY_CONFIG } from './elementpay-config'

/**
 * ElementPay Encryption Service
 * Handles Fernet encryption for message hashes required by ElementPay API
 */
class ElementPayEncryption {
  private secret: any

  constructor() {
    try {
      this.secret = new Fernet.Secret(ELEMENTPAY_CONFIG.SECRET_KEY)
    } catch (error) {
      console.error('Failed to initialize Fernet secret:', error)
      throw new Error('Encryption initialization failed')
    }
  }

  /**
   * Encrypt message for ElementPay API
   * Format: PHONE:phoneNumber:amountFiat:currency:rate
   */
  encryptMessage(
    phoneNumber: string,
    amountFiat: number,
    currency: string,
    rate: number
  ): string {
    try {
      const message = `PHONE:${phoneNumber}:${amountFiat}:${currency}:${rate}`
      
      const token = new Fernet.Token({
        secret: this.secret,
        time: Math.floor(Date.now() / 1000),
      })
      
      return token.encode(message)
    } catch (error) {
      console.error('Message encryption failed:', error)
      throw new Error('Failed to encrypt message')
    }
  }

  /**
   * Encrypt message with detailed payload for off-ramping
   * Enhanced version that matches the user requirements
   */
  encryptMessageDetailed(payload: {
    cashout_type: string;
    amount_fiat: number;
    currency: string;
    rate: number;
    phone_number: string;
  }): string {
    try {
      const message = `${payload.cashout_type}:${payload.phone_number}:${payload.amount_fiat}:${payload.currency}:${payload.rate}`
      
      const token = new Fernet.Token({
        secret: this.secret,
        time: Math.floor(Date.now() / 1000),
      })
      
      return token.encode(message)
    } catch (error) {
      console.error('Detailed message encryption failed:', error)
      throw new Error('Failed to encrypt message')
    }
  }

  /**
   * Decrypt message (for testing/debugging purposes)
   */
  decryptMessage(encryptedMessage: string): string {
    try {
      const token = new Fernet.Token({
        secret: this.secret,
        token: encryptedMessage,
        ttl: 0, // No TTL check for debugging
      })
      
      return token.decode()
    } catch (error) {
      console.error('Message decryption failed:', error)
      throw new Error('Failed to decrypt message')
    }
  }

  /**
   * Validate encryption setup
   */
  validateSetup(): boolean {
    try {
      const testMessage = 'test'
      const encrypted = this.encryptMessage('+254712345678', 1000, 'KES', 130.5)
      return encrypted.length > 0
    } catch (error) {
      console.error('Encryption validation failed:', error)
      return false
    }
  }
}

// Create singleton instance
export const elementPayEncryption = new ElementPayEncryption()

// Export for direct usage
export { ElementPayEncryption }

