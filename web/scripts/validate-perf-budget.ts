/**
 * Phase 15 (post-1.0) — CI smoke enforcing Phase 26 perf budgets.
 *
 * Usage:
 *   npm run perf:budget
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  presenterCapsMatchRuntime,
  perfBudgetGate,
  runSyntheticDowngradeSmoke,
  webBudgetsMatchRuntime,
} from "../src/render/perfBudgetGate";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const gate = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const matrix = readJson(resolve(root, "shared/perf/device-matrix.json"));

  if (gate.phase !== 15) errors.push(`phase expected 15, got ${gate.phase}`);
  if (gate.schema !== "fish.perf.budget_gate.v1") errors.push("bad schema");
  if (gate.phase26Catalog !== "shared/perf/device-matrix.json") errors.push("phase26Catalog mismatch");
  if (gate.simHzInvariant !== 20) errors.push("sim must stay 20 Hz");
  if (matrix.phase !== 26) errors.push("Phase 26 catalog phase drift");

  // Gate ↔ Phase 26 matrix
  for (const platform of ["android", "web"] as const) {
    const g = gate.budgets[platform];
    const m = matrix.platforms[platform];
    if (g.targetFps !== m.targetFps) errors.push(`${platform} targetFps drift`);
    for (const q of ["low", "medium", "high"] as const) {
      if (g.frameTargetMs[q] !== m.frameTargetMs[q]) {
        errors.push(`${platform} frameTargetMs.${q} drift vs matrix`);
      }
    }
    if (g.downgradeStreakFrames !== m.downgradeStreakFrames) {
      errors.push(`${platform} downgradeStreakFrames drift`);
    }
    if (g.overBudgetMultiplier !== matrix.autoDowngrade.overBudgetMultiplier) {
      errors.push(`${platform} overBudgetMultiplier drift`);
    }
  }
  if (gate.harborCacheLimit !== matrix.harborCacheLimit) errors.push("harborCacheLimit drift");
  if (gate.budgets.web.maxCssHeightMedium !== matrix.platforms.web.maxCssHeightMedium) {
    errors.push("web maxCssHeightMedium drift");
  }

  errors.push(...webBudgetsMatchRuntime());
  errors.push(...presenterCapsMatchRuntime());

  // Android FrameTiming.kt source pins
  const androidFt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt"),
    "utf8",
  );
  if (!androidFt.includes("33.3")) errors.push("Android FrameTiming missing 33.3 medium target");
  if (!androidFt.includes("40.0")) errors.push("Android FrameTiming missing 40.0 low target");
  if (!androidFt.includes("FRAME_DOWNGRADE_STREAK = 45")) {
    errors.push("Android FRAME_DOWNGRADE_STREAK must be 45");
  }
  if (!androidFt.includes("OVER_BUDGET_MULT = 1.15")) {
    errors.push("Android OVER_BUDGET_MULT must be 1.15");
  }

  const androidPr = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Presenters.kt"),
    "utf8",
  );
  const caps = gate.presenterCaps;
  if (!androidPr.includes(`PresenterQuality.LOW -> ${caps.fly.low}`)) {
    errors.push("Android flyingTransferPool LOW mismatch");
  }
  if (!androidPr.includes(`PresenterQuality.MEDIUM -> ${caps.fly.medium}`)) {
    errors.push("Android flyingTransferPool MEDIUM mismatch");
  }
  if (!androidPr.includes(`PresenterQuality.LOW -> ${caps.burst.low}`)) {
    errors.push("Android worldBurstPool LOW mismatch");
  }
  if (!androidPr.includes(`PresenterQuality.MEDIUM -> ${caps.burst.medium}`)) {
    errors.push("Android worldBurstPool MEDIUM mismatch");
  }
  // Crowd caps appear as bare ints in when() — require LOW/MEDIUM/HIGH table values.
  if (!androidPr.includes(`PresenterQuality.LOW -> ${caps.crowd.low}`)) {
    errors.push("Android crowdDrawCap LOW mismatch");
  }

  const smoke = runSyntheticDowngradeSmoke();
  if (!smoke.ok) errors.push(`smoke: ${smoke.detail}`);

  if (perfBudgetGate.failCriteria.length < 3) errors.push("need documented failCriteria");
  if (perfBudgetGate.deviceChecklist.length < 3) errors.push("need deviceChecklist");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("perf:budget FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK perf:budget — Phase 26 budgets enforced (web runtime + Android pins + synthetic smoke)");
