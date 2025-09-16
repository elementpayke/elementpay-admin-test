"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast as sonnerToast } from "sonner"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  

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
          role: "developer" // Default role
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
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Signing up..." : "Sign Up"}
      </Button>
    </form>
  )
}
