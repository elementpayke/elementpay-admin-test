"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface PaymentProgress {
  step: string;
  message: string;
  estimatedTimeRemaining?: number;
}

interface PaymentProgressProps {
  paymentProgress: PaymentProgress | null;
}

export default function PaymentProgress({
  paymentProgress,
}: PaymentProgressProps) {
  if (!paymentProgress) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          {paymentProgress.step === "completed" ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : paymentProgress.step === "failed" ? (
            <AlertTriangle className="h-8 w-8 text-red-500" />
          ) : (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          )}
          <div className="flex-1">
            <p className="font-medium">{paymentProgress.message}</p>
            {paymentProgress.estimatedTimeRemaining && (
              <p className="text-sm text-muted-foreground">
                Estimated time: {paymentProgress.estimatedTimeRemaining}s
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
