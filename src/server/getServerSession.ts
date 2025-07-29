import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth.server";

export const getServerSession = createServerFn()
  .handler(async () => {
    console.log("[getServerSession] Starting session check");
    const { headers } = getWebRequest()!;
    console.log("[getServerSession] Headers:", Object.fromEntries(headers.entries()));
    
    const session = await auth.api.getSession({ headers });
    console.log("[getServerSession] Session result:", session ? "Found session" : "No session", session?.user?.email || "No user");
    
    return session;
  });