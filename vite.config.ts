import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { denyImports } from "vite-env-only";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      target: "vercel",
      source: "src",
      customViteReactPlugin: true,
    }),
    react(),
    denyImports({
      environment: "client",
      patterns: [
        "@opentelemetry/*",
        "fs",
        "path",
        /^node:/,
        "Buffer",
        "process",
        "os",
        "url",
        "crypto",
        "stream",
        "net",
      ],
    }),
  ],
  optimizeDeps: {
    exclude: ["@tanstack/router-core"],
  },
  ssr: {
    noExternal: ["@tanstack/router-core"],
  },
  build: {
    rollupOptions: {
      external: ["node:stream", "node:stream/web", "node:async_hooks"],
    },
  },
});
