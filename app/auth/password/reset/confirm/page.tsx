import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import ResetPasswordForm from "@/components/auth/reset-password-form"

export default function PasswordResetConfirmPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>
            Enter the reset code from your email and choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
