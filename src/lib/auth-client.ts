import { createAuthClient } from "better-auth/react"
import type { auth } from "./auth.server"

const getBaseURL = () => {
  // Client-side: use current origin (works for all Vercel environments)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
};

export const authClient = createAuthClient<typeof auth>({
  baseURL: getBaseURL(),
  fetchOptions: { 
    credentials: "include" 
  }
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient