import ElementPaySignupForm from "@/components/auth/elementpay-signup-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"

export default function ElementPaySignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/elementpay.png" alt="Element Pay Logo" width={48} height={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Create Element Pay Account</CardTitle>
          <CardDescription>Sign up for a new Element Pay account.</CardDescription>
        </CardHeader>
        <CardContent>
          <ElementPaySignupForm />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/elementpay-login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
