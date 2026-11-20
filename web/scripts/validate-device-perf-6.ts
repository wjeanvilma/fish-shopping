/**
 * Finish 6.0 Phase 28 — Device/browser/perf matrix 6 readiness.
 *
 * Usage:
 *   npm run deviceperf6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { HARBOR_CACHE_LIMIT } from "../src/render/frameTiming";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL,
  FLYING_TRANSFER_POOL_BY_QUALITY,
} from "../src/render/presenters/quality";
import { VFX_BURST_POOL, VFX_BURST_POOL_BY_QUALITY } from "../src/render/presenters/vfx";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  DEVICE_PERF_6,
  DEVICE_PERF_6_HARBOR_CACHE_FLOOR,
  DEVICE_PERF_6_MARKER,
  DEVICE_PERF_6_PHASE,
  DEVICE_PERF_6_SCHEMA,
  measureDevicePerf6,
} from "../src/ship/devicePerf6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/device-perf-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-device-perf-6.json"));
  const matrix = readJson(resolve(root, catalog.perfMatrix));
  const budget = readJson(resolve(root, catalog.budgetGate));
  const android = readJson(resolve(root, catalog.androidMatrix));
  const browser = readJson(resolve(root, catalog.browserMatrix));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const webFt = readFileSync(resolve(root, "web/src/render/frameTiming.ts"), "utf8");
  const androidFt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt"),
    "utf8",
  );
  const qualityTs = readFileSync(resolve(root, "web/src/render/presenters/quality.ts"), "utf8");
  const qualityKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersQuality.kt"),
    "utf8",
  );
  const contract = readFileSync(resolve(root, "web/test/remoteAnalyticsContract.test.ts"), "utf8");
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DevicePerf6.kt"),
    "utf8",
  );

  if (catalog.phase !== 28) errors.push(`phase expected 28, got ${catalog.phase}`);
  if (catalog.schema !== DEVICE_PERF_6_SCHEMA) errors.push("schema mismatch");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (DEVICE_PERF_6_PHASE !== 28) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 27) errors.push("schemaVersion must stay 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.devicePerf6Marker !== DEVICE_PERF_6_MARKER) errors.push("marker mismatch");
  if (fixture.devicePerf6Marker !== DEVICE_PERF_6_MARKER) errors.push("fixture marker mismatch");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");
  if (catalog.closesGap !== "devicePerf6Incomplete") errors.push("closesGap mismatch");
  if (catalog.harborCacheFloor !== 5 || DEVICE_PERF_6_HARBOR_CACHE_FLOOR !== 5) {
    errors.push("harborCacheFloor must be 5");
  }

  const measure = measureDevicePerf6(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (cache=${measure.harborCache} over=${measure.overBudgetMult} ` +
        `android=${measure.androidClasses}/${measure.androidScenarios} ` +
        `browser=${measure.browserTargets}/${measure.browserScenarios} ` +
        `analyticsTests=${measure.analyticsContractTests} denser=${measure.denserCapsWired} ` +
        `upgrade=${measure.upgradeWired} gap=${measure.gapClosed} wired=${measure.kickoffWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.devicePerf6Incomplete must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 28 must set id=device-perf-6 validate=deviceperf6:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((matrix.harborCacheLimit ?? 0) < catalog.harborCacheFloor) {
    errors.push("perf matrix harborCache short");
  }
  if ((budget.harborCacheLimit ?? 0) < catalog.harborCacheFloor) {
    errors.push("budget-gate harborCache short");
  }
  if (budget.harborCacheLimit !== matrix.harborCacheLimit) {
    errors.push("budget-gate harborCache drift from matrix");
  }
  if (HARBOR_CACHE_LIMIT < catalog.harborCacheFloor) {
    errors.push(`runtime HARBOR_CACHE_LIMIT ${HARBOR_CACHE_LIMIT} < floor`);
  }
  if (FLYING_TRANSFER_POOL < 20) errors.push("FLYING_TRANSFER_POOL must be ≥20");
  if (CROWD_DRAW_CAP_BY_QUALITY.medium < 8 || CROWD_DRAW_CAP_BY_QUALITY.high < 12) {
    errors.push("crowd caps short of nest denser-scene floors");
  }
  if (FLYING_TRANSFER_POOL_BY_QUALITY.medium < 12) errors.push("fly medium cap short");
  if (VFX_BURST_POOL < 12 || VFX_BURST_POOL_BY_QUALITY.medium < 6) {
    errors.push("burst caps short of nest denser-scene floors");
  }
  if (budget.presenterCaps?.crowd?.medium !== 8 || budget.presenterCaps?.crowd?.high !== 12) {
    errors.push("budget-gate crowd caps mismatch");
  }
  if (budget.presenterCaps?.fly?.medium !== 12 || budget.presenterCaps?.fly?.high !== 20) {
    errors.push("budget-gate fly caps mismatch");
  }
  if (budget.presenterCaps?.burst?.medium !== 6 || budget.presenterCaps?.burst?.high !== 12) {
    errors.push("budget-gate burst caps mismatch");
  }

  const androidClasses = (android.deviceClasses as any[]).map((c) => c.id);
  const androidScenarios = (android.scenarios as any[]).map((s) => s.id);
  const browsers = (browser.browsers as any[]).map((b) => b.id);
  const browserScenarios = (browser.scenarios as any[]).map((s) => s.id);

  for (const id of fixture.expect.requiredAndroidClasses as string[]) {
    if (!androidClasses.includes(id)) errors.push(`android matrix missing class ${id}`);
  }
  for (const id of fixture.expect.requiredAndroidScenarios as string[]) {
    if (!androidScenarios.includes(id)) errors.push(`android matrix missing scenario ${id}`);
  }
  for (const id of fixture.expect.requiredBrowsers as string[]) {
    if (!browsers.includes(id)) errors.push(`browser matrix missing ${id}`);
  }
  for (const id of fixture.expect.requiredBrowserScenarios as string[]) {
    if (!browserScenarios.includes(id)) errors.push(`browser matrix missing scenario ${id}`);
  }
  for (const needle of fixture.expect.frameTimingMustContain as string[]) {
    if (!webFt.includes(needle)) errors.push(`web frameTiming missing ${needle}`);
  }
  for (const needle of fixture.expect.androidFrameTimingMustContain as string[]) {
    if (!androidFt.includes(needle)) errors.push(`android FrameTiming missing ${needle}`);
  }
  for (const needle of fixture.expect.presenterMustContain as string[]) {
    const inTs = qualityTs.includes(needle);
    const inKt = qualityKt.includes(needle);
    if (!inTs && !inKt) errors.push(`presenter sources missing ${needle}`);
  }
  for (const needle of fixture.expect.analyticsContractMustContain as string[]) {
    if (!contract.toLowerCase().includes(needle.toLowerCase())) {
      errors.push(`analytics contract test missing "${needle}"`);
    }
  }

  if (kickoff.gaps?.devicePerf6Incomplete !== false) {
    errors.push("kickoff gap devicePerf6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("devicePerf6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include closed devicePerf6Incomplete");
  }
  // Soft-floor: Phase 29 closed parityLock6Missing → openFlags 1→0.
  if (FINISH6_OPEN_GAP_FLAGS.length > 0) {
    errors.push(`OPEN_GAP_FLAGS expected ≤0 after Phase 29, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const phase28 = (kickoff.phases as any[])?.find((p: any) => p.phase === 28);
  if (!phase28 || phase28.validate !== "deviceperf6:validate") {
    errors.push("kickoff phase 28 validate must be deviceperf6:validate");
  }
  if (phase28?.id !== "device-perf-6") errors.push("kickoff phase 28 id must be device-perf-6");
  if (!finish6Kt.includes("deviceperf6:validate")) {
    errors.push("Finish6Kickoff.kt missing deviceperf6:validate");
  }
  {
    const openBlock = finish6Kt.slice(
      finish6Kt.indexOf("OPEN_GAP_FLAGS"),
      finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
    );
    if (openBlock.includes("devicePerf6Incomplete")) {
      errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop devicePerf6Incomplete");
    }
  }

  if (listing.devicePerf6Phase !== 28) errors.push("listing.devicePerf6Phase must be 28");
  if (listing.devicePerf6Catalog !== "shared/ship/device-perf-6.json") {
    errors.push("listing.devicePerf6Catalog mismatch");
  }
  if (pin.devicePerf6 !== "shared/ship/device-perf-6.json") {
    errors.push("RELEASE_PIN.devicePerf6 missing");
  }
  if (!pin.fixtures?.includes("parity-device-perf-6.json")) {
    errors.push("RELEASE_PIN missing parity-device-perf-6.json");
  }
  if (!dod.devicePerf6 || dod.devicePerf6.status !== "complete") {
    errors.push("DoD devicePerf6 incomplete");
  }
  if (!pkg.scripts?.["deviceperf6:validate"]) {
    errors.push("package.json missing deviceperf6:validate");
  }
  if (!ci.includes("deviceperf6:validate")) errors.push("ci.yml missing deviceperf6:validate");
  if (!ci.includes("deviceperf5:validate")) {
    errors.push("ci.yml missing soft deviceperf5:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_device_perf_6.py"))) {
    errors.push("missing author_device_perf_6.py");
  }
  if (fixture.expect?.devicePerf6Incomplete !== false) {
    errors.push("parity devicePerf6Incomplete must be false");
  }
  // Soft-floor: Phase 29 closed last boolean gap → openGapFlagMin 0.
  if ((fixture.expect?.openGapFlagMin ?? 99) > 0) {
    errors.push("parity openGapFlagMin must be ≤0 after Phase 29");
  }
  if (catalog.softDevicePerf5Validate !== "npm run deviceperf5:validate") {
    errors.push("catalog softDevicePerf5Validate must pin deviceperf5:validate");
  }
  if (!kotlin.includes("HARBOR_CACHE_FLOOR") || !kotlin.includes("DEVICE_PERF_6_MARKER")) {
    errors.push("DevicePerf6.kt missing constants");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void DEVICE_PERF_6;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("deviceperf6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK deviceperf6:validate — Device/browser/perf matrix 6 wired");
