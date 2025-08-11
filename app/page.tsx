
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image src="/elementpay.png" alt="Element Pay Logo" width={80} height={80} />
          </div>
          <h1 className="text-4xl font-bold">Element Pay Dashboard</h1>
          <p className="text-xl text-muted-foreground">
            Manage your payments and API keys with Element Pay
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome to Element Pay</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button asChild className="w-full" size="lg">
                <Link href="/auth/elementpay-login">Sign In</Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/auth/elementpay-signup">Create Account</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Connect to the Element Pay sandbox API
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
