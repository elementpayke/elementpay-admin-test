import VerifyEmailForm from "@/components/auth/verify-email-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Suspense } from "react"

function VerifyEmailFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-muted animate-pulse rounded"></div>
      <div className="h-10 bg-muted animate-pulse rounded"></div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/elementpay.png" alt="Element Pay Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            A verification code has been sent to your email address. Please enter it below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<VerifyEmailFormFallback />}>
            <VerifyEmailForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
