import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

const prisma = new PrismaClient();

function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

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
      clientId: requireEnvVar("GITHUB_CLIENT_ID"),
      clientSecret: requireEnvVar("GITHUB_CLIENT_SECRET"),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: requireEnvVar("BETTER_AUTH_SECRET"),
  baseURL: requireEnvVar("BETTER_AUTH_URL"),
  trustedOrigins: [
    "https://*.vercel.app",
    "https://thekg.io",
    "https://www.thekg.io",
    "http://localhost:3000",
  ],
});
