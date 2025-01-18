import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ChatScreenStatic from "@/components/chat-screen-static";

export const Route = createFileRoute("/static-chat")({
  component: StaticChatRoute,
});

function StaticChatRoute() {
  const navigate = useNavigate();

  const sampleNode = {
    label: "React Hooks",
    description:
      "Learn about React's Hooks API and how to use them effectively in your components.",
  };

  return (
    <div className="min-h-screen bg-background">
      <ChatScreenStatic
        node={sampleNode}
        onBack={() => navigate({ to: "/" })}
      />
    </div>
  );
}
