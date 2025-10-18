"use client";

import { useEffect, useCallback } from 'react';
import { useTransactionPolling, type PendingTransaction } from '@/lib/transaction-polling-context';
import { type ElementPayTransactionResponse } from '@/lib/elementpay-api-client';
import { useTransactionEvents, type TransactionEvent } from '@/lib/transaction-events';

interface UseTransactionUpdatesOptions {
  onTransactionComplete?: (transaction: PendingTransaction, response: ElementPayTransactionResponse) => void;
  onTransactionFailed?: (transaction: PendingTransaction, error: Error) => void;
  onTransactionCancelled?: (transaction: PendingTransaction) => void;
}

/**
 * Hook to listen for transaction polling updates globally
 * Useful for components that need to react to transaction status changes
 */
export function useTransactionUpdates(options: UseTransactionUpdatesOptions = {}) {
  const { pendingTransactions } = useTransactionPolling();

  // Listen for transaction events
  const handleTransactionEvent = useCallback((event: TransactionEvent) => {
    switch (event.type) {
      case 'completed':
        options.onTransactionComplete?.(event.transaction, event.response!);
        break;
      case 'failed':
        options.onTransactionFailed?.(event.transaction, event.error!);
        break;
      case 'cancelled':
        options.onTransactionCancelled?.(event.transaction);
        break;
    }
  }, [options]);

  useTransactionEvents(handleTransactionEvent);

  return {
    pendingTransactions,
    hasPendingTransactions: pendingTransactions.length > 0,
  };
}
