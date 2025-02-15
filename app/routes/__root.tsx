import {
  Outlet,
  ScrollRestoration,
  createRootRoute,
  useLocation,
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
  const location = useLocation();

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          <div className="relative w-full h-full">
            <AnimatePresence mode="sync">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full absolute inset-0"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
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
