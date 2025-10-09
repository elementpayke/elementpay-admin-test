"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { ELEMENTPAY_CONFIG, ERROR_MESSAGES } from "@/lib/elementpay-config";
import {
  elementPayRateService,
  type ElementPayRate,
} from "@/lib/elementpay-rate-service";
import type { ElementPayToken, WalletBalance } from "@/lib/types";

interface ElementPayCalculatorProps {
  onCalculationChange: (calculation: {
    selectedToken: ElementPayToken | null;
    kesAmount: number;
    tokenAmount: number;
    rate: ElementPayRate | null;
    isValid: boolean;
    phoneNumber: string;
  }) => void;
  walletBalances?: WalletBalance[];
  supportedTokens?: ElementPayToken[];
  className?: string;
}

export default function ElementPayCalculator({
  onCalculationChange,
  walletBalances = [],
  supportedTokens = [],
  className = "",
}: ElementPayCalculatorProps) {
  // Form state
  const [selectedToken, setSelectedToken] = useState<ElementPayToken | null>(
    null
  );
  const [kesAmount, setKesAmount] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Rate state
  const [currentRate, setCurrentRate] = useState<ElementPayRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Calculated values
  const [tokenAmount, setTokenAmount] = useState<number>(0);
  const [isValidCalculation, setIsValidCalculation] = useState(false);

  // Validation functions
  const validatePhoneNumber = (phone: string): boolean => {
    return ELEMENTPAY_CONFIG.PHONE_REGEX.test(phone.replace(/\s/g, ""));
  };

  const validateAmount = (amount: string): boolean => {
    const num = parseFloat(amount);
    return (
      !isNaN(num) &&
      num >= ELEMENTPAY_CONFIG.MIN_AMOUNT &&
      num <= ELEMENTPAY_CONFIG.MAX_AMOUNT
    );
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("254")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+254${cleaned.substring(1)}`;
    }
    return phone;
  };

  // Fetch rate for selected token
  const fetchRate = useCallback(async (token: ElementPayToken) => {
    if (!token) return;

    setIsLoadingRate(true);
    setRateError(null);

    try {
      const rate = await elementPayRateService.fetchRate(
        token.symbol as keyof typeof import("@/lib/elementpay-config").CURRENCY_MAP
      );

      if (rate && elementPayRateService.validateRate(rate)) {
        setCurrentRate(rate);
        setRateError(null);
      } else {
        throw new Error("Invalid rate data received");
      }
    } catch (error) {
      console.error("Failed to fetch rate:", error);
      setRateError(ERROR_MESSAGES.RATE_FETCH_FAILED);
      setCurrentRate(null);
    } finally {
      setIsLoadingRate(false);
    }
  }, []);

  // Calculate token amount when KES amount or rate changes
  useEffect(() => {
    if (kesAmount && currentRate && validateAmount(kesAmount)) {
      try {
        const calculatedAmount = elementPayRateService.calculateTokenAmount(
          parseFloat(kesAmount),
          currentRate
        );
        setTokenAmount(calculatedAmount);
      } catch (error) {
        console.error("Calculation error:", error);
        setTokenAmount(0);
      }
    } else {
      setTokenAmount(0);
    }
  }, [kesAmount, currentRate]);

  // Validate form and update parent
  useEffect(() => {
    const isValid = !!(
      selectedToken &&
      validatePhoneNumber(phoneNumber) &&
      validateAmount(kesAmount) &&
      currentRate &&
      tokenAmount > 0 &&
      !isLoadingRate &&
      !rateError
    );

    setIsValidCalculation(isValid);

    // Notify parent of changes
    onCalculationChange({
      selectedToken,
      kesAmount: parseFloat(kesAmount) || 0,
      tokenAmount,
      rate: currentRate,
      isValid,
      phoneNumber: formatPhoneNumber(phoneNumber),
    });
  }, [
    selectedToken,
    kesAmount,
    phoneNumber,
    currentRate,
    tokenAmount,
    isLoadingRate,
    rateError,
    onCalculationChange,
  ]);

  // Handle token selection
  const handleTokenSelect = (tokenAddress: string) => {
    const token = supportedTokens.find((t) => t.tokenAddress === tokenAddress);
    if (token) {
      setSelectedToken(token);
      setCurrentRate(null);
      setTokenAmount(0);
      fetchRate(token);
    }
  };

  // Handle refresh rate
  const handleRefreshRate = () => {
    if (selectedToken) {
      fetchRate(selectedToken);
    }
  };

  // Get wallet balance for selected token
  const getTokenBalance = (): WalletBalance | null => {
    if (!selectedToken) return null;
    return (
      walletBalances.find(
        (b) => b.token.tokenAddress === selectedToken.tokenAddress
      ) || null
    );
  };

  const tokenBalance = getTokenBalance();
  const hasInsufficientBalance =
    tokenBalance && tokenAmount > tokenBalance.balance;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Off-Ramp Calculator</span>
          {isLoadingRate && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token Selection */}
        <div className="space-y-2">
          <Label htmlFor="token-select">Select Token</Label>
          <select
            id="token-select"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(e) => handleTokenSelect(e.target.value)}
          >
            <option>Choose a token to convert</option>
            {supportedTokens.map((token) => (
              <option key={token.tokenAddress} value={token.tokenAddress}>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    on {token.chain}
                  </span>
                </div>
              </option>
            ))}
          </select>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone-number">Phone Number</Label>
          <Input
            id="phone-number"
            placeholder="+254712345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={
              phoneNumber && !validatePhoneNumber(phoneNumber)
                ? "border-red-500"
                : ""
            }
          />
          {phoneNumber && !validatePhoneNumber(phoneNumber) && (
            <p className="text-sm text-red-500">
              {ERROR_MESSAGES.INVALID_PHONE}
            </p>
          )}
        </div>

        {/* KES Amount */}
        <div className="space-y-2">
          <Label htmlFor="kes-amount">Amount to Receive (KES)</Label>
          <Input
            id="kes-amount"
            type="number"
            placeholder="1000"
            value={kesAmount}
            onChange={(e) => setKesAmount(e.target.value)}
            className={
              kesAmount && !validateAmount(kesAmount) ? "border-red-500" : ""
            }
          />
          {kesAmount && !validateAmount(kesAmount) && (
            <p className="text-sm text-red-500">
              {ERROR_MESSAGES.INVALID_AMOUNT}
            </p>
          )}
        </div>

        {/* Rate Display */}
        {selectedToken && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Exchange Rate</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshRate}
                disabled={isLoadingRate}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoadingRate ? "animate-spin" : ""}`}
                />
              </Button>
            </div>

            {rateError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{rateError}</AlertDescription>
              </Alert>
            ) : currentRate ? (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">1 {selectedToken.symbol} =</span>
                  <span className="font-medium">
                    KES {currentRate.marked_up_rate.toFixed(2)}
                  </span>
                </div>
                {currentRate.markup_percentage > 0 && (
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Markup ({currentRate.markup_percentage}%)</span>
                    <span>
                      Applied to amounts over KES{" "}
                      {ELEMENTPAY_CONFIG.MARKUP_THRESHOLD}
                    </span>
                  </div>
                )}
                {currentRate.markup_percentage > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Includes {currentRate.markup_percentage.toFixed(1)}% markup
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  Select a token to see exchange rate
                </span>
              </div>
            )}
          </div>
        )}

        {/* Token Amount Required */}
        {selectedToken && tokenAmount > 0 && (
          <div className="space-y-2">
            <Label>Token Amount Required</Label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm">You need:</span>
                <span className="font-medium">
                  {tokenAmount.toFixed(6)} {selectedToken.symbol}
                </span>
              </div>

              {/* Balance Check */}
              {tokenBalance && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span>Wallet Balance:</span>
                    <span
                      className={
                        hasInsufficientBalance
                          ? "text-red-500"
                          : "text-green-600"
                      }
                    >
                      {tokenBalance.formattedBalance} {selectedToken.symbol}
                    </span>
                  </div>
                  {hasInsufficientBalance && (
                    <div className="flex items-center space-x-1 mt-1 text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="text-xs">
                        {ERROR_MESSAGES.INSUFFICIENT_BALANCE}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Status */}
        {selectedToken && kesAmount && phoneNumber && (
          <div className="flex items-center space-x-2 text-sm">
            {isValidCalculation ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Ready to process</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-orange-500">
                  Please complete all fields
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
