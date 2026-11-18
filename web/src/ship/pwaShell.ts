/**
 * Finish 3.0 Phase 19 — web PWA / service worker shell
 * (mirrors shared/ship/pwa-shell.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/pwa-shell.json";
import { SCHEMA_VERSION } from "../engine";
import {
  PWA_CACHE_PREFIX,
  PWA_SW_SCRIPT,
  canRegisterServiceWorker,
} from "../pwa/registerServiceWorker";

export interface PwaShellCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  pwaShellMarker: string;
  closesGap: string;
  policyCatalog: string;
  priorSpaHostPhase: number;
  priorSpaHostPlan: string;
  swScript: string;
  offlineFallback: string;
  manifestPath: string;
  registerModule: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const PWA_SHELL = catalogJson as unknown as PwaShellCatalog;
export const PWA_SHELL_PHASE = PWA_SHELL.phase;
export const PWA_SHELL_SCHEMA = PWA_SHELL.schema;
export const PWA_SHELL_MARKER = PWA_SHELL.pwaShellMarker;
export const PWA_CLOSES_GAP = PWA_SHELL.closesGap;

export interface PwaShellMeasure {
  schemaVersion: number;
  swPresent: boolean;
  offlinePresent: boolean;
  manifestStandalone: boolean;
  registerWired: boolean;
  mainRegisters: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  missingGates: string[];
  canRegisterLocalhost: boolean;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measurePwaShell(repoRoot: string): PwaShellMeasure {
  const swPath = resolve(repoRoot, "web/public/sw.js");
  const offlinePath = resolve(repoRoot, "web/public/offline.html");
  const manifestPath = resolve(repoRoot, PWA_SHELL.manifestPath);
  const registerPath = resolve(repoRoot, PWA_SHELL.registerModule);
  const mainPath = resolve(repoRoot, "web/src/main.tsx");
  const indexPath = resolve(repoRoot, "web/index.html");

  const sw = existsSync(swPath) ? readFileSync(swPath, "utf8") : "";
  const offline = existsSync(offlinePath) ? readFileSync(offlinePath, "utf8") : "";
  const register = existsSync(registerPath) ? readFileSync(registerPath, "utf8") : "";
  const main = existsSync(mainPath) ? readFileSync(mainPath, "utf8") : "";
  const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};

  let measuredAtPhase = -1;
  let kickoffWired = false;
  let gapClosed = false;
  try {
    const kickoff = readJson(resolve(repoRoot, PWA_SHELL.kickoffCatalog));
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    gapClosed = kickoff.gaps?.pwaMissing === false;
    const phase19 = (kickoff.phases as any[])?.find((p) => p.phase === 19);
    kickoffWired =
      measuredAtPhase >= 19 &&
      phase19?.id === "pwa-shell" &&
      phase19?.validate === "pwa:validate" &&
      gapClosed;
  } catch {
    kickoffWired = false;
  }

  const missingGates = PWA_SHELL.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    swPresent:
      sw.includes("fish-shopping-pwa-v1") &&
      sw.includes("offline.html") &&
      sw.includes("notificationclick"),
    offlinePresent: offline.toLowerCase().includes("offline") && offline.includes("Retry"),
    manifestStandalone: manifest.display === "standalone" && Array.isArray(manifest.icons),
    registerWired:
      register.includes("registerServiceWorker") &&
      register.includes("showPwaNotification") &&
      PWA_SW_SCRIPT === "./sw.js" &&
      PWA_CACHE_PREFIX.startsWith("fish-shopping-pwa-"),
    mainRegisters:
      main.includes("registerServiceWorker") &&
      index.includes('rel="manifest"') &&
      index.includes("apple-mobile-web-app-capable"),
    gapClosed,
    kickoffWired,
    measuredAtPhase,
    missingGates,
    canRegisterLocalhost: canRegisterServiceWorker({
      serviceWorker: {},
      isSecureContext: false,
      hostname: "localhost",
    }),
  };
}
