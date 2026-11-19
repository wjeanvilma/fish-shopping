/**
 * Finish 5.0 Phase 27 — Device/browser/perf matrix 5
 * (mirrors shared/ship/device-perf-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/device-perf-5.json";

export interface DevicePerf5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  devicePerf5Marker: string;
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
  presenterCaps: {
    crowd: { low: number; medium: number; high: number };
    fly: { low: number; medium: number; high: number };
    burst: { low: number; medium: number; high: number };
  };
  parityFixture: string;
  validateScript: string;
  softDevicePerf4Validate: string;
  kickoffCatalog: string;
  authorTool: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const DEVICE_PERF_5 = catalogJson as unknown as DevicePerf5ShipCatalog;
export const DEVICE_PERF_5_PHASE = DEVICE_PERF_5.phase;
export const DEVICE_PERF_5_SCHEMA = DEVICE_PERF_5.schema;
export const DEVICE_PERF_5_MARKER = DEVICE_PERF_5.devicePerf5Marker;
export const DEVICE_PERF_5_CLOSES_GAP = DEVICE_PERF_5.closesGap;
export const DEVICE_PERF_5_HARBOR_CACHE_FLOOR = DEVICE_PERF_5.harborCacheFloor;

export interface DevicePerf5Measure {
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

export function measureDevicePerf5(repoRoot: string): DevicePerf5Measure {
  const matrixPath = resolve(repoRoot, DEVICE_PERF_5.perfMatrix);
  const androidPath = resolve(repoRoot, DEVICE_PERF_5.androidMatrix);
  const browserPath = resolve(repoRoot, DEVICE_PERF_5.browserMatrix);
  const kickoffPath = resolve(repoRoot, DEVICE_PERF_5.kickoffCatalog);
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
  const qualityTs = resolve(repoRoot, "web/src/render/presenters/quality.ts");
  const qualityKt = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersQuality.kt",
  );
  const vfxTs = resolve(repoRoot, "web/src/render/presenters/vfx.ts");
  const contractTest = resolve(repoRoot, "web/test/remoteAnalyticsContract.test.ts");

  const matrix = existsSync(matrixPath) ? readJson(matrixPath) : {};
  const android = existsSync(androidPath) ? readJson(androidPath) : {};
  const browser = existsSync(browserPath) ? readJson(browserPath) : {};
  const webFtSrc = existsSync(webFt) ? readFileSync(webFt, "utf8") : "";
  const androidFtSrc = existsSync(androidFt) ? readFileSync(androidFt, "utf8") : "";
  const harborWebSrc = existsSync(harborWeb) ? readFileSync(harborWeb, "utf8") : "";
  const harborAndroidSrc = existsSync(harborAndroid) ? readFileSync(harborAndroid, "utf8") : "";
  const qualityTsSrc = existsSync(qualityTs) ? readFileSync(qualityTs, "utf8") : "";
  const qualityKtSrc = existsSync(qualityKt) ? readFileSync(qualityKt, "utf8") : "";
  const vfxTsSrc = existsSync(vfxTs) ? readFileSync(vfxTs, "utf8") : "";
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
    gapClosed = kickoff?.gaps?.devicePerf5Incomplete === false;
    const phase27 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 27);
    kickoffWired =
      phase27?.id === "device-perf-5" && phase27?.validate === "deviceperf5:validate";
  }

  const upgradeWired =
    webFtSrc.includes("FRAME_UPGRADE_STREAK") &&
    webFtSrc.includes("upgradeQuality") &&
    androidFtSrc.includes("FRAME_UPGRADE_STREAK") &&
    androidFtSrc.includes("FrameBudgetAction") &&
    harborWebSrc.includes('action === "upgrade"') &&
    harborAndroidSrc.includes("FrameBudgetAction.UPGRADE");

  const denserCapsWired =
    qualityTsSrc.includes("FLYING_TRANSFER_POOL = 16") &&
    qualityTsSrc.includes("medium: 6") &&
    qualityTsSrc.includes("high: 10") &&
    qualityKtSrc.includes("FLYING_TRANSFER_POOL = 16") &&
    qualityKtSrc.includes("MEDIUM -> 6") &&
    qualityKtSrc.includes("HIGH -> 10") &&
    vfxTsSrc.includes("VFX_BURST_POOL = 10") &&
    androidFtSrc.includes("HARBOR_CACHE_LIMIT = 4");

  const floorsMet =
    harborCache >= DEVICE_PERF_5.harborCacheFloor &&
    overBudgetMult <= DEVICE_PERF_5.overBudgetMultMax &&
    underBudgetMult === DEVICE_PERF_5.underBudgetMult &&
    androidClasses >= DEVICE_PERF_5.androidDeviceClassFloor &&
    androidScenarios >= DEVICE_PERF_5.androidScenarioFloor &&
    browserTargets >= DEVICE_PERF_5.browserTargetFloor &&
    browserScenarios >= DEVICE_PERF_5.browserScenarioFloor &&
    analyticsContractTests >= DEVICE_PERF_5.analyticsContractTestsMin &&
    denserCapsWired &&
    upgradeWired;

  const missingGates = DEVICE_PERF_5.preflightGates.filter(
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
