"use client";

import React, { useState, useCallback } from "react";
import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useDisbursement } from "@/hooks/use-disbursement";
import { useEnvironment } from "@/hooks/use-environment";
import { useToast } from "@/components/ui/use-toast";
import { elementPayRateService } from "@/lib/elementpay-rate-service";
import { ELEMENTPAY_CONFIG } from "@/lib/elementpay-config";
import WalletConnection from "@/components/dashboard/wallet-connection";
import { AlertTriangle } from "lucide-react";
import {
  RecentTransactions,
  ElementPayCalculator,
} from "@/components/disbursement";
import type {
  Token,
  PaymentMethod,
  ElementPayToken,
  ElementPayRate,
} from "@/lib/types";
import error from "next/error";

// Types for payment data
interface PaymentEntry {
  id: string;
  phoneNumber: string;
  amount: string;
  isEditing?: boolean;
}

interface PaymentSummary {
  totalRecipients: number;
  totalAmount: number;
  currency: string;
}

type PaymentMode = "single" | "bulk";

export default function DisbursementPage() {
  const { user, elementPayToken } = useAuth();
  const { toast } = useToast();

  // Initialize API client with auth token when user is authenticated
  React.useEffect(() => {
    const { elementPayApiClient } = require("@/lib/elementpay-api-client");
    if (elementPayToken) {
      elementPayApiClient.setUserAuthToken(elementPayToken);
    } else {
      elementPayApiClient.clearUserAuthToken();
    }
  }, [elementPayToken]);

  // Use actual API data
  const {
    rates,
    isLoadingRates,
    currentQuote: hookCurrentQuote,
    isLoadingQuote,
    recentDisbursements,
    fetchRates,
    getQuote,
    createDisbursement,
    // ElementPay specific
    elementPayRates,
    walletBalances,
    isLoadingBalances,
    supportedTokens,
    fetchElementPayRates,
    fetchWalletBalances,
    processElementPayOffRamp,
  } = useDisbursement();

  // Wallet state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");

  // Payment mode state
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("single");

  // Single payment state
  const [singlePayment, setSinglePayment] = useState({
    phoneNumber: "",
    amount: "",
  });

  // Bulk payment state
  const [bulkPayments, setBulkPayments] = useState<PaymentEntry[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Form state
  const [selectedToken, setSelectedToken] = useState<Token>("BASE_USDC");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PHONE");

  // ElementPay state
  const [elementPayCalculation, setElementPayCalculation] = useState<{
    selectedToken: ElementPayToken | null;
    kesAmount: number;
    tokenAmount: number;
    rate: ElementPayRate | null;
    isValid: boolean;
    phoneNumber: string;
  } | null>(null);

  // Wallet connection handler
  const handleWalletConnection = useCallback(
    (connected: boolean, address?: string) => {
      setIsWalletConnected(connected);
      setWalletAddress(address || "");

      // Fetch wallet balances when connected (with debounce to prevent loops)
      if (connected && address && address !== walletAddress) {
        console.log("🔗 Fetching wallet balances for:", address);
        fetchWalletBalances(address).then(() => {
          console.log("💰 Current wallet balances:", walletBalances);
        });
      }
    },
    [walletAddress, fetchWalletBalances]
  );

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    const kenyanPhoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    return kenyanPhoneRegex.test(phone.replace(/\s/g, ""));
  };

  // Amount validation
  const validateAmount = (amount: string): boolean => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M KES
  };

  // Validate form
  const isFormValid = (): boolean => {
    if (!isWalletConnected) return false;

    // Check ElementPay calculation first
    if (elementPayCalculation?.isValid) {
      return true;
    }

    // Fallback to legacy validation
    if (paymentMode === "single") {
      return (
        validatePhoneNumber(singlePayment.phoneNumber) &&
        validateAmount(singlePayment.amount)
      );
    } else {
      return (
        bulkPayments.length > 0 &&
        bulkPayments.every(
          (p) => validatePhoneNumber(p.phoneNumber) && validateAmount(p.amount)
        )
      );
    }
  };

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6 !w-full">
          {/* Header */}
          <div className="flex flex-row w-full justify-between">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Crypto Off-Ramp
              </h1>
              <p className="text-muted-foreground">
                Convert your crypto tokens to KES and receive funds via M-PESA
              </p>
            </div>
            <WalletConnection
              onConnectionChange={handleWalletConnection}
              className="!w-fit"
            />
          </div>

          {/* Wallet Status */}
          {isWalletConnected && walletAddress && walletBalances.length > 0 && (
            <div className="bg-card border rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium mb-3">Wallet Balances</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {walletBalances.map((balance) => (
                  <div
                    key={balance.token.tokenAddress}
                    className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{balance.token.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {balance.token.chain}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {balance.formattedBalance}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {balance.token.symbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ElementPay Calculator */}
          <ElementPayCalculator
            onCalculationChange={setElementPayCalculation}
            // onProcessPayment={processPayments}
            walletBalances={walletBalances}
            supportedTokens={supportedTokens}
            walletAddress={walletAddress}
            isWalletConnected={isWalletConnected}
            className="mb-6"
          />

          {/* Recent Transactions */}
          <RecentTransactions recentDisbursements={recentDisbursements} />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
