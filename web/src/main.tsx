import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import "./ui/styles.css";

// Finish 3.0 Phase 19 — PWA service worker shell (no-op under Node/vitest).
void registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
