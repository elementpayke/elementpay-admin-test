import LoginForm from "@/components/auth/login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-muted animate-pulse rounded"></div>
      <div className="h-10 bg-muted animate-pulse rounded"></div>
      <div className="h-10 bg-muted animate-pulse rounded"></div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/elementpay.png" alt="Element Pay Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Element Pay account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
