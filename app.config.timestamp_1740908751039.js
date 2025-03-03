// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var app_config_default = defineConfig({
  vite: {
    resolve: {
      alias: [{ find: "@", replacement: resolve(__dirname, "./") }]
    }
  }
});
export {
  app_config_default as default
};
