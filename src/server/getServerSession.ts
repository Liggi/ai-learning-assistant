import { createServerFn } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth.server";

export const getServerSession = createServerFn().handler(async () => {
  const webRequest = getWebRequest();
  if (!webRequest) {
    throw new Error("No web request available");
  }
  const { headers } = webRequest;

  const session = await auth.api.getSession({ headers });

  return session;
});
