"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AuthGuard from "@/components/auth/auth-guard";
import DashboardLayout from "@/components/dashboard/dashboard-layout";
import WalletConnection from "@/components/dashboard/wallet-connection";
import { useAuth } from "@/hooks/use-auth";
import { useDisbursement } from "@/hooks/use-disbursement";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Users,
  DollarSign,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type {
  Token,
  PaymentMethod,
  PaymentDestination,
  TokenBalance,
  DisbursementQuote,
  DisbursementOrder,
  PaymentProgress,
} from "@/lib/types";

// Types for payment data
interface PaymentEntry {
  id: string;
  phoneNumber: string;
  amount: string;
  isEditing?: boolean;
}

interface PaymentSummary {
  totalRecipients: number;
  totalAmount: number;
  currency: string;
}

type PaymentMode = "single" | "bulk";

export default function DisbursementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use actual API data
  const {
    rates,
    isLoadingRates,
    currentQuote: hookCurrentQuote,
    isLoadingQuote,
    recentDisbursements,
    fetchRates,
    getQuote,
    createDisbursement,
  } = useDisbursement();

  // Wallet state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");

  // Payment mode state
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("single");

  // Single payment state
  const [singlePayment, setSinglePayment] = useState({
    phoneNumber: "",
    amount: "",
  });

  // Bulk payment state
  const [bulkPayments, setBulkPayments] = useState<PaymentEntry[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form state
  const [selectedToken, setSelectedToken] = useState<Token>("BASE_USDC");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PHONE");

  // UI state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentProgress, setPaymentProgress] =
    useState<PaymentProgress | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Get token balance for selected token
  const selectedTokenBalance = { balance: 125.5, token: selectedToken };
  // Get current rate from rates data
  const currentRate = rates?.[selectedToken]?.rate || 130.5; // Mock rate for demo

  // Wallet connection handler
  const handleWalletConnection = (connected: boolean, address?: string) => {
    setIsWalletConnected(connected);
    setWalletAddress(address || "");
  };

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    const kenyanPhoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
    return kenyanPhoneRegex.test(phone.replace(/\s/g, ""));
  };

  // Amount validation
  const validateAmount = (amount: string): boolean => {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num <= 1000000; // Max 1M KES
  };

  // Format phone number
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("254")) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0")) {
      return `+254${cleaned.substring(1)}`;
    }
    return phone;
  };

  // Generate sample CSV file
  const downloadSampleFile = () => {
    const sampleData = [
      ["Phone Number", "Amount"],
      ["+254712345678", "1000"],
      ["+254723456789", "2500"],
      ["+254734567890", "500"],
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_payments_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sample File Downloaded",
      description: "Template file has been downloaded to your computer",
    });
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(fileExtension || "")) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV or Excel file",
      });
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;

      try {
        let parsedData: any[][] = [];

        if (fileExtension === "csv") {
          const result = Papa.parse(data as string, { header: false });
          parsedData = result.data as any[][];
        } else {
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        }

        // Skip header row and process data
        const payments: PaymentEntry[] = parsedData
          .slice(1)
          .filter((row) => row[0] && row[1]) // Filter out empty rows
          .map((row, index) => ({
            id: `payment-${Date.now()}-${index}`,
            phoneNumber: String(row[0]).trim(),
            amount: String(row[1]).trim(),
          }));

        setBulkPayments(payments);

        toast({
          title: "File Uploaded Successfully",
          description: `Loaded ${payments.length} payment entries`,
        });
      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: "File Parse Error",
          description: "Failed to parse the uploaded file",
        });
      }
    };

    if (fileExtension === "csv") {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Add new payment entry
  const addNewPayment = () => {
    const newPayment: PaymentEntry = {
      id: `payment-${Date.now()}`,
      phoneNumber: "",
      amount: "",
      isEditing: true,
    };
    setBulkPayments([...bulkPayments, newPayment]);
  };

  // Update payment entry
  const updatePayment = (
    id: string,
    field: keyof PaymentEntry,
    value: string
  ) => {
    setBulkPayments((payments) =>
      payments.map((payment) =>
        payment.id === id ? { ...payment, [field]: value } : payment
      )
    );
  };

  // Delete payment entry
  const deletePayment = (id: string) => {
    setBulkPayments((payments) =>
      payments.filter((payment) => payment.id !== id)
    );
  };

  // Toggle edit mode
  const toggleEdit = (id: string) => {
    setBulkPayments((payments) =>
      payments.map((payment) =>
        payment.id === id
          ? { ...payment, isEditing: !payment.isEditing }
          : payment
      )
    );
  };

  // Clear all payments
  const clearAllPayments = () => {
    setBulkPayments([]);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate payment summary
  const getPaymentSummary = (): PaymentSummary => {
    if (paymentMode === "single") {
      return {
        totalRecipients:
          singlePayment.phoneNumber && singlePayment.amount ? 1 : 0,
        totalAmount: parseFloat(singlePayment.amount) || 0,
        currency: "KES",
      };
    } else {
      const validPayments = bulkPayments.filter(
        (p) => validatePhoneNumber(p.phoneNumber) && validateAmount(p.amount)
      );
      return {
        totalRecipients: validPayments.length,
        totalAmount: validPayments.reduce(
          (sum, p) => sum + parseFloat(p.amount),
          0
        ),
        currency: "KES",
      };
    }
  };

  // Validate form
  const isFormValid = (): boolean => {
    if (!isWalletConnected) return false;

    if (paymentMode === "single") {
      return (
        validatePhoneNumber(singlePayment.phoneNumber) &&
        validateAmount(singlePayment.amount)
      );
    } else {
      return (
        bulkPayments.length > 0 &&
        bulkPayments.every(
          (p) => validatePhoneNumber(p.phoneNumber) && validateAmount(p.amount)
        )
      );
    }
  };

  // Process payments
  const processPayments = async () => {
    if (!isFormValid()) return;

    setIsProcessingPayment(true);
    setPaymentProgress({
      step: "blockchain_processing",
      message: "Processing your payment request...",
    });

    try {
      const summary = getPaymentSummary();

      // Mock processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setPaymentProgress({
        step: "completed",
        message: `Successfully processed ${
          summary.totalRecipients
        } payment(s) totaling KES ${summary.totalAmount.toLocaleString()}`,
      });

      toast({
        title: "Payments Processed",
        description: `${summary.totalRecipients} payment(s) sent successfully`,
      });

      // Reset form
      if (paymentMode === "single") {
        setSinglePayment({ phoneNumber: "", amount: "" });
      } else {
        clearAllPayments();
      }

      setShowConfirmDialog(false);
    } catch (error) {
      setPaymentProgress({
        step: "failed",
        message: "Payment processing failed. Please try again.",
      });

      toast({
        title: "Payment Failed",
        description: "There was an error processing your payments",
      });
    } finally {
      setIsProcessingPayment(false);
      setTimeout(() => setPaymentProgress(null), 5000);
    }
  };

  const summary = getPaymentSummary();

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="container mx-auto p-6 space-y-6 !w-full">
          {/* Header */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Crypto Disbursement
            </h1>
            <p className="text-muted-foreground">
              Send cryptocurrency payments to multiple recipients via M-PESA
            </p>
          </div>

          {/* Wallet Connection */}
          <WalletConnection
            onConnectionChange={handleWalletConnection}
            className="!w-full"
          />

          {/* Payment Mode Selection */}
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
                onValueChange={(value) => setPaymentMode(value as PaymentMode)}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="single"
                    className="flex items-center space-x-2"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Single Payment</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="bulk"
                    className="flex items-center space-x-2"
                  >
                    <Users className="h-4 w-4" />
                    <span>Bulk Payments</span>
                  </TabsTrigger>
                </TabsList>

                {/* Single Payment Form */}
                <TabsContent value="single" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        Single Payment Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="single-phone">Phone Number</Label>
                          <Input
                            id="single-phone"
                            placeholder="+254712345678"
                            value={singlePayment.phoneNumber}
                            onChange={(e) =>
                              setSinglePayment((prev) => ({
                                ...prev,
                                phoneNumber: e.target.value,
                              }))
                            }
                            className={
                              !validatePhoneNumber(singlePayment.phoneNumber) &&
                              singlePayment.phoneNumber
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {singlePayment.phoneNumber &&
                            !validatePhoneNumber(singlePayment.phoneNumber) && (
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
                            value={singlePayment.amount}
                            onChange={(e) =>
                              setSinglePayment((prev) => ({
                                ...prev,
                                amount: e.target.value,
                              }))
                            }
                            className={
                              !validateAmount(singlePayment.amount) &&
                              singlePayment.amount
                                ? "border-red-500"
                                : ""
                            }
                          />
                          {singlePayment.amount &&
                            !validateAmount(singlePayment.amount) && (
                              <p className="text-sm text-red-500">
                                Amount must be between 1 and 1,000,000 KES
                              </p>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Bulk Payments Form */}
                <TabsContent value="bulk" className="space-y-4 mt-6">
                  {/* File Upload */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>File Upload</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadSampleFile}
                          className="flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Sample</span>
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          isDragOver
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25"
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <div className="space-y-2">
                          <p className="text-lg font-medium">
                            {uploadedFile
                              ? uploadedFile.name
                              : "Drop your file here or click to browse"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Supports CSV and Excel files (.csv, .xlsx, .xls)
                          </p>
                          {uploadedFile && (
                            <p className="text-sm text-green-600">
                              File size: {(uploadedFile.size / 1024).toFixed(1)}{" "}
                              KB
                            </p>
                          )}
                        </div>
                        <div className="flex justify-center space-x-2 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                          {uploadedFile && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setUploadedFile(null);
                                if (fileInputRef.current)
                                  fileInputRef.current.value = "";
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear
                            </Button>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          className="hidden"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Table */}
                  {bulkPayments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            Payment Entries
                          </CardTitle>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={addNewPayment}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add New
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearAllPayments}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clear All
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">#</TableHead>
                                <TableHead>Phone Number</TableHead>
                                <TableHead>Amount (KES)</TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bulkPayments.map((payment, index) => (
                                <TableRow key={payment.id}>
                                  <TableCell className="font-medium">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell>
                                    {payment.isEditing ? (
                                      <Input
                                        value={payment.phoneNumber}
                                        onChange={(e) =>
                                          updatePayment(
                                            payment.id,
                                            "phoneNumber",
                                            e.target.value
                                          )
                                        }
                                        placeholder="+254712345678"
                                        className={
                                          !validatePhoneNumber(
                                            payment.phoneNumber
                                          ) && payment.phoneNumber
                                            ? "border-red-500"
                                            : ""
                                        }
                                      />
                                    ) : (
                                      <span
                                        className={
                                          validatePhoneNumber(
                                            payment.phoneNumber
                                          )
                                            ? ""
                                            : "text-red-500"
                                        }
                                      >
                                        {payment.phoneNumber || "Invalid"}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {payment.isEditing ? (
                                      <Input
                                        type="number"
                                        value={payment.amount}
                                        onChange={(e) =>
                                          updatePayment(
                                            payment.id,
                                            "amount",
                                            e.target.value
                                          )
                                        }
                                        placeholder="1000"
                                        className={
                                          !validateAmount(payment.amount) &&
                                          payment.amount
                                            ? "border-red-500"
                                            : ""
                                        }
                                      />
                                    ) : (
                                      <span
                                        className={
                                          validateAmount(payment.amount)
                                            ? ""
                                            : "text-red-500"
                                        }
                                      >
                                        {payment.amount
                                          ? `KES ${parseFloat(
                                              payment.amount
                                            ).toLocaleString()}`
                                          : "Invalid"}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleEdit(payment.id)}
                                      >
                                        {payment.isEditing ? (
                                          <Check className="h-4 w-4" />
                                        ) : (
                                          <Edit3 className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          deletePayment(payment.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Table Summary */}
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Summary:</span>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {summary.totalRecipients} recipient(s)
                              </p>
                              <p className="text-lg font-bold">
                                KES {summary.totalAmount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Add New Payment Button (when no payments) */}
                  {bulkPayments.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                          No payments added yet
                        </p>
                        <p className="text-muted-foreground mb-4">
                          Upload a file or add payments manually
                        </p>
                        <Button onClick={addNewPayment}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Payment
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Payment Summary & Submit */}
          {summary.totalRecipients > 0 && (
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
                    <p className="text-2xl font-bold">
                      {summary.totalRecipients}
                    </p>
                    <p className="text-sm text-muted-foreground">Recipients</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">
                      KES {summary.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Amount
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">
                      {"--"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {"--"} Required
                    </p>
                  </div>
                </div>

                <Dialog
                  open={showConfirmDialog}
                  onOpenChange={setShowConfirmDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={!isFormValid() || isProcessingPayment}
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
                          <span className="font-medium">
                            {summary.totalRecipients}
                          </span>
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
                          onClick={() => setShowConfirmDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={processPayments}
                          disabled={isProcessingPayment}
                        >
                          {isProcessingPayment
                            ? "Processing..."
                            : "Confirm Payment"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Payment Progress */}
          {paymentProgress && (
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
                        Estimated time: {paymentProgress.estimatedTimeRemaining}
                        s
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          {recentDisbursements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Recent Transactions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentDisbursements.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          KES {transaction.kesAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(
                            transaction.created_at
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          transaction.status === "COMPLETED"
                            ? "default"
                            : transaction.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
