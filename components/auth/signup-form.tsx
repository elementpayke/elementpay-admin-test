"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EnvironmentToggle, EnvironmentIndicator } from "@/components/ui/environment-toggle"
import { useEnvironment } from "@/hooks/use-environment"
import { toast as sonnerToast } from "sonner"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { environment, isSandbox, switchToSandbox, switchToLive } = useEnvironment()

  useEffect(() => {
    const sandboxParam = searchParams.get('sandbox')
    if (sandboxParam === 'true') {
      switchToSandbox()
      sonnerToast.info("Sandbox Mode", {
        description: "You're signing up for ElementPay's sandbox environment.",
        duration: 5000,
      })
    }
  }, [searchParams, switchToSandbox])
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Basic validation
    if (!email.trim() || !password.trim()) {
      sonnerToast.error("Missing Information", {
        description: "Please enter both email and password.",
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

    // Password validation
    if (password.length < 8) {
      sonnerToast.error("Password Too Short", {
        description: "Password must be at least 8 characters long.",
        duration: 4000,
      })
      setIsLoading(false)
      return
    }

    try {
      // Show loading toast for longer operations
      const loadingToast = sonnerToast.loading("Creating Account...", {
        description: "Please wait while we set up your account.",
      })

      const response = await fetch("/api/elementpay/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password: password.trim(),
          role: "developer", // Default role
          sandbox: environment === 'sandbox'
        }),
      })

      // Dismiss loading toast
      sonnerToast.dismiss(loadingToast)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Registration failed" }))
        
        // Handle specific error cases
        if (response.status === 409 || errorData.error?.includes("already exists")) {
          sonnerToast.error("Account Already Exists", {
            description: "An account with this email already exists. Try logging in instead.",
            duration: 6000,
            action: {
              label: "Go to Login",
              onClick: () => router.push("/auth/login")
            }
          })
          return
        }
        
        if (response.status === 422) {
          sonnerToast.error("Invalid Information", {
            description: errorData.error || "Please check your information and try again.",
            duration: 6000,
          })
          return
        }

        if (response.status === 500 || errorData.error?.includes("Internal Server Error")) {
          sonnerToast.error("Service Unavailable", {
            description: "Registration service is temporarily down. Please try again in a few minutes.",
            duration: 10000,
            action: {
              label: "Retry",
              onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent)
            }
          })
          return
        }

        throw new Error(errorData.error || errorData.detail || "Registration failed")
      }

      sonnerToast.success("Registration Successful", {
        description: "Please check your email for a verification code.",
        duration: 5000,
      })
      router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`)
    } catch (error: any) {
      console.error("Registration error:", error)
      // Dismiss any loading toasts
      sonnerToast.dismiss()
      sonnerToast.error("Registration Failed", {
        description: error.message || "An unexpected error occurred. Please try again.",
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
            You're creating a sandbox account for testing and development.
          </p>
        </div>
      )}

      {!isSandbox && (
        <div className="bg-green-50 border border-green-200 text-center rounded-lg p-3 mb-4">
          
          <p className="text-xs text-green-600">
            You're creating a live production account.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Password must be at least 8 characters long.
        </p>
      </div>
      <Button 
        type="submit" 
        className={`w-full ${isSandbox ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`} 
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : isSandbox ? "Sign Up for Sandbox" : "Sign Up for Live"}
      </Button>
    </form>
  )
}
