/**
 * Finish 6.0 Phase 28 — Device/browser/perf matrix 6
 * (mirrors shared/ship/device-perf-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/device-perf-6.json";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL,
  FLYING_TRANSFER_POOL_BY_QUALITY,
} from "../render/presenters/quality";
import { VFX_BURST_POOL, VFX_BURST_POOL_BY_QUALITY } from "../render/presenters/vfx";
import { HARBOR_CACHE_LIMIT } from "../render/frameTiming";

export interface DevicePerf6ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  devicePerf6Marker: string;
  closesGap: string;
  perfMatrix: string;
  budgetGate: string;
  androidMatrix: string;
  browserMatrix: string;
  harborCacheFloor: number;
  overBudgetMultMax: number;
  underBudgetMult: number;
  androidDeviceClassFloor: number;
  androidScenarioFloor: number;
  browserTargetFloor: number;
  browserScenarioFloor: number;
  analyticsContractTestsMin: number;
  presenterCaps: {
    crowd: { low: number; medium: number; high: number };
    fly: { low: number; medium: number; high: number };
    burst: { low: number; medium: number; high: number };
  };
  parityFixture: string;
  validateScript: string;
  softDevicePerf5Validate: string;
  kickoffCatalog: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export const DEVICE_PERF_6 = catalogJson as unknown as DevicePerf6ShipCatalog;
export const DEVICE_PERF_6_PHASE = DEVICE_PERF_6.phase;
export const DEVICE_PERF_6_SCHEMA = DEVICE_PERF_6.schema;
export const DEVICE_PERF_6_MARKER = DEVICE_PERF_6.devicePerf6Marker;
export const DEVICE_PERF_6_HARBOR_CACHE_FLOOR = DEVICE_PERF_6.harborCacheFloor;

export interface DevicePerf6Measure {
  harborCache: number;
  overBudgetMult: number;
  underBudgetMult: number;
  androidClasses: number;
  androidScenarios: number;
  browserTargets: number;
  browserScenarios: number;
  analyticsContractTests: number;
  denserCapsWired: boolean;
  upgradeWired: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureDevicePerf6(repoRoot: string): DevicePerf6Measure {
  const matrixPath = resolve(repoRoot, DEVICE_PERF_6.perfMatrix);
  const androidPath = resolve(repoRoot, DEVICE_PERF_6.androidMatrix);
  const browserPath = resolve(repoRoot, DEVICE_PERF_6.browserMatrix);
  const kickoffPath = resolve(repoRoot, DEVICE_PERF_6.kickoffCatalog);
  const webFt = resolve(repoRoot, "web/src/render/frameTiming.ts");
  const androidFt = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt",
  );
  const harborWeb = resolve(repoRoot, "web/src/render/HarborScene.ts");
  const harborAndroid = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRenderer.kt",
  );
  const contractTest = resolve(repoRoot, "web/test/remoteAnalyticsContract.test.ts");

  const matrix = existsSync(matrixPath) ? readJson(matrixPath) : {};
  const android = existsSync(androidPath) ? readJson(androidPath) : {};
  const browser = existsSync(browserPath) ? readJson(browserPath) : {};
  const webFtSrc = existsSync(webFt) ? readFileSync(webFt, "utf8") : "";
  const androidFtSrc = existsSync(androidFt) ? readFileSync(androidFt, "utf8") : "";
  const harborWebSrc = existsSync(harborWeb) ? readFileSync(harborWeb, "utf8") : "";
  const harborAndroidSrc = existsSync(harborAndroid) ? readFileSync(harborAndroid, "utf8") : "";
  const contractSrc = existsSync(contractTest) ? readFileSync(contractTest, "utf8") : "";

  const harborCache = matrix.harborCacheLimit ?? 0;
  const overBudgetMult = matrix.autoDowngrade?.overBudgetMultiplier ?? 99;
  const underBudgetMult = matrix.autoUpgrade?.underBudgetMultiplier ?? 0;
  const androidClasses = (android.deviceClasses as unknown[] | undefined)?.length ?? 0;
  const androidScenarios = (android.scenarios as unknown[] | undefined)?.length ?? 0;
  const browserTargets = (browser.browsers as unknown[] | undefined)?.length ?? 0;
  const browserScenarios = (browser.scenarios as unknown[] | undefined)?.length ?? 0;
  const analyticsContractTests = (contractSrc.match(/\bit\(/g) ?? []).length;

  let gapClosed = false;
  let kickoffWired = false;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.devicePerf6Incomplete === false;
    const phase28 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 28);
    kickoffWired =
      phase28?.id === "device-perf-6" && phase28?.validate === "deviceperf6:validate";
  }

  const upgradeWired =
    webFtSrc.includes("FRAME_UPGRADE_STREAK") &&
    webFtSrc.includes("upgradeQuality") &&
    androidFtSrc.includes("FRAME_UPGRADE_STREAK") &&
    androidFtSrc.includes("FrameBudgetAction") &&
    harborWebSrc.includes('action === "upgrade"') &&
    harborAndroidSrc.includes("FrameBudgetAction.UPGRADE");

  const caps = DEVICE_PERF_6.presenterCaps;
  const denserCapsWired =
    HARBOR_CACHE_LIMIT >= DEVICE_PERF_6.harborCacheFloor &&
    FLYING_TRANSFER_POOL >= caps.fly.high &&
    FLYING_TRANSFER_POOL_BY_QUALITY.medium >= caps.fly.medium &&
    CROWD_DRAW_CAP_BY_QUALITY.medium >= caps.crowd.medium &&
    CROWD_DRAW_CAP_BY_QUALITY.high >= caps.crowd.high &&
    VFX_BURST_POOL >= caps.burst.high &&
    VFX_BURST_POOL_BY_QUALITY.medium >= caps.burst.medium &&
    androidFtSrc.includes("HARBOR_CACHE_LIMIT = 5");

  const floorsMet =
    harborCache >= DEVICE_PERF_6.harborCacheFloor &&
    overBudgetMult <= DEVICE_PERF_6.overBudgetMultMax &&
    underBudgetMult === DEVICE_PERF_6.underBudgetMult &&
    androidClasses >= DEVICE_PERF_6.androidDeviceClassFloor &&
    androidScenarios >= DEVICE_PERF_6.androidScenarioFloor &&
    browserTargets >= DEVICE_PERF_6.browserTargetFloor &&
    browserScenarios >= DEVICE_PERF_6.browserScenarioFloor &&
    analyticsContractTests >= DEVICE_PERF_6.analyticsContractTestsMin &&
    denserCapsWired &&
    upgradeWired &&
    gapClosed &&
    kickoffWired;

  const missingGates = DEVICE_PERF_6.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    harborCache,
    overBudgetMult,
    underBudgetMult,
    androidClasses,
    androidScenarios,
    browserTargets,
    browserScenarios,
    analyticsContractTests,
    denserCapsWired,
    upgradeWired,
    gapClosed,
    kickoffWired,
    floorsMet,
    missingGates,
  };
}
