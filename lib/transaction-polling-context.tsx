"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { usePublicClient, useBlockNumber, useAccount } from "wagmi";
import { ethers } from "ethers";
import { toast } from "sonner";
import { transactionEvents } from "./transaction-events";
import type { ElementPayTransactionResponse } from "./elementpay-api-client";
import { elementPayApiClient } from "./elementpay-api-client";
import { ELEMENTPAY_CONFIG } from "./elementpay-config";

// Contract ABI for settlement events
const CONTRACT_ABI = [
  "event SettlementCreated(address indexed user, uint256 orderId, bytes32 settlementId, uint256 amount)",
  "event SettlementCompleted(address indexed user, uint256 orderId, bytes32 settlementId, bool success)",
  "event OrderSettled(address indexed user, uint256 orderId, bool success)",
];

// Types
export interface PendingTransaction {
  transactionHash: string; // This is the approval/creation transaction hash
  settlementTxHash?: string; // This is the settlement transaction hash (populated later)
  orderId: string;
  kesAmount: number;
  tokenAmount: number;
  tokenSymbol: string;
  phoneNumber: string;
  walletAddress: string;
  chainId: number;
  startTime: number;
  lastStatus?: string;
  lastPolled?: number;
  confirmations?: number;
  approvalConfirmed?: boolean; // Track if approval tx succeeded
}

interface TransactionPollingContextType {
  // State
  pendingTransactions: PendingTransaction[];
  isMonitoring: boolean;

  // Actions
  addTransaction: (transaction: Omit<PendingTransaction, "startTime">) => void;
  removeTransaction: (transactionHash: string) => void;
  updateTransactionStatus: (
    transactionHash: string,
    status: string,
    confirmations?: number
  ) => void;
}

const TransactionPollingContext = createContext<
  TransactionPollingContextType | undefined
>(undefined);

const MAX_POLLING_TIME = 300000; // 5 minutes (used for timeout)
const SESSION_STORAGE_KEY = "elementpay_pending_transactions";

