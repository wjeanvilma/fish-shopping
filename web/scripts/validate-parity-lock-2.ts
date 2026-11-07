/**
 * Finish 2.0 Phase 29 — Parity lock 2.0 readiness.
 *
 * Usage:
 *   npm run parity2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  PARITY_LOCK,
  PARITY_LOCK_FINISH2_PHASE,
  PARITY_LOCK_FINISH2_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import {
  PARITY_FINISH2_SUITE_FLOOR,
  PARITY_LOCK_2,
  PARITY_LOCK_2_MARKER,
  PARITY_LOCK_2_PHASE,
  PARITY_LOCK_2_SCHEMA,
  PARITY_SUITE_FLOOR,
  REQUIRED_BASELINE_SUITE_IDS,
  REQUIRED_FINISH2_SUITE_IDS,
} from "../src/ship/parityLock2";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/parity-lock-2.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-parity-lock-2.0.json"));
  const catalog = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));

  if (ship.phase !== 29) errors.push(`ship phase expected 29, got ${ship.phase}`);
  if (ship.schema !== PARITY_LOCK_2_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (PARITY_LOCK_2_PHASE !== 29) errors.push("phase mirror mismatch");
  if (ship.schemaVersion !== 23) errors.push("ship schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (ship.parityLock2Marker !== PARITY_LOCK_2_MARKER) errors.push("ship marker mismatch");
  if (fixture.parityLock2Marker !== PARITY_LOCK_2_MARKER) errors.push("fixture marker mismatch");

  if (ship.suiteFloor !== 8 || PARITY_SUITE_FLOOR !== 8) errors.push("suiteFloor must be 8");
  if (ship.finish2SuiteFloor !== 4 || PARITY_FINISH2_SUITE_FLOOR !== 4) {
    errors.push("finish2SuiteFloor must be 4");
  }

  if (catalog.phase !== 27) errors.push("baseline parity-lock phase must stay 27");
  if (catalog.finish2ParityLockPhase !== 29 || PARITY_LOCK_FINISH2_PHASE !== 29) {
    errors.push("finish2ParityLockPhase must be 29");
  }
  if (catalog.parityLock2Catalog !== "shared/ship/parity-lock-2.0.json") {
    errors.push("parity-lock.parityLock2Catalog mismatch");
  }
  if (PARITY_LOCK_SUITE_IDS.length < 8) {
    errors.push(`runtime suites ${PARITY_LOCK_SUITE_IDS.length} < 8`);
  }
  if (PARITY_LOCK_FINISH2_SUITE_IDS.length < 4) {
    errors.push(`finish2 suites ${PARITY_LOCK_FINISH2_SUITE_IDS.length} < 4`);
  }

  for (const id of REQUIRED_BASELINE_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing baseline suite ${id}`);
  }
  for (const id of REQUIRED_FINISH2_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish2 suite ${id}`);
    if (!PARITY_LOCK_FINISH2_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish2`);
    }
  }
  for (const id of fixture.expect.finish2SuiteIds as string[]) {
    if (!REQUIRED_FINISH2_SUITE_IDS.includes(id)) errors.push(`ship missing required ${id}`);
  }
  for (const path of fixture.expect.finish2Fixtures as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing finish2 fixture ${path}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (catalog.gates?.[gate] !== true) errors.push(`parity-lock gates.${gate} must be true`);
    if ((PARITY_LOCK.gates as Record<string, boolean | undefined>)[gate] !== true) {
      errors.push(`runtime gates.${gate} must be true`);
    }
  }

  // System tests that consume the fixtures stay in tree
  const systemTests: Array<[string, string]> = [
    ["web/test/achievements.test.ts", "parity-achievements.json"],
    ["web/test/weatherTide.test.ts", "parity-weather-tide.json"],
    ["web/test/fishingMastery.test.ts", "parity-fishing-mastery.json"],
    ["web/test/festivalWeekends.test.ts", "parity-festival-weekends.json"],
  ];
  for (const [testFile, needle] of systemTests) {
    if (!existsSync(resolve(root, testFile))) errors.push(`missing system test ${testFile}`);
    else if (!readFileSync(resolve(root, testFile), "utf8").includes(needle)) {
      errors.push(`${testFile} missing ${needle}`);
    }
  }

  if ((dod.quotas?.parityLockSuites ?? 0) < 8) {
    errors.push("DoD quotas.parityLockSuites must be ≥ 8");
  }
  if ((dod.quotas?.parityLockFinish2Suites ?? 0) < 4) {
    errors.push("DoD quotas.parityLockFinish2Suites must be ≥ 4");
  }
  if (listing.parityLock2Phase !== 29) errors.push("listing.parityLock2Phase must be 29");
  if (listing.parityLock2Catalog !== "shared/ship/parity-lock-2.0.json") {
    errors.push("listing.parityLock2Catalog mismatch");
  }
  if (!ci.includes("parity2:validate")) errors.push("ci.yml missing parity2:validate");
  if (!ci.includes("parity:validate")) errors.push("ci.yml missing baseline parity:validate");
  if (!pin.fixtures?.includes("parity-parity-lock-2.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-parity-lock-2.0.json");
  }
  for (const f of [
    "parity-achievements.json",
    "parity-weather-tide.json",
    "parity-fishing-mastery.json",
    "parity-festival-weekends.json",
  ]) {
    if (!pin.fixtures?.includes(f)) errors.push(`RELEASE_PIN.fixtures missing ${f}`);
  }
  if (pin.parityLock2 !== "shared/ship/parity-lock-2.0.json") {
    errors.push("RELEASE_PIN.parityLock2 path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (!pkg.scripts?.["parity2:validate"]) errors.push("web/package.json missing parity2:validate");
  if (PARITY_LOCK_2.parityLockCatalog !== "shared/fixtures/parity-lock.json") {
    errors.push("ship parityLockCatalog mismatch");
  }

  for (const gatePath of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("parity2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK parity2:validate — parity lock 2.0 achievements/weather/mastery/festivals");
