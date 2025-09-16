"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { toast as sonnerToast } from "sonner"

export default function VerifyEmailForm() {
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Pre-fill email from URL params
  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Basic validation
    if (!email.trim() || !verificationCode.trim()) {
      sonnerToast.error("Missing Information", {
        description: "Please enter both email and verification code.",
        duration: 4000,
      })
      setIsLoading(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      sonnerToast.error("Invalid Email", {
        description: "Please enter a valid email address.",
        duration: 4000,
      })
      setIsLoading(false)
      return
    }

    try {
      // Show loading toast
      const loadingToast = sonnerToast.loading("Verifying Email...", {
        description: "Please wait while we verify your email address.",
      })

      const response = await fetch("/api/elementpay/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          verification_code: verificationCode.trim(),
        }),
      })

      // Dismiss loading toast
      sonnerToast.dismiss(loadingToast)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Verification failed" }))
        
        // Handle specific error cases from ElementPay API
        if (response.status === 400) {
          // Check for specific error messages
          if (errorData.message?.includes("expired") || errorData.message?.includes("Verification code has expired")) {
            sonnerToast.error("Verification Code Expired", {
              description: "Your verification code has expired. Please request a new one.",
              duration: 8000,
              action: {
                label: "Get New Code",
                onClick: () => handleResendCode()
              }
            })
            return
          } else if (errorData.message?.includes("invalid") || errorData.message?.includes("Invalid")) {
            sonnerToast.error("Invalid Verification Code", {
              description: "The verification code you entered is incorrect. Please check your email and try again.",
              duration: 6000,
              action: {
                label: "Resend Code",
                onClick: () => handleResendCode()
              }
            })
            return
          } else {
            sonnerToast.error("Verification Failed", {
              description: errorData.message || "The verification code is invalid or has expired. Please check your email or request a new code.",
              duration: 6000,
              action: {
                label: "Get New Code",
                onClick: () => handleResendCode()
              }
            })
            return
          }
        }
        
        if (response.status === 404) {
          sonnerToast.error("Account Not Found", {
            description: "No account found with this email address. Please check your email or create a new account.",
            duration: 6000,
            action: {
              label: "Sign Up",
              onClick: () => router.push("/auth/signup")
            }
          })
          return
        }

        if (response.status === 500 || errorData.message?.includes("Internal Server Error")) {
          sonnerToast.error("Service Unavailable", {
            description: "Email verification service is temporarily down. Please try again in a few minutes.",
            duration: 10000,
            action: {
              label: "Retry",
              onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent)
            }
          })
          return
        }

        throw new Error(errorData.error || errorData.message || errorData.detail || "Email verification failed")
      }

      sonnerToast.success("Email Verified Successfully", {
        description: "Your account has been verified. Redirecting to login...",
        duration: 3000,
      })
      
      setTimeout(() => {
        router.push("/auth/login")
      }, 1500)
    } catch (error: any) {
      console.error("Email verification error:", error)
      // Dismiss any loading toasts
      sonnerToast.dismiss()
      sonnerToast.error("Verification Failed", {
        description: error.message || "Unable to verify your email. Please try again.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent)
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email.trim()) {
      sonnerToast.error("Missing Email", {
        description: "Please enter your email address first.",
        duration: 4000,
      })
      return
    }

    setIsResending(true)

    try {
      // Show loading toast for resend operation
      const loadingToast = sonnerToast.loading("Sending New Code...", {
        description: "Please wait while we send a new verification code to your email.",
      })

      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      })

      // Dismiss loading toast
      sonnerToast.dismiss(loadingToast)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to resend verification code" }))
        
        if (response.status === 404) {
          sonnerToast.error("Account Not Found", {
            description: "No account found with this email address. Please check your email or create a new account.",
            duration: 6000,
            action: {
              label: "Sign Up",
              onClick: () => router.push("/auth/signup")
            }
          })
          return
        }
        
        if (response.status === 429) {
          sonnerToast.error("Too Many Requests", {
            description: "Please wait a few minutes before requesting another verification code.",
            duration: 8000,
          })
          return
        }

        if (response.status === 500) {
          sonnerToast.error("Service Unavailable", {
            description: "Unable to send verification code at this time. Please try again in a few minutes.",
            duration: 8000,
            action: {
              label: "Retry",
              onClick: () => handleResendCode()
            }
          })
          return
        }
        
        throw new Error(errorData.error || errorData.message || errorData.detail || "Failed to resend verification code")
      }

      sonnerToast.success("New Code Sent", {
        description: "A new verification code has been sent to your email. Please check your inbox.",
        duration: 5000,
      })
      
      // Clear the verification code field so user enters the new one
      setVerificationCode("")
    } catch (error: any) {
      console.error("Resend verification error:", error)
      // Dismiss any loading toasts
      sonnerToast.dismiss()
      sonnerToast.error("Resend Failed", {
        description: error.message || "Unable to resend verification code. Please try again.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => handleResendCode()
        }
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email address"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading || isResending}
        />
      </div>
      <div>
        <Label htmlFor="verificationCode">Verification Code</Label>
        <Input
          id="verificationCode"
          type="text"
          placeholder="Enter the verification code from your email"
          required
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          disabled={isLoading || isResending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || isResending}>
        {isLoading ? "Verifying..." : "Verify Email"}
      </Button>
      
      <div className="text-center space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResendCode}
          disabled={isLoading || isResending}
        >
          {isResending ? "Sending..." : "Resend Verification Code"}
        </Button>
      </div>

      <div className="text-center text-sm">
        <Link
          href="/auth/login"
          className="text-muted-foreground underline"
        >
          Back to Login
        </Link>
      </div>
      <div className="text-center text-xs text-muted-foreground">
        Need to change your email?{" "}
        <Link href="/auth/signup" className="underline">
          Create new account
        </Link>
      </div>
    </form>
  )
}