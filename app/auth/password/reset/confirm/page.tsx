"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { elementPayAPI } from "@/lib/utils"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function PasswordResetConfirmPage() {
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const prefill = search.get("email")
    if (prefill) setEmail(prefill)
  }, [search])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setCodeError(null)

    const passOk = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,}$/.test(password)
    if (!passOk) {
      toast({ 
        title: "Weak password", 
        description: "Use 8+ chars incl. number, upper and lower case.", 
        variant: "destructive" 
      })
      setLoading(false)
      return
    }

    try {
      const trimmedEmail = email.trim()
      const trimmedCode = code.trim()
      
      const response = await fetch("/api/auth/password/reset-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: trimmedEmail, 
          reset_code: trimmedCode, 
          new_password: password 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password")
      }

      toast({ 
        title: "Password updated", 
        description: "You can now log in with your new password." 
      })
      setSuccess(true)
    } catch (err: any) {
      let description = err?.message || "Reset failed"
      if (/invalid reset code/i.test(description)) {
        setCodeError(description)
      }
      toast({ 
        title: "Reset failed", 
        description, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>Enter the code sent to your email and set a new password.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-600/20">
                <AlertTitle className="text-green-700">Password updated</AlertTitle>
                <AlertDescription>You can now log in with your new password.</AlertDescription>
              </Alert>
              <Button asChild className="w-full">
                <Link href="/auth/elementpay-login">Go to login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="code">Reset code</Label>
                <Input id="code" required value={code} onChange={(e) => { setCode(e.target.value); if (codeError) setCodeError(null) }} />
                {codeError && <p className="text-sm text-red-600 mt-1">{codeError}</p>}
              </div>
              <div>
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </Button>
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Didn&apos;t get a code? <Link href="/auth/password/reset" className="underline">Resend</Link>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Back to <Link href="/auth/elementpay-login" className="underline">login</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
