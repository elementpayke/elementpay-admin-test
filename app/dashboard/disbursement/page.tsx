"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { useDisbursement } from "@/hooks/use-disbursement";
import { useToast } from "@/components/ui/use-toast";
import WalletConnection from "@/components/dashboard/wallet-connection";
import WalletStatus from "@/components/dashboard/wallet-status";
import {
  PaymentModeSelection,
  PaymentSummary,
  PaymentProgress as PaymentProgressComponent,
  RecentTransactions,
} from "@/components/disbursement";
import type {
  Token,
  PaymentMethod,
  PaymentDestination,
  TokenBalance,
  DisbursementQuote,
  DisbursementOrder,
  PaymentProgress,
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

  // Get token balance for selected token
  const selectedTokenBalance = { balance: 125.5, token: selectedToken };
  // Get current rate from rates data
  const currentRate = rates?.[selectedToken]?.rate || 130.5; // Mock rate for demo

  // Wallet connection handler
  const handleWalletConnection = (connected: boolean, address?: string) => {
    setIsWalletConnected(connected);
    setWalletAddress(address || "");
  };

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

  // Process payments
  const processPayments = async () => {
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
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Crypto Disbursement
            </h1>
            <p className="text-muted-foreground">
              Send cryptocurrency payments to multiple recipients via M-PESA
            </p>
          </div>

          {/* Wallet Connection */}
          <WalletConnection
            onConnectionChange={handleWalletConnection}
            className="!w-full"
          />

          {/* Wallet Status */}
          <WalletStatus className="!w-full" />

          {/* Payment Mode Selection */}
          <PaymentModeSelection
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
          />

          {/* Payment Summary & Submit */}
          <PaymentSummary
            summary={summary}
            isFormValid={isFormValid()}
            isProcessingPayment={isProcessingPayment}
            showConfirmDialog={showConfirmDialog}
            onShowConfirmDialogChange={setShowConfirmDialog}
            onProcessPayments={processPayments}
            currentRate={currentRate}
            selectedToken={selectedToken}
            selectedTokenBalance={selectedTokenBalance}
          />

          {/* Payment Progress */}
          <PaymentProgressComponent paymentProgress={paymentProgress} />

          {/* Recent Transactions */}
          <RecentTransactions recentDisbursements={recentDisbursements} />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
