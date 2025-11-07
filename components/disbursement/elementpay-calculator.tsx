"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { ELEMENTPAY_CONFIG, ERROR_MESSAGES } from "@/lib/elementpay-config";
import {
  elementPayRateService,
  type ElementPayRate,
} from "@/lib/elementpay-rate-service";
import type { ElementPayToken, WalletBalance } from "@/lib/types";
import { toast } from "sonner";
import { elementPayTokenService } from "@/lib/elementpay-token-service";
import { erc20Abi, parseUnits } from "viem";
import { useWriteContract, usePublicClient, useChainId } from "wagmi";
import { ethers } from "ethers";
import { elementPayApiClient } from "@/lib/elementpay-api-client";
import { useTransactionPolling } from "@/lib/transaction-polling-context";

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
  walletAddress?: string;
  isWalletConnected?: boolean;
  className?: string;
}

export default function ElementPayCalculator({
  onCalculationChange,
  walletBalances = [],
  walletAddress = "",
  isWalletConnected = false,
  className = "",
}: ElementPayCalculatorProps) {
  // Form state
  const [selectedToken, setSelectedToken] = useState<ElementPayToken | null>(
    null
  );
  const [availableTokens, setAvailableTokens] = useState<ElementPayToken[]>([]);
  const [kesAmount, setKesAmount] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");

  // Rate state
  const [currentRate, setCurrentRate] = useState<ElementPayRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

  // Calculated values
  const [tokenAmount, setTokenAmount] = useState<number>(0);
  const [isValidCalculation, setIsValidCalculation] = useState(false);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);

  // Fee breakdown state (markup-based)
  const [feeBreakdown, setFeeBreakdown] = useState<{
    baseAmount: number;
    feeAmount: number;
    totalAmount: number;
    feeApplied: boolean;
    feeBand?: { description: string } | null;
  } | null>(null);

  // Transaction polling context
  const { addTransaction } = useTransactionPolling();

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const chainId = useChainId();

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

  const fetchAvailableTokens = useCallback(async () => {
    // console.log("🔄 Fetching available tokens");
    const tokens = await elementPayTokenService.fetchSupportedTokens();
    // console.log("🔄 Fetching available tokens:", tokens);
    setAvailableTokens(tokens);
  }, []);

  useEffect(() => {
    fetchAvailableTokens();
  }, [fetchAvailableTokens]);

  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("254")) {
      return cleaned;
    } else if (cleaned.startsWith("0")) {
      return `254${cleaned.substring(1)}`;
    }
    return cleaned;
  };

  // Fetch rate for selected token
  const fetchRate = useCallback(async (token: ElementPayToken) => {
    if (!token) return;

    // console.log(`🔄 Fetching rate for token: ${token.symbol}`);
    setIsLoadingRate(true);
    setRateError(null);

    try {
      const rate = await elementPayRateService.fetchRate(
        token.symbol as keyof typeof import("@/lib/elementpay-config").CURRENCY_MAP
      );

      // console.log(`✅ Rate fetched for ${token.symbol}:`, rate);

      if (rate && elementPayRateService.validateRate(rate)) {
        setCurrentRate(rate);
        setRateError(null);
        // console.log(`✅ Rate set successfully for ${token.symbol}`);
      } else {
        console.error("Imefail : ", rate);
        throw new Error("Invalid rate data received");
      }
    } catch (error) {
      console.error(`❌ Failed to fetch rate for ${token.symbol}:`, error);
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
        const kesValue = parseFloat(kesAmount);
        const calculatedAmount = elementPayRateService.calculateTokenAmount(
          kesValue,
          currentRate
        );
        console.log("Maarkup details:", {
          kesAmount: kesValue,
          markedUpRate: currentRate.marked_up_rate,
        });
        setTokenAmount(calculatedAmount);
      } catch (error) {
        console.error("Calculation error:", error);
        setTokenAmount(0);
      }
    } else {
      setTokenAmount(0);
    }
  }, [kesAmount, currentRate]);

  // Compute fee breakdown (markup) for display
  useEffect(() => {
    if (kesAmount && validateAmount(kesAmount)) {
      const amount = parseFloat(kesAmount);
      const breakdown = elementPayRateService.getCostBreakdown(amount);
      setFeeBreakdown({
        baseAmount: breakdown.baseAmount,
        feeAmount: breakdown.markupAmount,
        totalAmount: breakdown.totalAmount,
        feeApplied: breakdown.markupApplied,
        feeBand: breakdown.markupApplied
          ? {
              description: `${ELEMENTPAY_CONFIG.MARKUP_PERCENTAGE}% markup applied for amounts over KES ${ELEMENTPAY_CONFIG.MARKUP_THRESHOLD}`,
            }
          : null,
      });
    } else {
      setFeeBreakdown(null);
    }
  }, [kesAmount]);

  // Get wallet balance for selected token
  const getTokenBalance = (): WalletBalance | null => {
    if (!selectedToken) {
      // console.log("⚠️ [CALCULATOR] No token selected for balance check");
      return null;
    }
    const balance =
      walletBalances.find(
        (b) => b.token.tokenAddress === selectedToken.tokenAddress
      ) || null;
    return balance;
  };

  // Get token balance and check sufficiency
  const tokenBalance = getTokenBalance();
  const hasInsufficientBalance =
    tokenBalance && tokenAmount > tokenBalance.balance;

  // Validate form and update parent
  useEffect(() => {
    const validationChecks = {
      hasToken: !!selectedToken,
      validPhone: validatePhoneNumber(phoneNumber),
      validAmount: validateAmount(kesAmount),
      hasRate: !!currentRate,
      hasTokenAmount: tokenAmount > 0,
      notLoadingRate: !isLoadingRate,
      noRateError: !rateError,
      walletConnected: isWalletConnected,
      hasSufficientBalance: !hasInsufficientBalance,
    };

    const isValid = Object.values(validationChecks).every(Boolean);

    setIsValidCalculation(isValid);

    // Notify parent of changes
    const calculationData = {
      selectedToken,
      kesAmount: parseFloat(kesAmount) || 0,
      tokenAmount,
      rate: currentRate,
      isValid,
      phoneNumber: formatPhoneNumber(phoneNumber),
    };

    onCalculationChange(calculationData);
  }, [
    selectedToken,
    kesAmount,
    phoneNumber,
    currentRate,
    tokenAmount,
    isLoadingRate,
    rateError,
    isWalletConnected,
    hasInsufficientBalance,
    // onCalculationChange,
  ]);

  // Handle token selection
  const handleTokenSelect = (tokenAddress: string) => {
    const token = availableTokens.find((t) => t.tokenAddress === tokenAddress);
    if (token) {
      setSelectedToken(token);
      setCurrentRate(null);
      setTokenAmount(0);
      fetchRate(token);
    } else {
      console.warn("❌ [CALCULATOR] Token not found in supported tokens list");
    }
  };

  // Handle refresh rate
  const handleRefreshRate = () => {
    if (selectedToken) {
      fetchRate(selectedToken);
    }
  };

  const handleProcessPayment = async () => {
    console.log("Processing payment...");
    console.log("Selected token:", selectedToken);
    console.log("KES amount:", kesAmount);
    console.log("Phone number:", phoneNumber);
    console.log("Token amount:", tokenAmount);
    console.log("Rate:", currentRate);
    console.log("Is wallet connected:", isWalletConnected);
    console.log("Is valid calculation:", isValidCalculation);

    try {
      setIsProcessingTransaction(true);
      const approveAmount = (
        Number(kesAmount) / (currentRate?.marked_up_rate || 1)
      ).toString();

      const approvalAmount = parseUnits(
        approveAmount,
        selectedToken?.decimals || 0
      );

      const spender = ELEMENTPAY_CONFIG.getContractAddress();

      const approvalHash = await writeContractAsync({
        address: selectedToken?.tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, approvalAmount],
        chain: selectedToken?.chain as any,
        account: walletAddress as `0x${string}`,
      });

      await publicClient?.waitForTransactionReceipt({ hash: approvalHash });

      const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

      const orderDetails = {
        user_address: walletAddress,
        token: selectedToken?.tokenAddress as `0x${string}`,
        order_type: 1 as const,
        fiat_payload: {
          amount_fiat: Number(kesAmount),
          cashout_type: "PHONE" as const,
          phone_number: formattedPhoneNumber,
          currency: "KES" as const,
        },
      };

      if (!window.ethereum) throw new Error("Wallet not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = JSON.stringify(orderDetails);
      const _signature = await signer.signMessage(message);

      // Create order only after successful signature
      const order = await elementPayApiClient.createOrder(
        orderDetails,
        _signature
      );
      console.log("✅ Order created successfully:", { order });

      // Get full order details to obtain the order_id for event matching
      let orderId = order.data.tx_hash; // fallback
      try {
        const fullOrderDetails =
          await elementPayApiClient.getOrderByTransactionHash(
            order.data.tx_hash
          );
        orderId = fullOrderDetails.order_id;
        console.log("📋 Got full order details, order_id:", orderId);
      } catch (error) {
        console.warn(
          "⚠️ Could not get full order details, using tx_hash as order_id:",
          error
        );
      }

      // Add transaction to global polling context
      addTransaction({
        transactionHash: order.data.tx_hash,
        orderId: orderId,
        kesAmount: Number(kesAmount),
        tokenAmount: tokenAmount,
        tokenSymbol: selectedToken!.symbol,
        phoneNumber: formattedPhoneNumber,
        walletAddress,
        chainId,
      });

      toast.success(
        `Order ${order.data.tx_hash} submitted. Monitoring transaction status...`
      );
    } catch (error) {
      console.error("❌ Payment processing failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment processing failed. Please try again."
      );
    } finally {
      setIsProcessingTransaction(false);
    }
  };

  const handleCancelTransaction = () => {
    setIsProcessingTransaction(false);
    toast.message("Transaction cancelled");
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${className}`}>
      {/* Main Section - Input Form */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center space-x-2">
            <span>Off-Ramp Calculator</span>
            {isLoadingRate && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Token Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="token-select" className="text-sm">
              Select Token
            </Label>
            <select
              id="token-select"
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(e) => handleTokenSelect(e.target.value)}
            >
              <option>Choose a token to convert</option>
              {availableTokens.map((token) => (
                <option key={token.tokenAddress} value={token.tokenAddress}>
                  {token.symbol} on {token.chain}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="phone-number" className="text-sm">
              Phone Number
            </Label>
            <Input
              id="phone-number"
              placeholder="+254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`h-9 ${
                phoneNumber && !validatePhoneNumber(phoneNumber)
                  ? "border-red-500"
                  : ""
              }`}
            />
            {phoneNumber && !validatePhoneNumber(phoneNumber) && (
              <p className="text-xs text-red-500">
                {ERROR_MESSAGES.INVALID_PHONE}
              </p>
            )}
          </div>

          {/* KES Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="kes-amount" className="text-sm">
              Amount to Receive (KES)
            </Label>
            <Input
              id="kes-amount"
              type="number"
              placeholder="1000"
              value={kesAmount}
              onChange={(e) => setKesAmount(e.target.value)}
              className={`h-9 ${
                kesAmount && !validateAmount(kesAmount) ? "border-red-500" : ""
              }`}
            />
            {kesAmount && !validateAmount(kesAmount) && (
              <p className="text-xs text-red-500">
                {ERROR_MESSAGES.INVALID_AMOUNT}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aside Section - Transaction Details */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Transaction Details</CardTitle>
            {selectedToken && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshRate}
                disabled={isLoadingRate}
                className="h-8 w-8 p-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    isLoadingRate ? "animate-spin" : ""
                  }`}
                />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selectedToken ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Select a token to view details
            </div>
          ) : (
            <>
              {/* Rate Display */}
              {rateError ? (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">
                    {rateError}
                  </AlertDescription>
                </Alert>
              ) : currentRate ? (
                <div className="space-y-3">
                  {/* Exchange Rate */}
                  <div className="p-2.5 bg-muted/30 rounded-md border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Exchange Rate
                      </span>
                      <span className="text-sm font-medium">
                        1 {selectedToken.symbol} = KES{" "}
                        {currentRate.base_rate.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Fee Breakdown */}
                  {feeBreakdown && kesAmount && validateAmount(kesAmount) && (
                    <div className="p-2.5 bg-muted/30 rounded-md border space-y-2">
                      <div className="text-xs font-medium text-center pb-2 border-b">
                        Fee Breakdown
                      </div>

                      {/* Warning for fallback calculations */}
                      {rateError && (
                        <div className="text-xs text-orange-600 bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                          ⚠️ Fee structure unavailable
                        </div>
                      )}

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Amount to Receive:
                          </span>
                          <span className="font-medium">
                            KES {feeBreakdown.baseAmount.toLocaleString()}
                          </span>
                        </div>

                        {feeBreakdown.feeApplied && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Service Fee:
                              </span>
                              <span className="font-medium text-orange-600 dark:text-orange-500">
                                +KES {feeBreakdown.feeAmount.toLocaleString()}
                              </span>
                            </div>

                            {feeBreakdown.feeBand && (
                              <div className="text-xs text-muted-foreground pt-1">
                                {feeBreakdown.feeBand.description}
                              </div>
                            )}

                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between font-medium">
                                <span>Total Amount:</span>
                                <span className="text-red-600 dark:text-red-500">
                                  KES{" "}
                                  {feeBreakdown.totalAmount.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </>
                        )}

                        {!feeBreakdown.feeApplied && (
                          <div className="text-xs text-green-600 dark:text-green-500 pt-1">
                            ✓ Free transaction (under KES{" "}
                            {ELEMENTPAY_CONFIG.MARKUP_THRESHOLD})
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Token Amount Required */}
                  {tokenAmount > 0 && (
                    <div className="p-2.5 bg-muted/30 rounded-md border space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          You need:
                        </span>
                        <span className="text-sm font-medium">
                          {tokenAmount.toFixed(6)} {selectedToken.symbol}
                        </span>
                      </div>

                      {/* Balance Check */}
                      {tokenBalance && (
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">
                              Wallet Balance:
                            </span>
                            <span
                              className={`font-medium ${
                                hasInsufficientBalance
                                  ? "text-red-500"
                                  : "text-green-600 dark:text-green-500"
                              }`}
                            >
                              {tokenBalance.formattedBalance}{" "}
                              {selectedToken.symbol}
                            </span>
                          </div>
                          {hasInsufficientBalance && (
                            <div className="flex items-center space-x-1 mt-1.5 text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              <span className="text-xs">
                                {ERROR_MESSAGES.INSUFFICIENT_BALANCE}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-muted/30 rounded-md border">
                  <span className="text-xs text-muted-foreground">
                    Loading exchange rate...
                  </span>
                </div>
              )}

              {/* Validation Status */}
              {kesAmount && phoneNumber && (
                <div className="pt-2 border-t">
                  <div className="flex items-center space-x-2 text-xs">
                    {isValidCalculation && !hasInsufficientBalance ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                        <span className="text-green-600 dark:text-green-500">
                          Ready to process
                        </span>
                      </>
                    ) : hasInsufficientBalance ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-red-500">
                          Insufficient balance
                        </span>
                      </>
                    ) : !isWalletConnected ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">
                          Please connect wallet
                        </span>
                      </>
                    ) : rateError ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-red-500">
                          Failed to load rates
                        </span>
                      </>
                    ) : isLoadingRate ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">
                          Loading rates...
                        </span>
                      </>
                    ) : !currentRate ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">
                          Rates not loaded
                        </span>
                      </>
                    ) : !validatePhoneNumber(phoneNumber) ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">
                          Invalid phone number
                        </span>
                      </>
                    ) : !validateAmount(kesAmount) ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">Invalid amount</span>
                      </>
                    ) : tokenAmount <= 0 ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">
                          Calculation failed
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-orange-500">
                          Complete all fields
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Process Payment Button */}
              {isWalletConnected && (
                <div className="pt-2">
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleProcessPayment}
                      disabled={
                        !isValidCalculation ||
                        hasInsufficientBalance ||
                        isProcessingTransaction
                      }
                      className="w-full h-10"
                      size="default"
                    >
                      {isProcessingTransaction ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Process Payment
                          {feeBreakdown?.totalAmount || kesAmount ? (
                            <span className="ml-2 font-semibold">
                              KES{" "}
                              {(
                                feeBreakdown?.totalAmount ||
                                parseFloat(kesAmount) ||
                                0
                              ).toLocaleString()}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Button>

                    {/* Cancel Transaction Button */}
                    {isProcessingTransaction && (
                      <Button
                        onClick={handleCancelTransaction}
                        variant="outline"
                        size="default"
                        className="w-full h-10"
                      >
                        Cancel Transaction
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
