/**
 * Finish 4.0 Phase 27 — Device/browser/perf matrix tighten.
 *
 * Usage:
 *   npm run deviceperf4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import {
  DEVICE_PERF_4,
  DEVICE_PERF_4_MARKER,
  DEVICE_PERF_4_PHASE,
  DEVICE_PERF_4_SCHEMA,
  DEVICE_PERF_HARBOR_CACHE_FLOOR,
  measureDevicePerf4,
} from "../src/ship/devicePerf4";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/device-perf-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-device-perf-4.json"));
  const matrix = readJson(resolve(root, catalog.perfMatrix));
  const android = readJson(resolve(root, catalog.androidMatrix));
  const browser = readJson(resolve(root, catalog.browserMatrix));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DevicePerf4.kt"),
    "utf8",
  );
  const webFt = readFileSync(resolve(root, "web/src/render/frameTiming.ts"), "utf8");
  const androidFt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt"),
    "utf8",
  );
  const contract = readFileSync(resolve(root, "web/test/remoteAnalyticsContract.test.ts"), "utf8");

  if (catalog.phase !== 27) errors.push(`phase expected 27, got ${catalog.phase}`);
  if (catalog.schema !== DEVICE_PERF_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (DEVICE_PERF_4_PHASE !== 27) errors.push("phase mirror mismatch");
  if (catalog.devicePerf4Marker !== DEVICE_PERF_4_MARKER) errors.push("marker mismatch");
  if (fixture.devicePerf4Marker !== DEVICE_PERF_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.closesGap !== "devicePerfIncomplete") errors.push("closesGap mismatch");
  if (catalog.harborCacheFloor !== DEVICE_PERF_HARBOR_CACHE_FLOOR) {
    errors.push("harborCacheFloor mirror mismatch");
  }

  const measure = measureDevicePerf4(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (cache=${measure.harborCache} over=${measure.overBudgetMult} ` +
        `android=${measure.androidClasses}/${measure.androidScenarios} ` +
        `browser=${measure.browserTargets}/${measure.browserScenarios} ` +
        `analyticsTests=${measure.analyticsContractTests} upgrade=${measure.upgradeWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.devicePerfIncomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((matrix.harborCacheLimit ?? 0) < catalog.harborCacheFloor) {
    errors.push("perf matrix harborCache short");
  }
  if ((matrix.autoDowngrade?.overBudgetMultiplier ?? 99) > catalog.overBudgetMultMax) {
    errors.push("overBudgetMultiplier too loose");
  }
  if (matrix.autoUpgrade?.underBudgetMultiplier !== catalog.underBudgetMult) {
    errors.push("underBudgetMultiplier mismatch");
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
  for (const needle of fixture.expect.analyticsContractMustContain as string[]) {
    if (!contract.toLowerCase().includes(needle.toLowerCase())) {
      errors.push(`analytics contract test missing "${needle}"`);
    }
  }

  if (kickoff.gaps?.devicePerfIncomplete !== false) {
    errors.push("kickoff gap devicePerfIncomplete must be false");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("devicePerfIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include closed devicePerfIncomplete");
  }
  // Soft floor: later Finish 4.0 phases close remaining flags; Phase 27 only requires ≤2 open.
  if (FINISH4_OPEN_GAP_FLAGS.length > 2) {
    errors.push(`OPEN_GAP_FLAGS unexpectedly large after Phase 27: ${FINISH4_OPEN_GAP_FLAGS.length}`);
  }
  const phase27 = (kickoff.phases as any[])?.find((p: any) => p.phase === 27);
  if (!phase27 || phase27.validate !== "deviceperf4:validate") {
    errors.push("kickoff phase 27 validate must be deviceperf4:validate");
  }
  if (!finish4Kt.includes("deviceperf4:validate")) {
    errors.push("Finish4Kickoff.kt missing deviceperf4:validate");
  }
  {
    const openBlock = finish4Kt.slice(
      finish4Kt.indexOf("OPEN_GAP_FLAGS"),
      finish4Kt.indexOf("fun score"),
    );
    if (openBlock.includes("devicePerfIncomplete")) {
      errors.push("Finish4Kickoff.OPEN_GAP_FLAGS must drop devicePerfIncomplete");
    }
  }

  if (listing.devicePerf4Phase !== 27) errors.push("listing.devicePerf4Phase must be 27");
  if (listing.devicePerf4Catalog !== "shared/ship/device-perf-4.json") {
    errors.push("listing.devicePerf4Catalog mismatch");
  }
  if (pin.devicePerf4 !== "shared/ship/device-perf-4.json") {
    errors.push("RELEASE_PIN.devicePerf4 missing");
  }
  if (!pin.fixtures?.includes("parity-device-perf-4.json")) {
    errors.push("RELEASE_PIN missing parity-device-perf-4.json");
  }

  if (!dod.devicePerf4 || dod.devicePerf4.status !== "complete") {
    errors.push("DoD devicePerf4 incomplete");
  }
  if (dod.devicePerf4?.devicePerf4Marker !== DEVICE_PERF_4_MARKER) {
    errors.push("DoD devicePerf4 marker mismatch");
  }

  if (!pkg.scripts?.["deviceperf4:validate"]) {
    errors.push("package.json missing deviceperf4:validate");
  }
  if (!ci.includes("deviceperf4:validate")) errors.push("ci.yml missing deviceperf4:validate");
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("HARBOR_CACHE_FLOOR")) {
    errors.push("Kotlin DevicePerf4 missing constants");
  }

  if ((catalog.softFloors?.perfBudgetHistoricalHarborCache as number) < 2) {
    errors.push("soft floor historical harbor cache must stay ≥2");
  }

  for (const gate of DEVICE_PERF_4.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  if (fixture.expect?.closesGap !== "devicePerfIncomplete") {
    errors.push("parity expect.closesGap mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("deviceperf4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK deviceperf4:validate — Device/browser/perf matrix tighten locked");
