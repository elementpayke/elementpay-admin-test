import { redirect } from "next/navigation"

export default function LoginPage() {
  // Redirect to Element Pay login
  redirect("/auth/elementpay-login")
}
