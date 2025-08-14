import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-950 text-foreground p-4"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(59, 130, 246, 0.6) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <AuthForm />
    </div>
  );
}
