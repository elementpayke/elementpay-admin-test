"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnvironmentToggle } from "@/components/ui/environment-toggle";
import { useEnvironment } from "@/hooks/use-environment";
import Link from "next/link";
import { toast as sonnerToast } from "sonner";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { environment, isSandbox } = useEnvironment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (!email.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address.",
        type: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        type: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/elementpay/password/reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          sandbox: environment === "sandbox",
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to send reset email" }));

        if (response.status === 404) {
          // Don't reveal if email exists for security
          toast({
            title: "Reset Email Sent",
            description:
              "If an account with this email exists, you'll receive a password reset code.",
          });
          router.push(
            `/auth/password/reset/confirm?email=${encodeURIComponent(
              email.trim()
            )}`
          );
          return;
        }

        throw new Error(
          errorData.error || errorData.detail || "Failed to send reset email"
        );
      }

      toast({
        title: "Reset Email Sent",
        description: "Please check your email for a password reset code.",
      });
      router.push(
        `/auth/password/reset/confirm?email=${encodeURIComponent(email.trim())}`
      );
    } catch (error: any) {
      console.error("Password reset request error:", error);
      toast({
        title: "Request Failed",
        description:
          error.message || "Unable to process your request. Please try again.",
        type: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Environment Toggle */}
      <div className="flex justify-center mb-4">
        <EnvironmentToggle
          variant="badge-buttons"
          size="md"
          showLabels={true}
          showIcons={true}
          disabled={isLoading}
        />
      </div>

      {/* Environment Info Banner */}
      {isSandbox && (
        <div className="bg-blue-50 border border-blue-200 text-center rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-600">
            Resetting password for sandbox environment.
          </p>
        </div>
      )}

      {!isSandbox && (
        <div className="bg-green-50 border border-green-200 text-center rounded-lg p-3 mb-4">
          <p className="text-xs text-green-600">
            Resetting password for live production environment.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending Reset Email..." : "Send Reset Email"}
      </Button>
      <div className="text-center text-sm">
        <Link href="/auth/login" className="text-muted-foreground underline">
          Back to Login
        </Link>
      </div>
      <div className="text-center text-xs text-muted-foreground">
        Already have a reset code?{" "}
        <Link href="/auth/password/reset/confirm" className="underline">
          Enter code here
        </Link>
      </div>
    </form>
  );
}
