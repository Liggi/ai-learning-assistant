import { defineConfig } from "@tanstack/start/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  vite: {
    resolve: {
      alias: [{ find: "@", replacement: resolve(__dirname, "./") }],
    },
  },
});
