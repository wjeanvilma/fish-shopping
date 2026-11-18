/**
 * Phase 15 (post-1.0) — CI smoke enforcing Phase 26 perf budgets.
 * Finish 4.0 Phase 27 soft-floors streaks/mult/cache + upgrade smoke.
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
  runSyntheticUpgradeSmoke,
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
    if (g.upgradeStreakFrames !== m.upgradeStreakFrames) {
      errors.push(`${platform} upgradeStreakFrames drift`);
    }
    if (g.overBudgetMultiplier !== matrix.autoDowngrade.overBudgetMultiplier) {
      errors.push(`${platform} overBudgetMultiplier drift`);
    }
    if (g.underBudgetMultiplier !== matrix.autoUpgrade.underBudgetMultiplier) {
      errors.push(`${platform} underBudgetMultiplier drift`);
    }
  }
  if (gate.harborCacheLimit !== matrix.harborCacheLimit) errors.push("harborCacheLimit drift");
  if (gate.budgets.web.maxCssHeightMedium !== matrix.platforms.web.maxCssHeightMedium) {
    errors.push("web maxCssHeightMedium drift");
  }
  // Finish 4.0 Phase 27 soft-floors
  if ((matrix.harborCacheLimit ?? 0) < 3) errors.push("harborCacheLimit soft-floor must be ≥3");
  if ((matrix.autoDowngrade?.overBudgetMultiplier ?? 99) > 1.12) {
    errors.push("overBudgetMultiplier soft-floor must be ≤1.12");
  }
  if ((matrix.platforms?.android?.downgradeStreakFrames ?? 99) > 40) {
    errors.push("android downgradeStreak soft-floor must be ≤40");
  }
  if ((matrix.platforms?.web?.downgradeStreakFrames ?? 99) > 75) {
    errors.push("web downgradeStreak soft-floor must be ≤75");
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
  if (!androidFt.includes("FRAME_DOWNGRADE_STREAK = 40")) {
    errors.push("Android FRAME_DOWNGRADE_STREAK must be 40");
  }
  if (!androidFt.includes("FRAME_UPGRADE_STREAK = 60")) {
    errors.push("Android FRAME_UPGRADE_STREAK must be 60");
  }
  if (!androidFt.includes("OVER_BUDGET_MULT = 1.12")) {
    errors.push("Android OVER_BUDGET_MULT must be 1.12");
  }
  if (!androidFt.includes("UNDER_BUDGET_MULT = 0.85")) {
    errors.push("Android UNDER_BUDGET_MULT must be 0.85");
  }
  if (!androidFt.includes("HARBOR_CACHE_LIMIT = 3")) {
    errors.push("Android HARBOR_CACHE_LIMIT must be 3");
  }
  if (!androidFt.includes("FrameBudgetAction")) {
    errors.push("Android FrameTiming missing FrameBudgetAction");
  }

  // Finish 4.0 soft-floor: presenter caps live in PresentersQuality / PresentersVfx.
  const androidPr =
    readFileSync(
      resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersQuality.kt"),
      "utf8",
    ) +
    "\n" +
    readFileSync(
      resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersVfx.kt"),
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
  if (!androidPr.includes(`PresenterQuality.LOW -> ${caps.crowd.low}`)) {
    errors.push("Android crowdDrawCap LOW mismatch");
  }

  const smoke = runSyntheticDowngradeSmoke();
  if (!smoke.ok) errors.push(`smoke: ${smoke.detail}`);
  const upgrade = runSyntheticUpgradeSmoke();
  if (!upgrade.ok) errors.push(`upgrade smoke: ${upgrade.detail}`);

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
console.log("OK perf:budget — Phase 26/27 budgets enforced (web runtime + Android pins + synthetic smoke)");
