import ElementPayLoginForm from "@/components/auth/elementpay-login-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export default function ElementPayLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/elementpay.png" alt="Element Pay Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Element Pay</CardTitle>
          <CardDescription>Sign in to your Element Pay account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ElementPayLoginForm />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/elementpay-signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
