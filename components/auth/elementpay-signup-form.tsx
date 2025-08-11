"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useElementPayAuth } from "@/components/providers/elementpay-auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronDown } from "lucide-react"

export default function ElementPaySignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("developer") // Set back to developer as default
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { register, isLoading } = useElementPayAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log("Form data:", { email, password, role }) // Debug log

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        type: "destructive",
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        type: "destructive",
      })
      return
    }

    // Check password complexity requirements
    const hasNumber = /\d/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)

    if (!hasNumber) {
      toast({
        title: "Password Invalid",
        description: "Password must contain at least one number.",
        type: "destructive",
      })
      return
    }

    if (!hasUppercase) {
      toast({
        title: "Password Invalid", 
        description: "Password must contain at least one uppercase letter.",
        type: "destructive",
      })
      return
    }

    if (!hasLowercase) {
      toast({
        title: "Password Invalid",
        description: "Password must contain at least one lowercase letter.", 
        type: "destructive",
      })
      return
    }

    if (!role) {
      toast({
        title: "Role Required",
        description: "Please select a role.",
        type: "destructive",
      })
      return
    }

    const result = await register(email, password, role)

    if (result.success) {
      toast({
        title: "Registration Successful",
        description: "Please check your email for verification code.",
      })
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } else {
      toast({
        title: "Registration Failed",
        description: result.error,
        type: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="user@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading}
          >
            <span className="text-foreground">
              {role === "developer" ? "Developer" : role === "business" ? "Business" : "Select a role"}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-input rounded-md shadow-lg">
              <div className="p-1">
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                  onClick={() => {
                    setRole("developer")
                    setIsDropdownOpen(false)
                    console.log("Role changed to: developer")
                  }}
                >
                  Developer
                </button>
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                  onClick={() => {
                    setRole("business")
                    setIsDropdownOpen(false)
                    console.log("Role changed to: business")
                  }}
                >
                  Business
                </button>
              </div>
            </div>
          )}
        </div>
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
          placeholder="At least 8 characters, 1 number, 1 uppercase, 1 lowercase"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Must be at least 8 characters with 1 number, 1 uppercase, and 1 lowercase letter
        </p>
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <Input
          id="confirm-password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating Account..." : "Create Account"}
      </Button>
    </form>
  )
}
