/**
 * ElementPay Environment Integration Test
 * This file demonstrates and tests the environment switching functionality
 */

import { ELEMENTPAY_CONFIG } from './elementpay-config'
import { switchEnvironment, getCurrentEnvironment } from './api-config'

/**
 * Test environment switching functionality
 */
export function testElementPayEnvironmentIntegration() {
  console.log('🧪 Testing ElementPay Environment Integration')
  
  // Test initial state
  console.log('📍 Current environment:', getCurrentEnvironment())
  console.log('🔗 Current aggregator URL:', ELEMENTPAY_CONFIG.getAggregatorUrl())
  
  // Test sandbox switch
  console.log('\n🔄 Switching to sandbox...')
  switchEnvironment('sandbox')
  console.log('📍 Environment after switch:', getCurrentEnvironment())
  console.log('🔗 Sandbox aggregator URL:', ELEMENTPAY_CONFIG.getAggregatorUrl())
  console.log('🏖️ Is sandbox?', ELEMENTPAY_CONFIG.isSandbox())
  
  // Test live switch
  console.log('\n🔄 Switching to live...')
  switchEnvironment('live')
  console.log('📍 Environment after switch:', getCurrentEnvironment())
  console.log('🔗 Live aggregator URL:', ELEMENTPAY_CONFIG.getAggregatorUrl())
  console.log('🏖️ Is sandbox?', ELEMENTPAY_CONFIG.isSandbox())
  
  // Test configuration
  console.log('\n⚙️ ElementPay Configuration:')
  console.log('- Contract Address:', ELEMENTPAY_CONFIG.CONTRACT_ADDRESS)
  console.log('- Cashout Type:', ELEMENTPAY_CONFIG.CASHOUT_TYPE)
  console.log('- Currency:', ELEMENTPAY_CONFIG.CURRENCY)
  console.log('- Order Type:', ELEMENTPAY_CONFIG.ORDER_TYPE)
  
  console.log('\n✅ Environment integration test completed!')
}

/**
 * Get environment-specific URLs for debugging
 */
export function getEnvironmentUrls() {
  const currentEnv = getCurrentEnvironment()
  const aggregatorUrl = ELEMENTPAY_CONFIG.getAggregatorUrl()
  
  return {
    environment: currentEnv,
    aggregatorUrl,
    isSandbox: ELEMENTPAY_CONFIG.isSandbox(),
    rateEndpoint: `${aggregatorUrl}/rates`,
    orderEndpoint: `${aggregatorUrl}/orders`,
    healthEndpoint: `${aggregatorUrl}/health`,
  }
}

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).testElementPayEnvironment = testElementPayEnvironmentIntegration
  (window as any).getElementPayUrls = getEnvironmentUrls
}



