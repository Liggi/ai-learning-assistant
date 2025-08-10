import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";
import { useEffect } from "react";
import Loading from "@/components/ui/loading";

export const Route = createFileRoute("/loading")({
  component: LoadingTest,
});

function LoadingTest() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && session) {
      router.navigate({ to: "/" });
    } else if (!isPending && !session) {
      router.navigate({ to: "/auth" });
    }
  }, [session, isPending, router]);

  return <Loading context="default" progress={75} />;
}
