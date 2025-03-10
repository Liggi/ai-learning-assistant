import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
  useRouter,
} from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

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
  }),
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();

  // Set up router-based view transitions for modern browsers
  useEffect(() => {
    // Check if View Transitions API is supported
    if (document.startViewTransition) {
      // Add transition handler for route changes
      const unsubscribe = router.subscribe(
        "onBeforeNavigate",
        ({ toLocation }) => {
          // Don't animate on initial load
          if (!router.state.location) return;

          // Use View Transitions API
          document.startViewTransition?.(() => {
            return new Promise((resolve) => {
              // Give router time to update DOM
              setTimeout(resolve, 0);
            });
          });
        }
      );

      return unsubscribe;
    }
  }, [router]);

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          <div className="relative w-full h-full">
            <Outlet />
          </div>
          <ScrollRestoration />
          <Scripts />
        </TooltipProvider>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html className="dark">
      <head>
        <Meta />
      </head>
      <body>{children}</body>
    </html>
  );
}
