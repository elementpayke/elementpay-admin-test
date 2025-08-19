import NextAuth from "next-auth"
import type { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
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

        try {
          // Authenticate with Element Pay API through our proxy
          const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/elementpay/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            const error = await response.text()
            throw new Error(error || 'Authentication failed')
          }

          const data = await response.json()
          
          console.log('Element Pay proxy response:', JSON.stringify(data, null, 2))
          
          // Element Pay returns: { access_token, refresh_token, token_type }
          if (data.access_token) {
            return {
              id: credentials.email, // Use email as ID since Element Pay doesn't provide user details in auth response
              email: credentials.email,
              name: credentials.email, // Use email as name for now
              elementPayToken: data.access_token, // Store the Element Pay token
            } as User & { elementPayToken: string }
          }
          
          throw new Error('Invalid response from Element Pay - missing access_token')
        } catch (error) {
          console.error('Element Pay authentication error:', error)
          throw new Error(error instanceof Error ? error.message : 'Authentication failed')
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }: any) => {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.elementPayToken = user.elementPayToken // Store Element Pay token
      }
      return token
    },
    session: async ({ session, token }: any) => {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.elementPayToken = token.elementPayToken as string // Add to session
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
