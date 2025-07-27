import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactFlowProvider } from "@xyflow/react";
import cssUrl from "@/styles/globals.css?url";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "AI Learning Assistant",
      },
    ],
    links: [{ rel: "stylesheet", href: cssUrl }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          <ReactFlowProvider>
            <div className="relative w-full h-full">
              <Toaster />
              <Outlet />
            </div>
            <Scripts />
          </ReactFlowProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">{children}</body>
    </html>
  );
}
