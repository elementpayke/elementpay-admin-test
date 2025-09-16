import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
    }
    elementPayToken?: string
    tokenType?: string
    userProfile?: any
    error?: string
  }

  interface User {
    id: string
    email: string
    name: string
    elementPayToken?: string
    elementPayRefreshToken?: string
    tokenType?: string
    userProfile?: any
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    email: string
    name: string
    elementPayToken?: string
    elementPayRefreshToken?: string
    tokenType?: string
    userProfile?: any
    tokenExpiry?: number
    error?: string
  }
}
