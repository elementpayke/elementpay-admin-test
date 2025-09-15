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
      id: "credentials",
      name: "ElementPay",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        sandbox: { label: "Sandbox", type: "text" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required")
        }

        try {
          // Authenticate with Element Pay API through our internal proxy
          // NEXT_AUTH_URL is our Next.js app URL, not the ElementPay API URL
          const appBaseUrl = process.env.NEXT_AUTH_URL || 'http://localhost:3000'
          const isSandbox = credentials.sandbox === 'true'
          
          const response = await fetch(`${appBaseUrl}/api/elementpay/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              sandbox: isSandbox,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }))
            
            // Handle specific error cases
            if (response.status === 401) {
              throw new Error('Invalid email or password')
            }
            if (response.status === 403) {
              throw new Error('Email not verified. Please check your email for verification code.')
            }
            if (response.status === 429) {
              throw new Error('Too many login attempts. Please try again later.')
            }
            
            throw new Error(errorData.error || errorData.detail || 'Authentication failed')
          }

          const data = await response.json()
          
          // Element Pay returns: { access_token, refresh_token, token_type }
          if (!data.access_token) {
            throw new Error('Invalid response from ElementPay - missing access_token')
          }

          // Fetch user profile with the access token
          let userProfile = null
          try {
            const profileResponse = await fetch(`${appBaseUrl}/api/elementpay/me`, {
              headers: {
                'Authorization': `Bearer ${data.access_token}`,
                'Content-Type': 'application/json',
              },
            })
            
            if (profileResponse.ok) {
              userProfile = await profileResponse.json()
            }
          } catch (profileError) {
            console.warn('Failed to fetch user profile during login:', profileError)
          }

          return {
            id: userProfile?.id?.toString() || credentials.email,
            email: userProfile?.email || credentials.email,
            name: userProfile?.email || credentials.email,
            elementPayToken: data.access_token,
            elementPayRefreshToken: data.refresh_token,
            tokenType: data.token_type || 'Bearer',
            userProfile: userProfile,
          } as User & { 
            elementPayToken: string
            elementPayRefreshToken: string
            tokenType: string
            userProfile: any
          }
        } catch (error) {
          console.error('Element Pay authentication error:', error)
          throw error instanceof Error ? error : new Error('Authentication failed')
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, account }: any) => {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.elementPayToken = user.elementPayToken
        token.elementPayRefreshToken = user.elementPayRefreshToken
        token.tokenType = user.tokenType
        token.userProfile = user.userProfile
        token.tokenExpiry = Date.now() + (60 * 60 * 1000) // 1 hour from now
      }

      // Check if token needs refresh (refresh 5 minutes before expiry)
      const shouldRefresh = token.tokenExpiry && Date.now() > (token.tokenExpiry - 5 * 60 * 1000)
      
      if (shouldRefresh && token.elementPayRefreshToken) {
        try {
          const appBaseUrl = process.env.NEXT_AUTH_URL || 'http://localhost:3000'
          const refreshResponse = await fetch(`${appBaseUrl}/api/elementpay/token/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refresh_token: token.elementPayRefreshToken,
            }),
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            token.elementPayToken = refreshData.access_token
            token.elementPayRefreshToken = refreshData.refresh_token || token.elementPayRefreshToken
            token.tokenExpiry = Date.now() + (60 * 60 * 1000) // 1 hour from now
            console.log('Token refreshed successfully')
          } else {
            console.error('Token refresh failed, user will need to re-login')
            // Don't throw error here, let the session continue but mark for re-auth
            token.error = 'RefreshTokenError'
          }
        } catch (error) {
          console.error('Token refresh error:', error)
          token.error = 'RefreshTokenError'
        }
      }

      return token
    },
    session: async ({ session, token }: any) => {
      if (token) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.name = token.name
        session.elementPayToken = token.elementPayToken
        session.tokenType = token.tokenType
        session.userProfile = token.userProfile
        session.error = token.error
      }
      return session
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
