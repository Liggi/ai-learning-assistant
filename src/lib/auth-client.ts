import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  if (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
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