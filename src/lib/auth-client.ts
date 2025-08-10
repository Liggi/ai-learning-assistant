import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth.server";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  return `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth`;
};

export const authClient = createAuthClient<typeof auth>({
  baseURL: getBaseURL(),
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
