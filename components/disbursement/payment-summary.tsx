"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, DollarSign, Users, Wallet } from "lucide-react";

interface PaymentSummary {
  totalRecipients: number;
  totalAmount: number;
  currency: string;
}

interface PaymentSummaryProps {
  summary: PaymentSummary;
  isFormValid: boolean;
  isProcessingPayment: boolean;
  showConfirmDialog: boolean;
  onShowConfirmDialogChange: (show: boolean) => void;
  onProcessPayments: () => void;
  currentRate: number;
  selectedToken: string;
  selectedTokenBalance: { balance: number; token: string };
}

export default function PaymentSummary({
  summary,
  isFormValid,
  isProcessingPayment,
  showConfirmDialog,
  onShowConfirmDialogChange,
  onProcessPayments,
  currentRate,
  selectedToken,
  selectedTokenBalance,
}: PaymentSummaryProps) {
  if (summary.totalRecipients === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>Payment Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{summary.totalRecipients}</p>
            <p className="text-sm text-muted-foreground">Recipients</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">
              KES {summary.totalAmount.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total Amount</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <Wallet className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{"--"}</p>
            <p className="text-sm text-muted-foreground">{"--"} Required</p>
          </div>
        </div>

        <Dialog
          open={showConfirmDialog}
          onOpenChange={onShowConfirmDialogChange}
        >
          <DialogTrigger asChild>
            <Button
              className="w-full"
              size="lg"
              disabled={!isFormValid || isProcessingPayment}
            >
              {isProcessingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-5 w-5 mr-2" />
                  Process {summary.totalRecipients} Payment
                  {summary.totalRecipients > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                Please review your payment details before proceeding.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Recipients:</span>
                  <span className="font-medium">{summary.totalRecipients}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-medium">
                    KES {summary.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Crypto Required:</span>
                  <span className="font-medium">
                    {(summary.totalAmount / currentRate).toFixed(4)}{" "}
                    {selectedToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Wallet Balance:</span>
                  <span className="font-medium">
                    {selectedTokenBalance.balance} {selectedToken}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onShowConfirmDialogChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={onProcessPayments}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? "Processing..." : "Confirm Payment"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
