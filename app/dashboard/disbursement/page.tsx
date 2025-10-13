"use client";

import React, { useState, useCallback } from "react";
import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useDisbursement } from "@/hooks/use-disbursement";
import { useEnvironment } from "@/hooks/use-environment";
import { useToast } from "@/components/ui/use-toast";
import {
  createElementPayOrder,
  type PaymentInput,
} from "@/lib/elementpay-payment-processor";
import { elementPayRateService } from "@/lib/elementpay-rate-service";
import { ELEMENTPAY_CONFIG } from "@/lib/elementpay-config";
import { parseUnits, erc20Abi } from "viem";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import WalletConnection from "@/components/dashboard/wallet-connection";
import { AlertTriangle } from "lucide-react";
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

  // UI state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentProgress, setPaymentProgress] =
    useState<PaymentProgress | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentPaymentConfig, setCurrentPaymentConfig] = useState<any>(null);

  // Wagmi hooks for blockchain interactions
  const { switchChainAsync } = useSwitchChain();
  const { writeContract, data: approvalHash } = useWriteContract();
  const { isSuccess: approvalSuccess } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });
  const { signMessageAsync, data: signature } = useSignMessage();

  // Handle approval completion
  React.useEffect(() => {
    if (approvalSuccess && currentPaymentConfig && isProcessingPayment) {
      console.log("✅ Token approval completed, proceeding to signing...");
      handleMessageSigning();
    }
  }, [approvalSuccess, currentPaymentConfig, isProcessingPayment]);

  // Handle signature completion
  React.useEffect(() => {
    if (signature && currentPaymentConfig && isProcessingPayment) {
      console.log("✅ Message signed, creating order...");
      handleOrderCreation();
    }
  }, [signature, currentPaymentConfig, isProcessingPayment]);

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

  console.log("Element Calculation inasema : ", elementPayCalculation);

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

  // Legacy process payments (for backward compatibility)
  // Process ElementPay payments - REAL blockchain transactions
  const processPayments = async () => {
    if (elementPayCalculation?.isValid && walletAddress) {
      setIsProcessingPayment(true);
      setPaymentProgress({
        step: "blockchain_processing",
        message: "Preparing payment...",
      });

      try {
        const paymentInput = {
          selectedToken: elementPayCalculation.selectedToken!,
          kesAmount: elementPayCalculation.kesAmount,
          tokenAmount: elementPayCalculation.tokenAmount,
          phoneNumber: elementPayCalculation.phoneNumber,
          walletAddress,
          rate: elementPayCalculation.rate,
        };

        // Get rate if not available
        let rate = elementPayCalculation.rate;
        if (!rate) {
          setPaymentProgress({
            step: "blockchain_processing",
            message: "Fetching exchange rate...",
          });
          rate = await elementPayRateService.fetchRate(
            elementPayCalculation.selectedToken!.symbol
          );
          if (!rate) throw new Error("Failed to fetch exchange rate");
        }

        // Create order payload and message for signing
        const orderPayload = {
          user_address: paymentInput.walletAddress,
          token: paymentInput.selectedToken.tokenAddress, // Use contract address
          order_type: 1 as const, // OffRamp
          fiat_payload: {
            amount_fiat: paymentInput.kesAmount,
            cashout_type: "PHONE" as const,
            phone_number: paymentInput.phoneNumber,
            currency: "KES" as const,
          },
        };

        const message = `ElementPay Off-Ramp Order
User: ${paymentInput.walletAddress}
Token: ${paymentInput.selectedToken.symbol}
Amount: ${paymentInput.kesAmount} KES
Phone: ${paymentInput.phoneNumber}
Rate: ${rate.marked_up_rate}
Timestamp: ${Date.now()}`;

        setCurrentPaymentConfig({ orderPayload, message });

        // Step 1: Switch network if needed
        setPaymentProgress({
          step: "blockchain_processing",
          message: `Switching to ${
            elementPayCalculation.selectedToken!.chain
          } network...`,
        });

        try {
          await switchChainAsync({
            chainId: elementPayCalculation.selectedToken!.chainId,
          });
          console.log("✅ Network switched successfully");
        } catch (networkError) {
          console.warn(
            "Network switch failed or already on correct network:",
            networkError
          );
        }

        // Step 2: Start token approval
        await startTokenApproval({ orderPayload, message });
      } catch (error) {
        console.error(
          "❌ [DISBURSEMENT-PAGE] Payment preparation failed:",
          error
        );
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Payment processing failed. Please try again.";
        setPaymentProgress({
          step: "failed",
          message: errorMessage,
        });
        setIsProcessingPayment(false);
        setCurrentPaymentConfig(null);
        throw error;
      }
    }
  };

  // Start token approval process
  const startTokenApproval = async (walletConfig: any) => {
    setPaymentProgress({
      step: "blockchain_processing",
      message: "Approving token spending...",
    });

    // Create approval config with correct contract address
    const contractAddress = ELEMENTPAY_CONFIG.getContractAddress();
    const approvalAmount = parseUnits(
      elementPayCalculation!.tokenAmount.toString(),
      elementPayCalculation!.selectedToken!.decimals
    );

    const approvalConfig = {
      abi: erc20Abi,
      address: elementPayCalculation!.selectedToken!
        .tokenAddress as `0x${string}`,
      functionName: "approve" as const,
      args: [contractAddress as `0x${string}`, approvalAmount],
    };

    console.log("🔧 Approving token spending:", {
      token: elementPayCalculation!.selectedToken!.symbol,
      amount: elementPayCalculation!.tokenAmount,
      contractAddress,
      approvalAmount: approvalAmount.toString(),
      environment: ELEMENTPAY_CONFIG.getCurrentEnvironment(),
    });

    try {
      // Execute approval - this will trigger the approval hash
      await writeContract({
        ...approvalConfig,
        account: walletAddress as `0x${string}`,
      } as any);
    } catch (error) {
      console.error("❌ Approval transaction failed:", error);
      setPaymentProgress({
        step: "failed",
        message: "Token approval failed",
      });
      setIsProcessingPayment(false);
      setCurrentPaymentConfig(null);
      throw new Error("Token approval failed");
    }
  };

  // Handle message signing after approval
  const handleMessageSigning = async () => {
    if (!currentPaymentConfig) return;

    setPaymentProgress({
      step: "blockchain_processing",
      message: "Approval confirmed, signing message...",
    });

    try {
      await signMessageAsync({
        account: walletAddress as `0x${string}`,
        message: currentPaymentConfig.message,
      });
    } catch (error) {
      console.error("❌ Message signing failed:", error);
      setPaymentProgress({
        step: "failed",
        message: "Message signing failed",
      });
      setIsProcessingPayment(false);
      setCurrentPaymentConfig(null);
    }
  };

  // Handle order creation after signing
  const handleOrderCreation = async () => {
    if (!currentPaymentConfig || !signature) return;

    setPaymentProgress({
      step: "blockchain_processing",
      message: "Creating payment order...",
    });

    try {
      const result = await createElementPayOrder(
        currentPaymentConfig.orderPayload,
        signature
      );

      if (result.success) {
        setPaymentProgress({
          step: "completed",
          message: `Successfully processed KES ${elementPayCalculation!.kesAmount.toLocaleString()} payment`,
        });

        toast({
          title: "Payment Successful",
          description: `Order ${result.orderId} has been created and is being processed`,
        });
      } else {
        throw new Error(result.error || "Order creation failed");
      }
    } catch (error) {
      console.error("❌ Order creation failed:", error);
      setPaymentProgress({
        step: "failed",
        message:
          error instanceof Error ? error.message : "Order creation failed",
      });
    } finally {
      setIsProcessingPayment(false);
      setCurrentPaymentConfig(null);
      setTimeout(() => setPaymentProgress(null), 5000);
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
