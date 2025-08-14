import { redirect } from "next/navigation"

export default function SignupPage() {
  // Redirect to Element Pay signup
  redirect("/auth/elementpay-signup")
}
