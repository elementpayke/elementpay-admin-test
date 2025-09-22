"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { EnvironmentToggle, EnvironmentIndicator } from "@/components/ui/environment-toggle"
import { useEnvironment } from "@/hooks/use-environment"
import { toast as sonnerToast } from "sonner"

export default function LoginForm() {
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
        description: "You're accessing ElementPay's sandbox environment for testing.",
        duration: 5000,
      })
    } else {
      switchToLive()
      sonnerToast.info("Live Mode", {
        description: "You're accessing ElementPay's live environment for production.",
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

    try {
      // Show loading toast for longer operations
      const loadingToast = sonnerToast.loading("Authenticating...", {
        description: "Please wait while we verify your credentials.",
      })

      const result = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        sandbox: environment === 'sandbox' ? 'true' : 'false',
      })

      // Dismiss loading toast
      sonnerToast.dismiss(loadingToast)

      if (result?.error) {
        // Handle specific error cases
        if (result.error.includes("Email not verified") || result.error.includes("verification")) {
          sonnerToast.error("Email Not Verified", {
            description: "Please check your email for a verification code.",
            duration: 6000,
          })
          router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`)
        } else if (result.error.includes("Invalid email or password")) {
          sonnerToast.error("Invalid Credentials", {
            description: "Please check your email and password and try again.",
            duration: 5000,
          })
        } else if (result.error.includes("Too many")) {
          sonnerToast.error("Rate Limited", {
            description: "Too many login attempts. Please try again in a few minutes.",
            duration: 8000,
          })
        } else if (result.error.includes("server error") || result.error.includes("sandbox environment")) {
          sonnerToast.error("Service Temporarily Unavailable", {
            description: "ElementPay authentication service is experiencing issues. Please try again in a few minutes.",
            duration: 10000,
            action: {
              label: "Retry",
              onClick: () => handleSubmit({ preventDefault: () => {} } as React.FormEvent)
            }
          })
        } else if (result.error.includes("Internal Server Error") || result.error.includes("500")) {
          sonnerToast.error("Server Error", {
            description: "The authentication service is currently down. We're working to resolve this issue.",
            duration: 10000,
            action: {
              label: "Contact Support",
              onClick: () => window.open("mailto:support@elementpay.net?subject=Login%20Issues", "_blank")
            }
          })
        } else {
          sonnerToast.error("Login Failed", {
            description: result.error,
            duration: 6000,
          })
        }
      } else if (result?.ok) {
        sonnerToast.success("Login Successful", {
          description: "Welcome back! Redirecting to dashboard...",
          duration: 2000,
        })
        // Use window.location for a clean redirect
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 1000)
      } else {
        sonnerToast.error("Login Failed", {
          description: "An unexpected error occurred. Please try again.",
          duration: 5000,
        })
      }
    } catch (error: any) {
      console.error("Login error:", error)
      // Dismiss any loading toasts
      sonnerToast.dismiss()
      sonnerToast.error("Connection Error", {
        description: "Unable to connect to authentication service. Please check your internet connection and try again.",
        duration: 8000,
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
            You're logging into ElementPay's sandbox console for testing and development.
          </p>
        </div>
      )}

      {!isSandbox && (
        <div className="bg-green-50 border border-green-200 text-center rounded-lg p-3 mb-4">
        
          <p className="text-xs text-green-600">
            You're logging into ElementPay's live production console.
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
      </div>
      <Button 
        type="submit" 
        className={`w-full ${isSandbox ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`} 
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : isSandbox ? "Login to Sandbox" : "Login to Live"}
      </Button>
      <div className="text-center text-sm">
        <Link
          href="/auth/password/reset"
          className="text-muted-foreground underline"
        >
          Forgot your password?
        </Link>
      </div>
    </form>
  )
}
