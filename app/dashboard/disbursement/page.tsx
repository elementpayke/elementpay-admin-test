"use client";

import { useState, useCallback } from "react";
import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useDisbursement } from "@/hooks/use-disbursement";
import { useToast } from "@/components/ui/use-toast";
import WalletConnection from "@/components/dashboard/wallet-connection";
import {
  PaymentModeSelection,
  PaymentSummary,
  PaymentProgress as PaymentProgressComponent,
  RecentTransactions,
  ElementPayCalculator,
} from "@/components/disbursement";
import type {
  Token,
  PaymentMethod,
  PaymentDestination,
  TokenBalance,
  DisbursementQuote,
  DisbursementOrder,
  PaymentProgress,
  ElementPayToken,
  ElementPayRate,
} from "@/lib/types";

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
  const { user } = useAuth();
  const { toast } = useToast();

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

  // UI state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentProgress, setPaymentProgress] =
    useState<PaymentProgress | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ElementPay state
  const [elementPayCalculation, setElementPayCalculation] = useState<{
    selectedToken: ElementPayToken | null;
    kesAmount: number;
    tokenAmount: number;
    rate: ElementPayRate | null;
    isValid: boolean;
    phoneNumber: string;
  } | null>(null);

  // Get token balance for selected token
  const selectedTokenBalance = { balance: 125.5, token: selectedToken };
  // Get current rate from rates data
  const currentRate = rates?.[selectedToken]?.rate || 130.5; // Mock rate for demo

  // Wallet connection handler
  const handleWalletConnection = useCallback(
    (connected: boolean, address?: string) => {
      setIsWalletConnected(connected);
      setWalletAddress(address || "");

      // Fetch wallet balances when connected (with debounce to prevent loops)
      if (connected && address && address !== walletAddress) {
        console.log("Fetching wallet balances for:", address);
        fetchWalletBalances(address);
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

  // Format phone number
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("254")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+254${cleaned.substring(1)}`;
    }
    return phone;
  };

  // Calculate payment summary
  const getPaymentSummary = (): PaymentSummary => {
    // Use ElementPay calculation if available
    if (elementPayCalculation?.isValid) {
      return {
        totalRecipients: 1,
        totalAmount: elementPayCalculation.kesAmount,
        currency: "KES",
      };
    }

    // Fallback to legacy calculation
    if (paymentMode === "single") {
      return {
        totalRecipients:
          singlePayment.phoneNumber && singlePayment.amount ? 1 : 0,
        totalAmount: parseFloat(singlePayment.amount) || 0,
        currency: "KES",
      };
    } else {
      const validPayments = bulkPayments.filter(
        (p) => validatePhoneNumber(p.phoneNumber) && validateAmount(p.amount)
      );
      return {
        totalRecipients: validPayments.length,
        totalAmount: validPayments.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        ),
        currency: "KES",
      };
    }
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

  // Process ElementPay off-ramp
  const processElementPayPayment = async () => {
    if (!elementPayCalculation?.isValid || !walletAddress) return;

    setIsProcessingPayment(true);

    try {
      const result = await processElementPayOffRamp(
        walletAddress,
        elementPayCalculation.selectedToken!,
        elementPayCalculation.kesAmount,
        elementPayCalculation.phoneNumber,
        (step, message) => {
          setPaymentProgress({ step: step as any, message });
        }
      );

      setPaymentProgress({
        step: "completed",
        message: `Successfully created order ${result.orderId}. Your payment is being processed.`,
      });

      // Reset form
      setElementPayCalculation(null);
      setShowConfirmDialog(false);
    } catch (error) {
      setPaymentProgress({
        step: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Payment processing failed. Please try again.",
      });
    } finally {
      setIsProcessingPayment(false);
      setTimeout(() => setPaymentProgress(null), 5000);
    }
  };

  // Legacy process payments (for backward compatibility)
  const processPayments = async () => {
    if (elementPayCalculation?.isValid) {
      return processElementPayPayment();
    }

    // Fallback to legacy processing
    if (!isFormValid()) return;

    setIsProcessingPayment(true);
    setPaymentProgress({
      step: "blockchain_processing",
      message: "Processing your payment request...",
    });

    try {
      const summary = getPaymentSummary();

      // Mock processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setPaymentProgress({
        step: "completed",
        message: `Successfully processed ${
          summary.totalRecipients
        } payment(s) totaling KES ${summary.totalAmount.toLocaleString()}`,
      });

      toast({
        title: "Payments Processed",
        description: `${summary.totalRecipients} payment(s) sent successfully`,
      });

      // Reset form
      if (paymentMode === "single") {
        setSinglePayment({ phoneNumber: "", amount: "" });
      } else {
        setBulkPayments([]);
        setUploadedFile(null);
      }

      setShowConfirmDialog(false);
    } catch (error) {
      setPaymentProgress({
        step: "failed",
        message: "Payment processing failed. Please try again.",
      });

      toast({
        title: "Payment Failed",
        description: "There was an error processing your payments",
      });
    } finally {
      setIsProcessingPayment(false);
      setTimeout(() => setPaymentProgress(null), 5000);
    }
  };

  const summary = getPaymentSummary();

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
            walletBalances={walletBalances}
            className="mb-6"
            supportedTokens={supportedTokens}
          />

          {/* Legacy Payment Mode Selection (for backward compatibility) */}
          {/* <PaymentModeSelection
            paymentMode={paymentMode}
            onPaymentModeChange={setPaymentMode}
            singlePayment={singlePayment}
            onSinglePaymentChange={(field, value) =>
              setSinglePayment((prev) => ({ ...prev, [field]: value }))
            }
            bulkPayments={bulkPayments}
            uploadedFile={uploadedFile}
            onBulkPaymentsChange={setBulkPayments}
            onUploadedFileChange={setUploadedFile}
            validatePhoneNumber={validatePhoneNumber}
            validateAmount={validateAmount}
          /> */}

          {/* Off-Ramp Confirmation & Submit */}
          {elementPayCalculation?.isValid && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Confirm Off-Ramp Transaction
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Token to send:</span>
                  <span className="font-medium">
                    {elementPayCalculation.tokenAmount.toFixed(6)}{" "}
                    {elementPayCalculation.selectedToken?.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>KES to receive:</span>
                  <span className="font-medium">
                    KES {elementPayCalculation.kesAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Phone number:</span>
                  <span className="font-medium">
                    {elementPayCalculation.phoneNumber}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Network:</span>
                  <span>{elementPayCalculation.selectedToken?.chain}</span>
                </div>
              </div>

              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={isProcessingPayment || !isFormValid()}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingPayment ? "Processing..." : "Confirm Off-Ramp"}
              </button>

              {/* Confirmation Dialog */}
              {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-card p-6 rounded-lg max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">
                      Confirm Transaction
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      You are about to send{" "}
                      {elementPayCalculation.tokenAmount.toFixed(6)}{" "}
                      {elementPayCalculation.selectedToken?.symbol}
                      to receive KES{" "}
                      {elementPayCalculation.kesAmount.toLocaleString()} via
                      M-PESA.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowConfirmDialog(false)}
                        className="flex-1 border border-border hover:bg-accent h-10 px-4 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={processPayments}
                        disabled={isProcessingPayment}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded-md"
                      >
                        {isProcessingPayment ? "Processing..." : "Confirm"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Progress */}
          <PaymentProgressComponent paymentProgress={paymentProgress} />

          {/* Recent Transactions */}
          <RecentTransactions recentDisbursements={recentDisbursements} />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
