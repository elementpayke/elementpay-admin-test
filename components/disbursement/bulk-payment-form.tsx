"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface PaymentEntry {
  id: string;
  phoneNumber: string;
  amount: string;
  isEditing?: boolean;
}

interface BulkPaymentFormProps {
  bulkPayments: PaymentEntry[];
  uploadedFile: File | null;
  onBulkPaymentsChange: (payments: PaymentEntry[]) => void;
  onUploadedFileChange: (file: File | null) => void;
  validatePhoneNumber: (phone: string) => boolean;
  validateAmount: (amount: string) => boolean;
}

export default function BulkPaymentForm({
  bulkPayments,
  uploadedFile,
  onBulkPaymentsChange,
  onUploadedFileChange,
  validatePhoneNumber,
  validateAmount,
}: BulkPaymentFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

    onUploadedFileChange(file);

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

        onBulkPaymentsChange(payments);

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
    onBulkPaymentsChange([...bulkPayments, newPayment]);
  };

  // Update payment entry
  const updatePayment = (
    id: string,
    field: keyof PaymentEntry,
    value: string
  ) => {
    onBulkPaymentsChange(
      bulkPayments.map((payment) =>
        payment.id === id ? { ...payment, [field]: value } : payment
      )
    );
  };

  // Delete payment entry
  const deletePayment = (id: string) => {
    onBulkPaymentsChange(bulkPayments.filter((payment) => payment.id !== id));
  };

  // Toggle edit mode
  const toggleEdit = (id: string) => {
    onBulkPaymentsChange(
      bulkPayments.map((payment) =>
        payment.id === id
          ? { ...payment, isEditing: !payment.isEditing }
          : payment
      )
    );
  };

  // Clear all payments
  const clearAllPayments = () => {
    onBulkPaymentsChange([]);
    onUploadedFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
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
                  File size: {(uploadedFile.size / 1024).toFixed(1)} KB
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
                    onUploadedFileChange(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
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
              <CardTitle className="text-lg">Payment Entries</CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={addNewPayment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllPayments}>
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
                      <TableCell className="font-medium">{index + 1}</TableCell>
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
                              !validatePhoneNumber(payment.phoneNumber) &&
                              payment.phoneNumber
                                ? "border-red-500"
                                : ""
                            }
                          />
                        ) : (
                          <span
                            className={
                              validatePhoneNumber(payment.phoneNumber)
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
                              !validateAmount(payment.amount) && payment.amount
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
                            onClick={() => deletePayment(payment.id)}
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
          </CardContent>
        </Card>
      )}

      {/* Add New Payment Button (when no payments) */}
      {bulkPayments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">No payments added yet</p>
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
    </div>
  );
}
