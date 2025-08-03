import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-6">
            <Image src="/elementpay.png" alt="Element Pay Logo" width={64} height={64} />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Element Pay</CardTitle>
          <CardDescription className="mt-2 text-lg text-muted-foreground">
            Manage your API keys and access powerful payment features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Start building with our secure payment APIs today.</p>
        </CardContent>
      </Card>
    </div>
  )
}
