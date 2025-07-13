/// <reference types="vinxi/types/server" />

// Initialize server-side telemetry FIRST
import { initializeServerTelemetry } from "@/lib/telemetry";
initializeServerTelemetry();

import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";
import "@/styles/globals.css";

import { createRouter } from "./router";

const handler = createStartHandler({
  createRouter,
  getRouterManifest,
});

export default handler(defaultStreamHandler);
