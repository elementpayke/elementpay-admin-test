import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ForgotPasswordForm from "@/components/auth/forgot-password-form"

export default function PasswordResetRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a reset code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
