import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ChatLayout from "@/components/chat-layout";

export const Route = createFileRoute("/chat")({
  component: ChatRoute,
});

function ChatRoute() {
  const navigate = useNavigate();

  const sampleNode = {
    label: "React Hooks",
    description:
      "Learn about React's Hooks API and how to use them effectively in your components.",
    status: "not-started" as const,
  };

  return (
    <div className="min-h-screen bg-background">
      <ChatLayout
        node={sampleNode}
        subject="React"
        onBack={() => navigate({ to: "/" })}
      />
    </div>
  );
}
