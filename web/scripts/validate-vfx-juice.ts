/**
 * Phase 21 (post-1.0) — VFX juice readiness under the perf budget gate.
 *
 * Usage:
 *   npm run vfx:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/perf/vfx-juice.json"));
  const gate = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const webPr = readFileSync(resolve(root, "web/src/render/presenters.ts"), "utf8");
  const androidPr = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Presenters.kt"),
    "utf8",
  );
  const webScene = readFileSync(resolve(root, "web/src/render/HarborScene.ts"), "utf8");
  const androidRenderer = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRenderer.kt"),
    "utf8",
  );
  const host = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const vm = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 21) errors.push(`phase expected 21, got ${catalog.phase}`);
  if (catalog.schema !== "fish.perf.vfx_juice.v1") errors.push("bad schema");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (gate.vfxJuicePhase !== 21) errors.push("budget-gate.vfxJuicePhase must be 21");
  if (gate.vfxJuiceCatalog !== "shared/perf/vfx-juice.json") {
    errors.push("budget-gate.vfxJuiceCatalog mismatch");
  }

  const kinds = catalog.bursts.kinds as string[];
  for (const need of ["catch", "pay", "celebrate", "machine_done"]) {
    if (!kinds.includes(need)) errors.push(`missing burst kind ${need}`);
  }
  for (const q of ["low", "medium", "high"] as const) {
    if (catalog.bursts.poolByQuality[q] !== gate.presenterCaps.burst[q]) {
      errors.push(`burst.${q} must match budget-gate`);
    }
    if (catalog.fly.poolByQuality[q] !== gate.presenterCaps.fly[q]) {
      errors.push(`fly.${q} must match budget-gate`);
    }
    if (catalog.shake.scaleByQuality[q] !== gate.shakeScale[q]) {
      errors.push(`shakeScale.${q} must match budget-gate`);
    }
  }
  if (catalog.shake.maxAmplitudeM !== gate.maxShakeAmplitudeM) {
    errors.push("maxShakeAmplitudeM must match budget-gate");
  }
  if (catalog.shake.maxAmplitudeM > 0.2) errors.push("maxShakeAmplitudeM too large for mobile");
  if (!catalog.feedback.catchBurstOnEveryCatch) errors.push("catchBurstOnEveryCatch required");

  if (!webPr.includes('"catch"') || !webPr.includes("ScreenShake")) {
    errors.push("web presenters missing catch burst / ScreenShake");
  }
  if (!webPr.includes("cappedShakeAmplitudeM")) errors.push("web missing cappedShakeAmplitudeM");
  if (!androidPr.includes("WorldBurstKind.CATCH") && !androidPr.includes("CATCH,")) {
    errors.push("Android presenters missing CATCH burst kind");
  }
  if (!androidPr.includes("class ScreenShake")) errors.push("Android missing ScreenShake");
  if (!androidPr.includes("MAX_SHAKE_AMPLITUDE_M")) errors.push("Android missing shake cap");

  if (!webScene.includes("screenShake") || !webScene.includes("enqueueShakes")) {
    errors.push("HarborScene must apply ScreenShake");
  }
  if (!androidRenderer.includes("screenShake") || !androidRenderer.includes("enqueueShakes")) {
    errors.push("HarborRenderer must apply ScreenShake");
  }
  if (!host.includes("resolveCatchBurst") || !host.includes("drainShakes")) {
    errors.push("GameHost must emit catch bursts + shakes");
  }
  if (!vm.includes("resolveCatchBurst") || !vm.includes("drainShakes")) {
    errors.push("GameViewModel must emit catch bursts + shakes");
  }
  if (!ci.includes("vfx:validate")) errors.push("ci.yml missing vfx:validate");

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("vfx:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK vfx:validate — catch/cut/sale juice + shake caps under perf gate");