export function TransactionPollingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const contractListenersRef = useRef<any[]>([]);
  const publicClient = usePublicClient();
  const { address, isConnected, connector } = useAccount();
  const { data: blockNumber } = useBlockNumber({
    watch: true, // This enables WebSocket monitoring when available
  });

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

  // Setup wallet event listeners for settlement events
  useEffect(() => {
    if (!isConnected || !address || !connector) {
      console.log("Wallet not connected, skipping event listener setup");
      return;
    }

    const setupEventListeners = async () => {
      try {
        console.log(" Setting up wallet event listeners for settlement events");

        // Get provider from connector
        const provider = await connector.getProvider();
        const ethersProvider = new ethers.BrowserProvider(provider as any);

        // Get contract address based on environment
        const contractAddress = ELEMENTPAY_CONFIG.getContractAddress();
        if (!contractAddress) {
          console.warn(
            "⚠️ Contract address not configured, skipping event listeners"
          );
          return;
        }

        // Create contract instance
        const contract = new ethers.Contract(
          contractAddress,
          CONTRACT_ABI,
          ethersProvider
        );

        console.log(
          "📡 Listening for settlement events on contract:",
          contractAddress
        );

        // Listen for SettlementCreated events
        const handleSettlementCreated = (
          user: string,
          orderId: bigint,
          settlementId: string,
          amount: bigint
        ) => {
          if (user.toLowerCase() === address!.toLowerCase()) {
            console.log("🎯 Settlement created event received:", {
              user,
              orderId: orderId.toString(),
              settlementId,
              amount: amount.toString(),
            });

            // Find the pending transaction by orderId and update it
            setPendingTransactions((prev) =>
              prev.map((tx) => {
                if (tx.orderId === orderId.toString()) {
                  console.log(
                    "✅ Found matching transaction, marking as processing settlement"
                  );
                  return {
                    ...tx,
                    lastStatus: "SETTLING",
                    lastPolled: Date.now(),
                  };
                }
                return tx;
              })
            );
          }
        };

        // Listen for SettlementCompleted events
        const handleSettlementCompleted = (
          user: string,
          orderId: bigint,
          settlementId: string,
          success: boolean
        ) => {
          if (user.toLowerCase() === address!.toLowerCase()) {
            console.log("🏁 Settlement completed event received:", {
              user,
              orderId: orderId.toString(),
              settlementId,
              success,
            });

            // Find and complete the transaction
            setPendingTransactions((prev) => {
              const transaction = prev.find(
                (tx) => tx.orderId === orderId.toString()
              );
              if (transaction) {
                if (success) {
                  console.log(
                    "✅ Settlement successful, completing transaction"
                  );
                  // Remove transaction and emit success event
                  setTimeout(
                    () => removeTransaction(transaction.transactionHash),
                    100
                  );

                  toast.success(
                    `Payment completed! KES ${transaction.kesAmount.toLocaleString()} sent to ${
                      transaction.phoneNumber
                    }`
                  );

                  // Emit completion event
                  transactionEvents.emitCompleted(transaction, {
                    order_id: transaction.orderId,
                    status: "COMPLETED",
                    order_type: "offramp",
                    amount_fiat: transaction.kesAmount,
                    fee_charged: 0,
                    currency: "KES",
                    token: transaction.tokenSymbol,
                    file_id: transaction.orderId,
                    wallet_address: transaction.walletAddress,
                    phone_number: transaction.phoneNumber,
                    transaction_hashes: {
                      creation: transaction.transactionHash,
                      settlement: transaction.settlementTxHash || "",
                      refund: null,
                    },
                    created_at: new Date().toISOString(),
                  } as ElementPayTransactionResponse);
                } else {
                  console.log("❌ Settlement failed, removing transaction");
                  // Remove transaction and emit failure event
                  setTimeout(
                    () => removeTransaction(transaction.transactionHash),
                    100
                  );

                  toast.error(
                    "Payment settlement failed. Please contact support."
                  );
                  transactionEvents.emitFailed(
                    transaction,
                    new Error("Settlement transaction failed")
                  );
                }
              }
              return prev;
            });
          }
        };

        // Listen for OrderSettled events (fallback/legacy)
        const handleOrderSettled = (
          user: string,
          orderId: bigint,
          success: boolean
        ) => {
          if (user.toLowerCase() === address!.toLowerCase()) {
            console.log("📋 Order settled event received:", {
              user,
              orderId: orderId.toString(),
              success,
            });

            // Handle similar to SettlementCompleted
            handleSettlementCompleted(user, orderId, "", success);
          }
        };

        // Register event listeners
        contract.on("SettlementCreated", handleSettlementCreated);
        contract.on("SettlementCompleted", handleSettlementCompleted);
        contract.on("OrderSettled", handleOrderSettled);

        // Store listeners for cleanup
        contractListenersRef.current = [
          { event: "SettlementCreated", handler: handleSettlementCreated },
          { event: "SettlementCompleted", handler: handleSettlementCompleted },
          { event: "OrderSettled", handler: handleOrderSettled },
        ];

        console.log("✅ Wallet event listeners setup complete");

        // Return cleanup function
        return () => {
          console.log("🧹 Cleaning up wallet event listeners");
          contractListenersRef.current.forEach(({ event, handler }) => {
            contract.off(event, handler);
          });
          contractListenersRef.current = [];
        };
      } catch (error) {
        console.error("❌ Failed to setup wallet event listeners:", error);
      }
    };

    // Setup listeners and store cleanup function
    let cleanup: (() => void) | undefined;
    setupEventListeners().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    // Return cleanup function
    return () => {
      if (cleanup) cleanup();
    };
  }, [isConnected, address, connector]);

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

  // Check all pending transactions when a new block is mined
  const checkPendingTransactions = useCallback(async () => {
    if (pendingTransactions.length === 0 || !publicClient) return;

    console.log("🔍 Checking pending transactions on new block...");

    for (const transaction of pendingTransactions) {
      try {
        // Phase 1: Monitor approval transaction (creation hash)
        if (!transaction.approvalConfirmed) {
          try {
            // Get approval transaction receipt from blockchain
            const receipt = await publicClient.getTransactionReceipt({
              hash: transaction.transactionHash as `0x${string}`,
            });

            console.log("📋 Approval transaction receipt:", {
              transactionHash: transaction.transactionHash,
              status: receipt.status,
              blockNumber: receipt.blockNumber,
            });

            if (receipt.status === "success") {
              // Approval transaction succeeded - mark as confirmed
              console.log(
                "✅ Approval transaction confirmed:",
                transaction.transactionHash
              );
              updateTransactionStatus(
                transaction.transactionHash,
                "APPROVED",
                1
              );

              // Update transaction to mark approval as confirmed
              setPendingTransactions((prev) =>
                prev.map((tx) =>
                  tx.transactionHash === transaction.transactionHash
                    ? { ...tx, approvalConfirmed: true, lastStatus: "APPROVED" }
                    : tx
                )
              );

              // Continue to next iteration to check for settlement
              continue;
            } else if (receipt.status === "reverted") {
              // Approval transaction failed
              console.log(
                "❌ Approval transaction failed:",
                transaction.transactionHash
              );
              removeTransaction(transaction.transactionHash);
              toast.error("Token approval failed. Please try again.");
              transactionEvents.emitFailed(
                transaction,
                new Error("Approval transaction reverted")
              );
              continue;
            }
          } catch (error) {
            // Approval transaction not yet mined
            console.log(
              "⏳ Approval transaction still pending:",
              transaction.transactionHash
            );
            updateTransactionStatus(transaction.transactionHash, "PENDING", 0);
            continue;
          }
        }

        // Phase 2: Approval confirmed, waiting for wallet settlement events
        if (transaction.approvalConfirmed && !transaction.settlementTxHash) {
          // No longer polling API - relying on wallet events for settlement updates
          console.log(
            "⏳ Waiting for settlement events via wallet:",
            transaction.transactionHash
          );
          updateTransactionStatus(transaction.transactionHash, "APPROVED", 1);
          continue;
        }

        // Phase 3: Monitor settlement transaction on blockchain
        if (transaction.approvalConfirmed && transaction.settlementTxHash) {
          try {
            // Get settlement transaction receipt from blockchain
            const receipt = await publicClient.getTransactionReceipt({
              hash: transaction.settlementTxHash as `0x${string}`,
            });

            console.log("💰 Settlement transaction receipt:", {
              settlementTxHash: transaction.settlementTxHash,
              status: receipt.status,
              blockNumber: receipt.blockNumber,
            });

            let currentStatus: string;
            let confirmations = 1;

            if (receipt.status === "success") {
              currentStatus = "COMPLETED";
            } else if (receipt.status === "reverted") {
              currentStatus = "FAILED";
            } else {
              currentStatus = "SETTLING";
            }

            console.log("Transaction settlement status update:", {
              settlementTxHash: transaction.settlementTxHash,
              currentStatus,
              confirmations,
            });

            updateTransactionStatus(
              transaction.transactionHash,
              currentStatus,
              confirmations
            );

            // Handle final settlement status
            if (currentStatus === "COMPLETED") {
              console.log(
                "✅ Settlement completed:",
                transaction.settlementTxHash
              );
              removeTransaction(transaction.transactionHash);

              toast.success(
                `Payment completed! KES ${transaction.kesAmount.toLocaleString()} sent to ${
                  transaction.phoneNumber
                }`
              );

              // Emit completion event with full response data
              transactionEvents.emitCompleted(transaction, {
                order_id: transaction.orderId,
                status: "COMPLETED",
                order_type: "offramp",
                amount_fiat: transaction.kesAmount,
                fee_charged: 0,
                currency: "KES",
                token: transaction.tokenSymbol,
                file_id: transaction.orderId,
                wallet_address: transaction.walletAddress,
                phone_number: transaction.phoneNumber,
                transaction_hashes: {
                  creation: transaction.transactionHash,
                  settlement: transaction.settlementTxHash,
                  refund: null,
                },
                created_at: new Date().toISOString(),
              } as ElementPayTransactionResponse);
            } else if (currentStatus === "FAILED") {
              console.log(
                "❌ Settlement failed:",
                transaction.settlementTxHash
              );
              removeTransaction(transaction.transactionHash);
              toast.error("Payment settlement failed. Please contact support.");
              transactionEvents.emitFailed(
                transaction,
                new Error("Settlement transaction reverted")
              );
            }
          } catch (error) {
            // Settlement transaction not yet mined
            console.log(
              "⏳ Settlement transaction still pending:",
              transaction.settlementTxHash
            );
            updateTransactionStatus(transaction.transactionHash, "SETTLING", 1);
          }
        }
      } catch (error) {
        console.error("❌ Unexpected error checking transaction:", error);
      }
    }
  }, [pendingTransactions, publicClient]);

  // Check transactions whenever a new block is mined (WebSocket-powered)
  useEffect(() => {
    if (blockNumber && pendingTransactions.length > 0) {
      console.log("🆕 New block mined:", blockNumber);
      checkPendingTransactions();
    }
  }, [blockNumber, checkPendingTransactions, pendingTransactions.length]);

  // Update monitoring state based on pending transactions
  useEffect(() => {
    setIsMonitoring(pendingTransactions.length > 0);
  }, [pendingTransactions.length]);

  // Add transaction to monitoring queue
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
            "⚠️ Transaction already being monitored:",
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
          "Added transaction to monitoring queue - my leige, as :",
          transaction.transactionHash
        );
        return updated;
      });

      // Set up individual timeout for this transaction
      const timeout = setTimeout(() => {
        console.log(
          "⏰ Transaction monitoring timeout:",
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

  // Remove transaction from monitoring queue
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

    console.log(
      "➖ Removed transaction from monitoring queue:",
      transactionHash
    );
  }, []);

  // Update transaction status
  const updateTransactionStatus = useCallback(
    (transactionHash: string, status: string, confirmations?: number) => {
      setPendingTransactions((prev) =>
        prev.map((tx) =>
          tx.transactionHash === transactionHash
            ? {
                ...tx,
                lastStatus: status,
                lastPolled: Date.now(),
                confirmations: confirmations ?? tx.confirmations ?? 0,
              }
            : tx
        )
      );
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const contextValue: TransactionPollingContextType = {
    pendingTransactions,
    isMonitoring,
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
