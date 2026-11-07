/**
 * Phase 14 (post-1.0) — validate browser matrix vs Phase 28 + host wiring.
 *
 * Usage:
 *   npm run lifecycle:browser:validate
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const matrix = readJson(resolve(root, "shared/lifecycle/browser-matrix.json"));
  const phase28 = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const policy = readFileSync(resolve(root, "web/src/game/lifecyclePolicy.ts"), "utf8");
  const save = readFileSync(resolve(root, "web/src/game/saveStore.ts"), "utf8");
  const harbor = readFileSync(resolve(root, "web/src/render/HarborScene.ts"), "utf8");
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");

  if (matrix.phase !== 14) errors.push(`phase expected 14, got ${matrix.phase}`);
  if (matrix.schema !== "fish.lifecycle.browser_matrix.v1") errors.push("bad schema");
  if (matrix.phase28Catalog !== "shared/lifecycle/browser-lifecycle.json") {
    errors.push("phase28Catalog path mismatch");
  }
  if (phase28.phase !== 28) errors.push("Phase 28 catalog phase drift");
  if (phase28.web.browserMatrixPhase !== 14) errors.push("Phase 28 missing browserMatrixPhase 14");

  const browsers = (matrix.browsers as any[]).map((b) => b.id);
  for (const need of ["chrome", "firefox", "safari"]) {
    if (!browsers.includes(need)) errors.push(`missing browser ${need}`);
  }
  const scenarios = (matrix.scenarios as any[]).map((s) => s.id);
  for (const need of ["webgl2_gate", "context_loss", "storage_quota", "audio_unlock"]) {
    if (!scenarios.includes(need)) errors.push(`missing scenario ${need}`);
  }

  const unlock = matrix.audioUnlockEvents as string[];
  if (!unlock.includes("touchstart")) errors.push("audioUnlockEvents must include touchstart for Safari");
  if (JSON.stringify(unlock) !== JSON.stringify(phase28.web.audioGesture.unlockEvents)) {
    errors.push("audioUnlockEvents must match Phase 28 web.audioGesture.unlockEvents");
  }
  if (!policy.includes('"touchstart"') && !policy.includes("'touchstart'")) {
    errors.push("lifecyclePolicy audioUnlockEvents missing touchstart");
  }

  if (!harbor.includes("hasWebGL2")) errors.push("HarborScene missing hasWebGL2");
  if (!harbor.includes("webglcontextlost")) errors.push("HarborScene missing context lost handler");
  if (!harbor.includes("preventDefault")) errors.push("context lost must preventDefault");
  if (!app.includes("hasWebGL2")) errors.push("App missing WebGL2 gate");
  if (!app.includes("WEBGL2_GATE_COPY")) errors.push("App missing WebGL2 gate copy");
  if (!app.includes("audioUnlockEvents")) errors.push("App missing audio unlock wiring");

  if (!save.includes("isQuotaExceededError")) errors.push("saveStore missing quota detector");
  if (!save.includes("withQuotaFallback")) errors.push("saveStore missing quota fallback wrapper");
  if (matrix.storageQuota.fallback !== phase28.web.storageUnavailable.fallback) {
    errors.push("storage fallback must match Phase 28");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("lifecycle:browser:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK lifecycle:browser:validate — Chrome/Safari/Firefox matrix wired");
