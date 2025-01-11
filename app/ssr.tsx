/// <reference types="vinxi/types/server" />
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/start/server";
import { getRouterManifest } from "@tanstack/start/router-manifest";
import "@/styles/globals.css";

import { createRouter } from "./router";

const handler = createStartHandler({
  createRouter,
  getRouterManifest,
});

export default handler(defaultStreamHandler);
