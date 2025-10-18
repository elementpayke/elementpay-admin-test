import { PendingTransaction } from './transaction-polling-context';
import type { ElementPayTransactionResponse } from './elementpay-api-client';

type TransactionEventType = 'completed' | 'failed' | 'cancelled';

interface TransactionEvent {
  type: TransactionEventType;
  transaction: PendingTransaction;
  response?: ElementPayTransactionResponse;
  error?: Error;
}

type TransactionEventListener = (event: TransactionEvent) => void;

class TransactionEventEmitter {
  private listeners: Set<TransactionEventListener> = new Set();

  addListener(listener: TransactionEventListener) {
    this.listeners.add(listener);
  }

  removeListener(listener: TransactionEventListener) {
    this.listeners.delete(listener);
  }

  emit(event: TransactionEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in transaction event listener:', error);
      }
    });
  }

  // Convenience methods
  emitCompleted(transaction: PendingTransaction, response: ElementPayTransactionResponse) {
    this.emit({ type: 'completed', transaction, response });
  }

  emitFailed(transaction: PendingTransaction, error: Error) {
    this.emit({ type: 'failed', transaction, error });
  }

  emitCancelled(transaction: PendingTransaction) {
    this.emit({ type: 'cancelled', transaction });
  }
}

// Global instance
export const transactionEvents = new TransactionEventEmitter();

// Hook to listen to transaction events
import { useEffect } from 'react';

export function useTransactionEvents(listener: TransactionEventListener) {
  useEffect(() => {
    transactionEvents.addListener(listener);
    return () => {
      transactionEvents.removeListener(listener);
    };
  }, [listener]);
}
