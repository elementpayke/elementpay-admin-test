"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  elementPayApiClient,
  type ElementPayTransactionResponse,
} from "./elementpay-api-client";
import { toast } from "sonner";
import { transactionEvents } from "./transaction-events";

// Types
export interface PendingTransaction {
  transactionHash: string;
  orderId: string;
  kesAmount: number;
  tokenAmount: number;
  tokenSymbol: string;
  phoneNumber: string;
  walletAddress: string;
  startTime: number;
  lastStatus?: string;
  lastPolled?: number;
}

interface TransactionPollingContextType {
  // State
  pendingTransactions: PendingTransaction[];
  isPolling: boolean;

  // Actions
  addTransaction: (transaction: Omit<PendingTransaction, "startTime">) => void;
  removeTransaction: (transactionHash: string) => void;
  updateTransactionStatus: (transactionHash: string, status: string) => void;
}

const TransactionPollingContext = createContext<
  TransactionPollingContextType | undefined
>(undefined);

const POLLING_INTERVAL = 10000; // 10 seconds
const MAX_POLLING_TIME = 300000; // 5 minutes
const SESSION_STORAGE_KEY = "elementpay_pending_transactions";

export function TransactionPollingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load transactions from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const transactions: PendingTransaction[] = JSON.parse(stored);
        // Filter out transactions older than 5 minutes
        const now = Date.now();
        const validTransactions = transactions.filter(
          (tx) => now - tx.startTime < MAX_POLLING_TIME
        );

        if (validTransactions.length > 0) {
          setPendingTransactions(validTransactions);
          console.log(
            "🔄 Restored pending transactions from session:",
            validTransactions.length
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Failed to load transactions from sessionStorage:",
        error
      );
    }
  }, []);

  // Save transactions to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(pendingTransactions)
      );
    } catch (error) {
      console.error("❌ Failed to save transactions to sessionStorage:", error);
    }
  }, [pendingTransactions]);

  // Poll transaction status
  const pollTransactionStatus = useCallback(
    async (transaction: PendingTransaction) => {
      try {
        console.log("🔄 Polling transaction:", transaction);

        const response: ElementPayTransactionResponse =
          await elementPayApiClient.getOrderByTransactionHash(
            transaction.transactionHash
          );

        const currentStatus = response.status;
        const previousStatus = transaction.lastStatus;

        console.log("📊 Transaction status update:", {
          transactionHash: transaction.transactionHash,
          previousStatus,
          currentStatus,
          orderId: response.order_id,
          amountFiat: response.amount_fiat,
          phoneNumber: response.phone_number,
        });

        // Update transaction status
        updateTransactionStatus(transaction.transactionHash, currentStatus);

        // Handle status changes
        switch (currentStatus) {
          case "PENDING":
            // Continue polling
            break;

          case "PROCESSING":
            // Continue polling
            break;

          case "COMPLETED":
            // Transaction completed successfully
            console.log(
              "✅ Transaction completed:",
              transaction.transactionHash
            );
            removeTransaction(transaction.transactionHash);

            toast.success(
              `Payment completed! KES ${response.amount_fiat.toLocaleString()} sent to ${
                response.phone_number
              }`
            );

            // Transaction completed successfully
            transactionEvents.emitCompleted(transaction, response);
            break;

          case "FAILED":
            console.log("❌ Transaction failed:", transaction.transactionHash);
            removeTransaction(transaction.transactionHash);

            const failureReason =
              response.failure_reason || "Transaction failed";
            toast.error(`Payment failed: ${failureReason}`);

            transactionEvents.emitFailed(transaction, new Error(failureReason));
            break;

          case "CANCELLED":
            console.log(
              "🚫 Transaction cancelled:",
              transaction.transactionHash
            );
            removeTransaction(transaction.transactionHash);

            toast.error("Transaction was cancelled.");
            transactionEvents.emitCancelled(transaction);
            break;

          default:
            console.log("⚠️ Unknown transaction status:", currentStatus);
        }
      } catch (error) {
        console.error("❌ Failed to poll transaction status:", error);

        // Check if this is a permanent API error (like order not found)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isPermanentError =
          errorMessage.includes("Order not found") ||
          errorMessage.includes("not found") ||
          errorMessage.includes("HTTP 404");

        if (isPermanentError) {
          console.log(
            "🚫 Permanent API error, stopping polling for transaction:",
            transaction.transactionHash
          );
          removeTransaction(transaction.transactionHash);

          toast.error(
            `Transaction not found or no longer available. Please check your transaction history.`
          );

          transactionEvents.emitFailed(transaction, new Error(errorMessage));
        } else {
          // Network errors, timeouts, etc. - retry on next poll
          // Only remove after max polling time expires
        }
      }
    },
    []
  );

  // Start polling for all pending transactions
  const startPolling = useCallback(() => {
    if (pendingTransactions.length === 0) {
      setIsPolling(false);
      return;
    }

    if (isPolling) return; // Already polling

    console.log(
      "🚀 Starting transaction polling for",
      pendingTransactions.length,
      "transactions"
    );
    setIsPolling(true);

    // Poll immediately for all transactions
    pendingTransactions.forEach((transaction) => {
      pollTransactionStatus(transaction);
    });

    // Set up interval polling
    pollingIntervalRef.current = setInterval(() => {
      pendingTransactions.forEach((transaction) => {
        pollTransactionStatus(transaction);
      });
    }, POLLING_INTERVAL);
  }, [pendingTransactions, isPolling, pollTransactionStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    console.log("⏹️ Stopped transaction polling");
  }, []);

  // Add transaction to polling queue
  const addTransaction = useCallback(
    (transactionData: Omit<PendingTransaction, "startTime">) => {
      const transaction: PendingTransaction = {
        ...transactionData,
        startTime: Date.now(),
      };

      setPendingTransactions((prev) => {
        // Check if transaction already exists
        const exists = prev.find(
          (tx) => tx.transactionHash === transaction.transactionHash
        );
        if (exists) {
          console.log(
            "⚠️ Transaction already being polled:",
            transaction.transactionHash
          );
          return prev;
        }

        // Keep only last 10 transactions
        const updated = [...prev, transaction];
        if (updated.length > 10) {
          updated.splice(0, updated.length - 10);
        }

        console.log(
          "➕ Added transaction to polling queue:",
          transaction.transactionHash
        );
        return updated;
      });

      // Set up individual timeout for this transaction
      const timeout = setTimeout(() => {
        console.log(
          "⏰ Transaction polling timeout:",
          transaction.transactionHash
        );
        removeTransaction(transaction.transactionHash);
        toast.error(
          "Transaction status check timed out. Please check your transaction history."
        );
      }, MAX_POLLING_TIME);

      timeoutsRef.current.set(transaction.transactionHash, timeout);
    },
    []
  );

  // Remove transaction from polling queue
  const removeTransaction = useCallback((transactionHash: string) => {
    setPendingTransactions((prev) =>
      prev.filter((tx) => tx.transactionHash !== transactionHash)
    );

    // Clear timeout for this transaction
    const timeout = timeoutsRef.current.get(transactionHash);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(transactionHash);
    }

    console.log("➖ Removed transaction from polling queue:", transactionHash);
  }, []);

  // Update transaction status
  const updateTransactionStatus = useCallback(
    (transactionHash: string, status: string) => {
      setPendingTransactions((prev) =>
        prev.map((tx) =>
          tx.transactionHash === transactionHash
            ? { ...tx, lastStatus: status, lastPolled: Date.now() }
            : tx
        )
      );
    },
    []
  );

  // Start/stop polling based on pending transactions
  useEffect(() => {
    if (pendingTransactions.length > 0) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [pendingTransactions.length, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      // Clear all timeouts
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, [stopPolling]);

  const contextValue: TransactionPollingContextType = {
    pendingTransactions,
    isPolling,
    addTransaction,
    removeTransaction,
    updateTransactionStatus,
  };

  return (
    <TransactionPollingContext.Provider value={contextValue}>
      {children}
    </TransactionPollingContext.Provider>
  );
}

export function useTransactionPolling() {
  const context = useContext(TransactionPollingContext);
  if (context === undefined) {
    throw new Error(
      "useTransactionPolling must be used within a TransactionPollingProvider"
    );
  }
  return context;
}
