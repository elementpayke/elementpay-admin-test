"use client";

import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useSignMessage } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import { elementPayApiClient } from './elementpay-api-client';
import { elementPayRateService } from './elementpay-rate-service';
import { ELEMENTPAY_CONFIG } from './elementpay-config';
import type { ElementPayToken, ElementPayRate, ElementPayOrderResponse } from './types';
import React from 'react';
// Types
export type PaymentInput = {
  selectedToken: ElementPayToken;
  kesAmount: number;
  tokenAmount: number;
  phoneNumber: string;
  walletAddress: string;
  rate?: ElementPayRate;
};

export type PaymentResult = {
  success: boolean;
  orderId?: string;
  transactionHash?: string;
  approvalHash?: string;
  signature?: string;
  order?: ElementPayOrderResponse;
  error?: string;
};

export type PaymentProgress = (step: string, message: string) => void;

// Create ElementPay order via API
export async function createElementPayOrder(
  orderPayload: any,
  signature: string
): Promise<PaymentResult> {
  try {
    console.log("🚀 Creating ElementPay order...");
    const order = await elementPayApiClient.createOrder(orderPayload, signature);

    console.log("✅ Order created successfully:", { orderId: order.id, transactionHash: order.transaction_hash });

    return {
      success: true,
      orderId: order.id,
      transactionHash: order.transaction_hash,
      order,
    };

  } catch (error) {
    console.error("❌ Order creation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Order creation failed',
    };
  }
}

// Helper functions
function createOrderMessage(
  userAddress: string,
  token: ElementPayToken,
  kesAmount: number,
  phoneNumber: string,
  rate: ElementPayRate
): string {
  return `ElementPay Off-Ramp Order
User: ${userAddress}
Token: ${token.symbol}
Amount: ${kesAmount} KES
Phone: ${phoneNumber}
Rate: ${rate.marked_up_rate}
Timestamp: ${Date.now()}`;
}

function createOrderPayload(
  userAddress: string,
  token: ElementPayToken,
  kesAmount: number,
  phoneNumber: string,
  rate: ElementPayRate
) {
  return {
    user_address: userAddress,
    token: token.tokenAddress, // Use contract address, not symbol
    order_type: 1 as const, // OffRamp
    fiat_payload: {
      amount_fiat: kesAmount,
      cashout_type: "PHONE" as const,
      phone_number: phoneNumber,
      currency: "KES" as const,
    },
  };
}

// Mock signature function - replace with actual wagmi hook usage
async function signMessage(message: string): Promise<string> {
  // This would be replaced with useSignMessage hook in the component
  return `0x${Math.random().toString(16).substring(2, 130)}`;
}

// Utility function to get approval config for useWriteContract
export function getElementPayApprovalConfig(token: ElementPayToken, amount: number) {
  const approvalAmount = parseUnits(amount.toString(), token.decimals);
  const contractAddress = ELEMENTPAY_CONFIG.getContractAddress();

  console.log("🔧 Approval config:", {
    token: token.symbol,
    amount: amount.toString(),
    approvalAmount: approvalAmount.toString(),
    contractAddress,
    environment: ELEMENTPAY_CONFIG.getCurrentEnvironment(),
  });

  return {
    abi: erc20Abi,
    address: token.tokenAddress as `0x${string}`,
    functionName: 'approve' as const,
    args: [contractAddress as `0x${string}`, approvalAmount],
    chainId: token.chainId,
  };
}

export function useElementPaySignature() {
  return useSignMessage();
}

// Health check
export async function checkPaymentServiceHealth(): Promise<boolean> {
  try {
    return await elementPayApiClient.healthCheck();
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}
