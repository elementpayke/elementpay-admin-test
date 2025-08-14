"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { elementPayAPI } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await elementPayAPI.requestPasswordReset({ email })
      toast({ title: "Reset email sent", description: "Check your inbox for the code." })
      router.push(`/auth/password/reset/confirm?email=${encodeURIComponent(email)}`)
    } catch (err: any) {
      toast({ title: "Request failed", description: err.message, type: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription>Enter your email to receive a reset code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send reset code"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have a code? <Link href="/auth/password/reset/confirm" className="underline">Enter it here</Link>
          </div>
          <div className="mt-2 text-center text-sm text-muted-foreground">
            Remembered it? <Link href="/auth/elementpay-login" className="underline">Back to login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
