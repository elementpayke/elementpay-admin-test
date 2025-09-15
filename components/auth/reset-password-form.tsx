"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { toast as sonnerToast } from "sonner"

export default function ResetPasswordForm() {
  const [email, setEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long"
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter"
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter"
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Basic validation
    if (!email.trim() || !resetCode.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        type: "destructive",
      })
      setIsLoading(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        type: "destructive",
      })
      setIsLoading(false)
      return
    }

    // Password validation
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      toast({
        title: "Invalid Password",
        description: passwordError,
        type: "destructive",
      })
      setIsLoading(false)
      return
    }

    // Confirm password
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        type: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/elementpay/password/reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          reset_code: resetCode.trim(),
          new_password: newPassword.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Password reset failed" }))
        
        if (response.status === 400) {
          toast({
            title: "Invalid Reset Code",
            description: "The reset code is invalid or has expired. Please request a new one.",
            type: "destructive",
          })
          return
        }
        
        if (response.status === 404) {
          toast({
            title: "Account Not Found",
            description: "No account found with this email address.",
            type: "destructive",
          })
          return
        }

        throw new Error(errorData.error || errorData.detail || "Password reset failed")
      }

      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
      })
      router.push("/auth/login")
    } catch (error: any) {
      console.error("Password reset error:", error)
      toast({
        title: "Reset Failed",
        description: error.message || "Unable to reset your password. Please try again.",
        type: "destructive",
      })
    } finally {
      setIsLoading(false)
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
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="resetCode">Reset Code</Label>
        <Input
          id="resetCode"
          type="text"
          placeholder="Enter the reset code from your email"
          required
          value={resetCode}
          onChange={(e) => setResetCode(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your new password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Must be at least 8 characters with 1 number, 1 uppercase, and 1 lowercase letter
        </p>
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm your new password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Resetting Password..." : "Reset Password"}
      </Button>
      <div className="text-center text-sm">
        <Link
          href="/auth/login"
          className="text-muted-foreground underline"
        >
          Back to Login
        </Link>
      </div>
      <div className="text-center text-xs text-muted-foreground">
        Need a new reset code?{" "}
        <Link href="/auth/password/reset" className="underline">
          Request new code
        </Link>
      </div>
    </form>
  )
}
