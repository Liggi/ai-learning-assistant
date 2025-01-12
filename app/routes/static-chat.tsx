import { createFileRoute } from "@tanstack/react-router";
import ChatScreenStatic from "@/components/chat-screen-static";

export const Route = createFileRoute("/static-chat")({
  component: StaticChatRoute,
});

function StaticChatRoute() {
  return <ChatScreenStatic />;
}
