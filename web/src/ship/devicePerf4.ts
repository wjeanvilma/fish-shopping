/**
 * Finish 4.0 Phase 27 — Device/browser/perf matrix tighten
 * (mirrors shared/ship/device-perf-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/device-perf-4.json";

export interface DevicePerf4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  devicePerf4Marker: string;
  closesGap: string;
  perfMatrix: string;
  budgetGate: string;
  androidMatrix: string;
  browserMatrix: string;
  remoteAnalyticsShip: string;
  remoteAnalyticsPolicy: string;
  harborCacheFloor: number;
  overBudgetMultMax: number;
  underBudgetMult: number;
  androidDowngradeStreakMax: number;
  webDowngradeStreakMax: number;
  androidDeviceClassFloor: number;
  androidScenarioFloor: number;
  browserTargetFloor: number;
  browserScenarioFloor: number;
  analyticsContractTestsMin: number;
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const DEVICE_PERF_4 = catalogJson as unknown as DevicePerf4ShipCatalog;
export const DEVICE_PERF_4_PHASE = DEVICE_PERF_4.phase;
export const DEVICE_PERF_4_SCHEMA = DEVICE_PERF_4.schema;
export const DEVICE_PERF_4_MARKER = DEVICE_PERF_4.devicePerf4Marker;
export const DEVICE_PERF_4_CLOSES_GAP = DEVICE_PERF_4.closesGap;
export const DEVICE_PERF_HARBOR_CACHE_FLOOR = DEVICE_PERF_4.harborCacheFloor;

export interface DevicePerf4Measure {
  harborCache: number;
  overBudgetMult: number;
  underBudgetMult: number;
  androidClasses: number;
  androidScenarios: number;
  browserTargets: number;
  browserScenarios: number;
  analyticsContractTests: number;
  upgradeWired: boolean;
  gapClosed: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureDevicePerf4(repoRoot: string): DevicePerf4Measure {
  const matrixPath = resolve(repoRoot, DEVICE_PERF_4.perfMatrix);
  const androidPath = resolve(repoRoot, DEVICE_PERF_4.androidMatrix);
  const browserPath = resolve(repoRoot, DEVICE_PERF_4.browserMatrix);
  const kickoffPath = resolve(repoRoot, DEVICE_PERF_4.kickoffCatalog);
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
  if (existsSync(kickoffPath)) {
    gapClosed = readJson(kickoffPath)?.gaps?.devicePerfIncomplete === false;
  }

  const upgradeWired =
    webFtSrc.includes("FRAME_UPGRADE_STREAK") &&
    webFtSrc.includes("upgradeQuality") &&
    androidFtSrc.includes("FRAME_UPGRADE_STREAK") &&
    androidFtSrc.includes("FrameBudgetAction") &&
    harborWebSrc.includes('action === "upgrade"') &&
    harborAndroidSrc.includes("FrameBudgetAction.UPGRADE");

  const floorsMet =
    harborCache >= DEVICE_PERF_4.harborCacheFloor &&
    overBudgetMult <= DEVICE_PERF_4.overBudgetMultMax &&
    underBudgetMult === DEVICE_PERF_4.underBudgetMult &&
    androidClasses >= DEVICE_PERF_4.androidDeviceClassFloor &&
    androidScenarios >= DEVICE_PERF_4.androidScenarioFloor &&
    browserTargets >= DEVICE_PERF_4.browserTargetFloor &&
    browserScenarios >= DEVICE_PERF_4.browserScenarioFloor &&
    analyticsContractTests >= DEVICE_PERF_4.analyticsContractTestsMin &&
    upgradeWired;

  const missingGates = DEVICE_PERF_4.preflightGates.filter(
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
    upgradeWired,
    gapClosed,
    floorsMet,
    missingGates,
  };
}
