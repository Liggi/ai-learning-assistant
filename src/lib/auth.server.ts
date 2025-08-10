import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { reactStartCookies } from "better-auth/react-start"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { 
      enabled: true, 
      maxAge: 5 * 60
    },
    cookie: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      path: '/',
    }
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [
    "https://*.vercel.app",
    "https://thekg.io",
    "https://www.thekg.io",
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  plugins: [reactStartCookies()],
})