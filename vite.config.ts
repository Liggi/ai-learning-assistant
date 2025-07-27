import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [tanstackStart({ target: "vercel" })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
