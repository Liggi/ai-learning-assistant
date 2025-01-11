/// <reference types="vinxi/types/client" />
// Import styles first to ensure they're loaded as early as possible
import "@/styles/globals.css";

import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/start";
import { createRouter } from "./router";

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
