"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useElementPayAuth } from "@/components/providers/elementpay-auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

export default function ElementPayLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useElementPayAuth()
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()
    if (!normalizedEmail || !trimmedPassword) {
      toast({
        title: "Missing credentials",
        description: "Enter your email and password.",
        type: "destructive",
      })
      return
    }

    const result = await login(normalizedEmail, trimmedPassword)

    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome to Element Pay!",
      })
      router.push("/dashboard")
    } else {
      toast({
        title: "Login Failed",
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
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </Button>
      <div className="text-center text-sm">
        <Link
          href="/auth/password/reset"
          className="underline text-muted-foreground"
        >
          Forgot password?
        </Link>
      </div>
      <div className="text-center text-xs text-muted-foreground">
        Have a code already?{" "}
        <Link href="/auth/password/reset/confirm" className="underline">
          Reset with code
        </Link>
      </div>
    </form>
  )
}
