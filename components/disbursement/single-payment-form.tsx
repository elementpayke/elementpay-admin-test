"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SinglePaymentFormProps {
  phoneNumber: string;
  amount: string;
  onPhoneNumberChange: (phoneNumber: string) => void;
  onAmountChange: (amount: string) => void;
  validatePhoneNumber: (phone: string) => boolean;
  validateAmount: (amount: string) => boolean;
}

export default function SinglePaymentForm({
  phoneNumber,
  amount,
  onPhoneNumberChange,
  onAmountChange,
  validatePhoneNumber,
  validateAmount,
}: SinglePaymentFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Single Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="single-phone">Phone Number</Label>
            <Input
              id="single-phone"
              placeholder="+254712345678"
              value={phoneNumber}
              onChange={(e) => onPhoneNumberChange(e.target.value)}
              className={
                !validatePhoneNumber(phoneNumber) && phoneNumber
                  ? "border-red-500"
                  : ""
              }
            />
            {phoneNumber && !validatePhoneNumber(phoneNumber) && (
              <p className="text-sm text-red-500">
                Please enter a valid Kenyan phone number
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="single-amount">Amount (KES)</Label>
            <Input
              id="single-amount"
              type="number"
              placeholder="1000"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className={
                !validateAmount(amount) && amount ? "border-red-500" : ""
              }
            />
            {amount && !validateAmount(amount) && (
              <p className="text-sm text-red-500">
                Amount must be between 1 and 1,000,000 KES
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
