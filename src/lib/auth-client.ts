import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  // Client-side: use current origin (works for all Vercel environments)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  // Server-side fallback
  return process.env.BETTER_AUTH_URL || "http://localhost:3000";
};

export const authClient = createAuthClient({
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