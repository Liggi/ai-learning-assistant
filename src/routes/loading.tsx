import { createFileRoute } from "@tanstack/react-router";
import Loading from "@/components/ui/loading";

export const Route = createFileRoute("/loading")({
  component: LoadingTest,
});

function LoadingTest() {
  return <Loading />;
}
