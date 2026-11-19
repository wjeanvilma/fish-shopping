/**
 * Finish 5.0 Phase 27 — Device/browser/perf matrix 5.
 *
 * Usage:
 *   npm run deviceperf5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  DEVICE_PERF_5,
  DEVICE_PERF_5_HARBOR_CACHE_FLOOR,
  DEVICE_PERF_5_MARKER,
  DEVICE_PERF_5_PHASE,
  DEVICE_PERF_5_SCHEMA,
  measureDevicePerf5,
} from "../src/ship/devicePerf5";
import { HARBOR_CACHE_LIMIT } from "../src/render/frameTiming";
import {
  CROWD_DRAW_CAP_BY_QUALITY,
  FLYING_TRANSFER_POOL,
  FLYING_TRANSFER_POOL_BY_QUALITY,
} from "../src/render/presenters/quality";
import { VFX_BURST_POOL, VFX_BURST_POOL_BY_QUALITY } from "../src/render/presenters/vfx";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/device-perf-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-device-perf-5.json"));
  const matrix = readJson(resolve(root, catalog.perfMatrix));
  const budget = readJson(resolve(root, catalog.budgetGate));
  const android = readJson(resolve(root, catalog.androidMatrix));
  const browser = readJson(resolve(root, catalog.browserMatrix));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DevicePerf5.kt"),
    "utf8",
  );
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

  if (catalog.phase !== 27) errors.push(`phase expected 27, got ${catalog.phase}`);
  if (catalog.schema !== DEVICE_PERF_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (DEVICE_PERF_5_PHASE !== 27) errors.push("phase mirror mismatch");
  if (catalog.devicePerf5Marker !== DEVICE_PERF_5_MARKER) errors.push("marker mismatch");
  if (fixture.devicePerf5Marker !== DEVICE_PERF_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");
  if (pack.saveSchemaVersion !== 26) errors.push("content-pack.saveSchemaVersion must be 26");
  if (catalog.closesGap !== "devicePerf5Incomplete") errors.push("closesGap mismatch");
  if (catalog.harborCacheFloor !== DEVICE_PERF_5_HARBOR_CACHE_FLOOR) {
    errors.push("harborCacheFloor mirror mismatch");
  }
  if (catalog.harborCacheFloor !== 4) errors.push("harborCacheFloor must be 4");

  const measure = measureDevicePerf5(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (cache=${measure.harborCache} over=${measure.overBudgetMult} ` +
        `android=${measure.androidClasses}/${measure.androidScenarios} ` +
        `browser=${measure.browserTargets}/${measure.browserScenarios} ` +
        `analyticsTests=${measure.analyticsContractTests} denser=${measure.denserCapsWired} ` +
        `upgrade=${measure.upgradeWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.devicePerf5Incomplete must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 27 must set id=device-perf-5 validate=deviceperf5:validate");
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
  if ((matrix.autoDowngrade?.overBudgetMultiplier ?? 99) > catalog.overBudgetMultMax) {
    errors.push("overBudgetMultiplier too loose");
  }
  if (matrix.autoUpgrade?.underBudgetMultiplier !== catalog.underBudgetMult) {
    errors.push("underBudgetMultiplier mismatch");
  }
  if (HARBOR_CACHE_LIMIT < catalog.harborCacheFloor) {
    errors.push(`runtime HARBOR_CACHE_LIMIT ${HARBOR_CACHE_LIMIT} < floor`);
  }
  if (FLYING_TRANSFER_POOL < 16) errors.push("FLYING_TRANSFER_POOL must be ≥16");
  if (CROWD_DRAW_CAP_BY_QUALITY.medium < 6 || CROWD_DRAW_CAP_BY_QUALITY.high < 10) {
    errors.push("crowd caps short of denser-scene floors");
  }
  if (FLYING_TRANSFER_POOL_BY_QUALITY.medium < 10) errors.push("fly medium cap short");
  if (VFX_BURST_POOL < 10 || VFX_BURST_POOL_BY_QUALITY.medium < 5) {
    errors.push("burst caps short of denser-scene floors");
  }
  if (budget.presenterCaps?.crowd?.medium !== 6 || budget.presenterCaps?.crowd?.high !== 10) {
    errors.push("budget-gate crowd caps mismatch");
  }
  if (budget.presenterCaps?.fly?.medium !== 10 || budget.presenterCaps?.fly?.high !== 16) {
    errors.push("budget-gate fly caps mismatch");
  }
  if (budget.presenterCaps?.burst?.medium !== 5 || budget.presenterCaps?.burst?.high !== 10) {
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

  if (kickoff.gaps?.devicePerf5Incomplete !== false) {
    errors.push("kickoff gap devicePerf5Incomplete must be false");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("devicePerf5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include closed devicePerf5Incomplete");
  }
  // Soft-floor: later phases may close more gaps; Phase 27 leaves ≤2 open.
  if (FINISH5_OPEN_GAP_FLAGS.length > 2) {
    errors.push(`OPEN_GAP_FLAGS unexpectedly large after Phase 27: ${FINISH5_OPEN_GAP_FLAGS.length}`);
  }
  const phase27 = (kickoff.phases as any[])?.find((p: any) => p.phase === 27);
  if (!phase27 || phase27.validate !== "deviceperf5:validate") {
    errors.push("kickoff phase 27 validate must be deviceperf5:validate");
  }
  if (phase27?.id !== "device-perf-5") errors.push("kickoff phase 27 id must be device-perf-5");
  if (!finish5Kt.includes("deviceperf5:validate")) {
    errors.push("Finish5Kickoff.kt missing deviceperf5:validate");
  }
  {
    const openBlock = finish5Kt.slice(
      finish5Kt.indexOf("OPEN_GAP_FLAGS"),
      finish5Kt.indexOf("fun score"),
    );
    if (openBlock.includes("devicePerf5Incomplete")) {
      errors.push("Finish5Kickoff.OPEN_GAP_FLAGS must drop devicePerf5Incomplete");
    }
  }

  if (listing.devicePerf5Phase !== 27) errors.push("listing.devicePerf5Phase must be 27");
  if (listing.devicePerf5Catalog !== "shared/ship/device-perf-5.json") {
    errors.push("listing.devicePerf5Catalog mismatch");
  }
  if (pin.devicePerf5 !== "shared/ship/device-perf-5.json") {
    errors.push("RELEASE_PIN.devicePerf5 missing");
  }
  if (!pin.fixtures?.includes("parity-device-perf-5.json")) {
    errors.push("RELEASE_PIN missing parity-device-perf-5.json");
  }

  if (!dod.devicePerf5 || dod.devicePerf5.status !== "complete") {
    errors.push("DoD devicePerf5 incomplete");
  }
  if (dod.devicePerf5?.devicePerf5Marker !== DEVICE_PERF_5_MARKER) {
    errors.push("DoD devicePerf5 marker mismatch");
  }
  if ((dod.quotas?.harborCacheLimit ?? 0) < 4) errors.push("DoD quotas.harborCacheLimit < 4");

  if (!pkg.scripts?.["deviceperf5:validate"]) {
    errors.push("package.json missing deviceperf5:validate");
  }
  if (!ci.includes("deviceperf5:validate")) errors.push("ci.yml missing deviceperf5:validate");
  if (!ci.includes("deviceperf4:validate")) {
    errors.push("ci.yml missing soft deviceperf4:validate");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("HARBOR_CACHE_FLOOR")) {
    errors.push("Kotlin DevicePerf5 missing constants");
  }
  if (catalog.softDevicePerf4Validate !== "npm run deviceperf4:validate") {
    errors.push("catalog softDevicePerf4Validate must pin deviceperf4:validate");
  }
  if ((catalog.softFloors?.devicePerf4HarborCacheFloor as number) < 3) {
    errors.push("soft floor device perf 4 harbor cache must stay ≥3");
  }

  for (const gate of DEVICE_PERF_5.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!existsSync(resolve(root, "shared/tools/author_device_perf_5.py"))) {
    errors.push("missing author_device_perf_5.py");
  }
  if (fixture.expect?.closesGap !== "devicePerf5Incomplete") {
    errors.push("parity expect.closesGap mismatch");
  }
  if (fixture.expect?.devicePerf5Incomplete !== false) {
    errors.push("parity devicePerf5Incomplete must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("deviceperf5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK deviceperf5:validate — Device/browser/perf matrix 5 locked");
