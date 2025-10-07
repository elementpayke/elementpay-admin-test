"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Users, DollarSign } from "lucide-react";
import SinglePaymentForm from "./single-payment-form";
import BulkPaymentForm from "./bulk-payment-form";

type PaymentMode = "single" | "bulk";

interface PaymentEntry {
  id: string;
  phoneNumber: string;
  amount: string;
  isEditing?: boolean;
}

interface PaymentModeSelectionProps {
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
  singlePayment: {
    phoneNumber: string;
    amount: string;
  };
  onSinglePaymentChange: (
    field: "phoneNumber" | "amount",
    value: string
  ) => void;
  bulkPayments: PaymentEntry[];
  uploadedFile: File | null;
  onBulkPaymentsChange: (payments: PaymentEntry[]) => void;
  onUploadedFileChange: (file: File | null) => void;
  validatePhoneNumber: (phone: string) => boolean;
  validateAmount: (amount: string) => boolean;
}

export default function PaymentModeSelection({
  paymentMode,
  onPaymentModeChange,
  singlePayment,
  onSinglePaymentChange,
  bulkPayments,
  uploadedFile,
  onBulkPaymentsChange,
  onUploadedFileChange,
  validatePhoneNumber,
  validateAmount,
}: PaymentModeSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment Mode</span>
        </CardTitle>
        <CardDescription>
          Choose between single payment or bulk payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={paymentMode}
          onValueChange={(value) => onPaymentModeChange(value as PaymentMode)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Single Payment</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Bulk Payments</span>
            </TabsTrigger>
          </TabsList>

          {/* Single Payment Form */}
          <TabsContent value="single" className="space-y-4 mt-6">
            <SinglePaymentForm
              phoneNumber={singlePayment.phoneNumber}
              amount={singlePayment.amount}
              onPhoneNumberChange={(phoneNumber) =>
                onSinglePaymentChange("phoneNumber", phoneNumber)
              }
              onAmountChange={(amount) =>
                onSinglePaymentChange("amount", amount)
              }
              validatePhoneNumber={validatePhoneNumber}
              validateAmount={validateAmount}
            />
          </TabsContent>

          {/* Bulk Payments Form */}
          <TabsContent value="bulk" className="space-y-4 mt-6">
            <BulkPaymentForm
              bulkPayments={bulkPayments}
              uploadedFile={uploadedFile}
              onBulkPaymentsChange={onBulkPaymentsChange}
              onUploadedFileChange={onUploadedFileChange}
              validatePhoneNumber={validatePhoneNumber}
              validateAmount={validateAmount}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
