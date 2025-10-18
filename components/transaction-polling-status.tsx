"use client";

import React, { useState } from "react";
import { useTransactionPolling } from "@/lib/transaction-polling-context";
import { Button } from "@/components/ui/button";
import { Copy, X, Check } from "lucide-react";
import { toast } from "sonner";

export function TransactionPollingStatus() {
  const { pendingTransactions, isPolling, removeTransaction } =
    useTransactionPolling();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleCancelTransaction = (transactionHash: string) => {
    removeTransaction(transactionHash);
    toast.info("Transaction monitoring cancelled");
  };

  if (!isPolling || pendingTransactions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-card border rounded-lg p-4 shadow-lg">
        <div className="flex items-center space-x-2 mb-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <h4 className="text-sm font-medium">
            Monitoring {pendingTransactions.length} Transaction
            {pendingTransactions.length > 1 ? "s" : ""}
          </h4>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {pendingTransactions.map((transaction) => (
            <div
              key={transaction.transactionHash}
              className="text-xs bg-muted/50 rounded p-3 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  Order #{transaction.orderId}
                </span>
                <span className="text-muted-foreground">
                  {transaction.lastStatus || "Checking..."}
                </span>
              </div>

              {/* Transaction Hash Row */}
              <div className="flex items-center justify-between bg-background/50 rounded px-2 py-1">
                <span className="text-muted-foreground font-mono text-xs truncate mr-2">
                  {transaction.transactionHash.length > 20
                    ? `${transaction.transactionHash.slice(
                        0,
                        10
                      )}...${transaction.transactionHash.slice(-8)}`
                    : transaction.transactionHash}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(transaction.transactionHash)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-muted-foreground">
                KES {transaction.kesAmount.toLocaleString()} →{" "}
                {transaction.phoneNumber}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() =>
                    handleCancelTransaction(transaction.transactionHash)
                  }
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
