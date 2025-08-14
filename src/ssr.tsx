/// <reference types="vite/client" />

import { getRouterManifest } from "@tanstack/react-start/router-manifest";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

import { createRouter } from "./router";

const handler = createStartHandler({
  createRouter,
  getRouterManifest,
});

export default handler(defaultStreamHandler);
