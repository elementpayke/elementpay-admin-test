import NextAuth from "next-auth"
import type { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserByEmail, verifyPassword, updateUserLastLogin } from "@/lib/mock-db"
import type { User } from "@/lib/types"

export const authOptions: AuthOptions = {
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/signup",
    verifyRequest: "/auth/verify-email",
  },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required")
        }

        const user = getUserByEmail(credentials.email as string)

        if (!user) {
          throw new Error("No user found with this email")
        }

        if (!user.emailVerified) {
          throw new Error("Email not verified. Please check your email for a verification code.")
        }

        const isValidPassword = await verifyPassword(credentials.password as string, user.password)

        if (!isValidPassword) {
          throw new Error("Invalid password")
        }

        // Update last login time
        updateUserLastLogin(credentials.email as string)

        return { id: user.id, email: user.email, name: user.name } as User
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }: any) => {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    session: async ({ session, token }: any) => {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.AUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
