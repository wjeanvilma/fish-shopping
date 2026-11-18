/**
 * Finish 3.0 Phase 29 — Parity lock 3.0 readiness.
 *
 * Usage:
 *   npm run parity3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  PARITY_LOCK,
  PARITY_LOCK_FINISH2_SUITE_IDS,
  PARITY_LOCK_FINISH3_PHASE,
  PARITY_LOCK_FINISH3_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import {
  PARITY3_FINISH3_SUITE_FLOOR,
  PARITY3_SUITE_FLOOR,
  PARITY_LOCK_3,
  PARITY_LOCK_3_MARKER,
  PARITY_LOCK_3_PHASE,
  PARITY_LOCK_3_SCHEMA,
  REQUIRED_FINISH3_BASELINE_SUITE_IDS,
  REQUIRED_FINISH3_FINISH2_SUITE_IDS,
  REQUIRED_FINISH3_SUITE_IDS,
} from "../src/ship/parityLock3";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/parity-lock-3.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-parity-lock-3.0.json"));
  const catalog = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const finish2 = readJson(resolve(root, "shared/ship/parity-lock-2.0.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ParityLock3.kt"),
    "utf8",
  );
  const parityKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt"),
    "utf8",
  );

  if (ship.phase !== 29) errors.push(`ship phase expected 29, got ${ship.phase}`);
  if (ship.schema !== PARITY_LOCK_3_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (PARITY_LOCK_3_PHASE !== 29) errors.push("phase mirror mismatch");
  if (ship.schemaVersion !== 24) errors.push("ship schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (ship.parityLock3Marker !== PARITY_LOCK_3_MARKER) errors.push("ship marker mismatch");
  if (fixture.parityLock3Marker !== PARITY_LOCK_3_MARKER) errors.push("fixture marker mismatch");
  if (ship.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (ship.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (ship.extendsParityLock2 !== "shared/ship/parity-lock-2.0.json") {
    errors.push("extendsParityLock2 path mismatch");
  }
  if (finish2.suiteFloor !== 8 || finish2.finish2SuiteFloor !== 4) {
    errors.push("Finish 2.0 parity-lock-2.0 floors must stay 8/4");
  }

  if (ship.suiteFloor !== 12 || PARITY3_SUITE_FLOOR !== 12) errors.push("suiteFloor must be 12");
  if (ship.finish3SuiteFloor !== 4 || PARITY3_FINISH3_SUITE_FLOOR !== 4) {
    errors.push("finish3SuiteFloor must be 4");
  }

  if (catalog.phase !== 27) errors.push("baseline parity-lock phase must stay 27");
  if (catalog.finish2ParityLockPhase !== 29) errors.push("finish2ParityLockPhase must stay 29");
  if (catalog.finish3ParityLockPhase !== 29 || PARITY_LOCK_FINISH3_PHASE !== 29) {
    errors.push("finish3ParityLockPhase must be 29");
  }
  if (catalog.parityLock3Catalog !== "shared/ship/parity-lock-3.0.json") {
    errors.push("parity-lock.parityLock3Catalog mismatch");
  }
  if ((catalog.suiteFloor ?? 0) < 12) errors.push("parity-lock.suiteFloor must be ≥ 12");
  if ((catalog.finish3SuiteFloor ?? 0) < 4) errors.push("parity-lock.finish3SuiteFloor must be ≥ 4");

  if (PARITY_LOCK_SUITE_IDS.length < 12) {
    errors.push(`runtime suites ${PARITY_LOCK_SUITE_IDS.length} < 12`);
  }
  if (PARITY_LOCK_FINISH2_SUITE_IDS.length < 4) {
    errors.push(`finish2 suites ${PARITY_LOCK_FINISH2_SUITE_IDS.length} < 4`);
  }
  if (PARITY_LOCK_FINISH3_SUITE_IDS.length < 4) {
    errors.push(`finish3 suites ${PARITY_LOCK_FINISH3_SUITE_IDS.length} < 4`);
  }

  for (const id of REQUIRED_FINISH3_BASELINE_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing baseline suite ${id}`);
  }
  for (const id of REQUIRED_FINISH3_FINISH2_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish2 suite ${id}`);
    if (!PARITY_LOCK_FINISH2_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish2`);
    }
  }
  for (const id of REQUIRED_FINISH3_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish3 suite ${id}`);
    if (!PARITY_LOCK_FINISH3_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish3`);
    }
  }
  for (const id of fixture.expect.finish3SuiteIds as string[]) {
    if (!REQUIRED_FINISH3_SUITE_IDS.includes(id)) errors.push(`ship missing required ${id}`);
  }
  for (const path of fixture.expect.finish3Fixtures as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing finish3 fixture ${path}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (catalog.gates?.[gate] !== true) errors.push(`parity-lock gates.${gate} must be true`);
    if ((PARITY_LOCK.gates as Record<string, boolean | undefined>)[gate] !== true) {
      errors.push(`runtime gates.${gate} must be true`);
    }
  }

  const systemTests: Array<[string, string]> = [
    ["web/test/rivalMarkets.test.ts", "parity-rival-markets.json"],
    ["web/test/schema24Endgame.test.ts", "parity-schema-24-endgame.json"],
    ["web/test/machines910.test.ts", "parity-machines-9-10.json"],
    ["web/test/questsContracts3.test.ts", "parity-quests-contracts-3.json"],
  ];
  for (const [testFile, needle] of systemTests) {
    if (!existsSync(resolve(root, testFile))) errors.push(`missing system test ${testFile}`);
    else if (!readFileSync(resolve(root, testFile), "utf8").includes(needle)) {
      errors.push(`${testFile} missing ${needle}`);
    }
  }

  if ((dod.quotas?.parityLockSuites ?? 0) < 12) {
    errors.push("DoD quotas.parityLockSuites must be ≥ 12");
  }
  if ((dod.quotas?.parityLockFinish3Suites ?? 0) < 4) {
    errors.push("DoD quotas.parityLockFinish3Suites must be ≥ 4");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 29) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 29");
  }
  if (listing.parityLock3Phase !== 29) errors.push("listing.parityLock3Phase must be 29");
  if (listing.parityLock3Catalog !== "shared/ship/parity-lock-3.0.json") {
    errors.push("listing.parityLock3Catalog mismatch");
  }
  if (!ci.includes("parity3:validate")) errors.push("ci.yml missing parity3:validate");
  if (!ci.includes("parity2:validate")) errors.push("ci.yml missing baseline parity2:validate");
  if (!ci.includes("parity:validate")) errors.push("ci.yml missing baseline parity:validate");
  if (!pin.fixtures?.includes("parity-parity-lock-3.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-parity-lock-3.0.json");
  }
  for (const f of [
    "parity-rival-markets.json",
    "parity-schema-24-endgame.json",
    "parity-machines-9-10.json",
    "parity-quests-contracts-3.json",
  ]) {
    if (!pin.fixtures?.includes(f)) errors.push(`RELEASE_PIN.fixtures missing ${f}`);
  }
  if (pin.parityLock3 !== "shared/ship/parity-lock-3.0.json") {
    errors.push("RELEASE_PIN.parityLock3 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be >= 24");
  if (!pkg.scripts?.["parity3:validate"]) errors.push("web/package.json missing parity3:validate");
  if (PARITY_LOCK_3.parityLockCatalog !== "shared/fixtures/parity-lock.json") {
    errors.push("ship parityLockCatalog mismatch");
  }

  const phase29 = (kickoff.phases as any[])?.find((p: any) => p.phase === 29);
  if (!phase29 || phase29.validate !== "parity3:validate") {
    errors.push("kickoff phase 29 validate must be parity3:validate");
  }
  if (!finish3Kt.includes("parity3:validate")) {
    errors.push("Finish3Kickoff.kt phase 29 missing parity3:validate");
  }
  if (!kotlin.includes("PARITY_LOCK_3_MARKER") || !kotlin.includes("REQUIRED_FINISH3_SUITE_IDS")) {
    errors.push("Kotlin ParityLock3 missing constants");
  }
  if (!parityKt.includes("FINISH3_PARITY_LOCK_PHASE") || !parityKt.includes("rival_markets")) {
    errors.push("Kotlin ParityLock missing Finish 3.0 suites");
  }

  const block = dod.parityLock3;
  if (!block) errors.push("DoD missing parityLock3 block");
  else {
    if (block.phase !== 29) errors.push("DoD parityLock3.phase must be 29");
    if (block.plan !== "30_finish_3.0") errors.push("DoD parityLock3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD parityLock3.status must be complete");
    if (block.parityLock3Marker !== PARITY_LOCK_3_MARKER) {
      errors.push("DoD parityLock3 marker mismatch");
    }
  }

  for (const gatePath of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("parity3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK parity3:validate — parity lock 3.0 rivals/endgame/machines/quests-contracts");
