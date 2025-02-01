import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ChatInterfaceStatic from "@/components/chat-interface-static";

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

  const staticResponses = {
    "Let's begin our lesson.": "Welcome! Let's explore React Hooks together.",
    "What are the key concepts?":
      "The key concepts of React Hooks include:\n\n1. useState\n2. useEffect\n3. useContext\n4. useRef\n5. Custom Hooks",
    "Can you show an example?":
      "Here's a simple example of useState:\n\n```jsx\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(count + 1)}>\n      Count: {count}\n    </button>\n  );\n}\n```",
  };

  return (
    <div className="min-h-screen bg-background">
      <ChatInterfaceStatic
        node={sampleNode}
        onBack={() => navigate({ to: "/" })}
        staticResponses={staticResponses}
      />
    </div>
  );
}
