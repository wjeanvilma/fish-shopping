/**
 * Finish 4.0 Phase 29 — Parity lock 4.0 readiness.
 *
 * Usage:
 *   npm run parity4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  PARITY_LOCK,
  PARITY_LOCK_FINISH2_SUITE_IDS,
  PARITY_LOCK_FINISH3_SUITE_IDS,
  PARITY_LOCK_FINISH4_PHASE,
  PARITY_LOCK_FINISH4_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import {
  PARITY4_FINISH4_SUITE_FLOOR,
  PARITY4_SUITE_FLOOR,
  PARITY_LOCK_4,
  PARITY_LOCK_4_MARKER,
  PARITY_LOCK_4_PHASE,
  PARITY_LOCK_4_SCHEMA,
  REQUIRED_FINISH4_BASELINE_SUITE_IDS,
  REQUIRED_FINISH4_FINISH2_SUITE_IDS,
  REQUIRED_FINISH4_FINISH3_SUITE_IDS,
  REQUIRED_FINISH4_SUITE_IDS,
  measureParityLock4,
} from "../src/ship/parityLock4";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/parity-lock-4.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-parity-lock-4.0.json"));
  const catalog = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const finish2 = readJson(resolve(root, "shared/ship/parity-lock-2.0.json"));
  const finish3 = readJson(resolve(root, "shared/ship/parity-lock-3.0.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ParityLock4.kt"),
    "utf8",
  );
  const parityKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt"),
    "utf8",
  );

  if (ship.phase !== 29) errors.push(`ship phase expected 29, got ${ship.phase}`);
  if (ship.schema !== PARITY_LOCK_4_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (PARITY_LOCK_4_PHASE !== 29) errors.push("phase mirror mismatch");
  if (ship.schemaVersion !== 25) errors.push("ship schemaVersion must be 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (ship.parityLock4Marker !== PARITY_LOCK_4_MARKER) errors.push("ship marker mismatch");
  if (fixture.parityLock4Marker !== PARITY_LOCK_4_MARKER) errors.push("fixture marker mismatch");
  if (ship.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (ship.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (ship.closesGap !== "parityLock4Missing") errors.push("closesGap mismatch");
  if (ship.extendsParityLock3 !== "shared/ship/parity-lock-3.0.json") {
    errors.push("extendsParityLock3 path mismatch");
  }
  if (ship.extendsParityLock2 !== "shared/ship/parity-lock-2.0.json") {
    errors.push("extendsParityLock2 path mismatch");
  }

  // Soft floors: prior parity catalogs keep historical floors.
  if (finish2.suiteFloor !== 8 || finish2.finish2SuiteFloor !== 4) {
    errors.push("Finish 2.0 parity-lock-2.0 floors must stay 8/4");
  }
  if (finish3.suiteFloor !== 12 || finish3.finish3SuiteFloor !== 4) {
    errors.push("Finish 3.0 parity-lock-3.0 floors must stay 12/4");
  }
  if ((ship.softFloors?.finish2HistoricalSuiteFloor as number) < 8) {
    errors.push("soft floor finish2HistoricalSuiteFloor must stay ≥8");
  }
  if ((ship.softFloors?.finish3HistoricalSuiteFloor as number) < 12) {
    errors.push("soft floor finish3HistoricalSuiteFloor must stay ≥12");
  }

  if (ship.suiteFloor !== 16 || PARITY4_SUITE_FLOOR !== 16) errors.push("suiteFloor must be 16");
  if (ship.finish4SuiteFloor !== 4 || PARITY4_FINISH4_SUITE_FLOOR !== 4) {
    errors.push("finish4SuiteFloor must be 4");
  }

  if (catalog.phase !== 27) errors.push("baseline parity-lock phase must stay 27");
  if (catalog.finish2ParityLockPhase !== 29) errors.push("finish2ParityLockPhase must stay 29");
  if (catalog.finish3ParityLockPhase !== 29) errors.push("finish3ParityLockPhase must stay 29");
  if (catalog.finish4ParityLockPhase !== 29 || PARITY_LOCK_FINISH4_PHASE !== 29) {
    errors.push("finish4ParityLockPhase must be 29");
  }
  if (catalog.parityLock4Catalog !== "shared/ship/parity-lock-4.0.json") {
    errors.push("parity-lock.parityLock4Catalog mismatch");
  }
  if ((catalog.suiteFloor ?? 0) < 16) errors.push("parity-lock.suiteFloor must be ≥ 16");
  if ((catalog.finish4SuiteFloor ?? 0) < 4) errors.push("parity-lock.finish4SuiteFloor must be ≥ 4");

  if (PARITY_LOCK_SUITE_IDS.length < 16) {
    errors.push(`runtime suites ${PARITY_LOCK_SUITE_IDS.length} < 16`);
  }
  if (PARITY_LOCK_FINISH2_SUITE_IDS.length < 4) {
    errors.push(`finish2 suites ${PARITY_LOCK_FINISH2_SUITE_IDS.length} < 4`);
  }
  if (PARITY_LOCK_FINISH3_SUITE_IDS.length < 4) {
    errors.push(`finish3 suites ${PARITY_LOCK_FINISH3_SUITE_IDS.length} < 4`);
  }
  if (PARITY_LOCK_FINISH4_SUITE_IDS.length < 4) {
    errors.push(`finish4 suites ${PARITY_LOCK_FINISH4_SUITE_IDS.length} < 4`);
  }

  for (const id of REQUIRED_FINISH4_BASELINE_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing baseline suite ${id}`);
  }
  for (const id of REQUIRED_FINISH4_FINISH2_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish2 suite ${id}`);
    if (!PARITY_LOCK_FINISH2_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish2`);
    }
  }
  for (const id of REQUIRED_FINISH4_FINISH3_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish3 suite ${id}`);
    if (!PARITY_LOCK_FINISH3_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish3`);
    }
  }
  for (const id of REQUIRED_FINISH4_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish4 suite ${id}`);
    if (!PARITY_LOCK_FINISH4_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish4`);
    }
  }
  for (const id of fixture.expect.finish4SuiteIds as string[]) {
    if (!REQUIRED_FINISH4_SUITE_IDS.includes(id)) errors.push(`ship missing required ${id}`);
  }
  for (const path of fixture.expect.finish4Fixtures as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing finish4 fixture ${path}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (catalog.gates?.[gate] !== true) errors.push(`parity-lock gates.${gate} must be true`);
    if ((PARITY_LOCK.gates as Record<string, boolean | undefined>)[gate] !== true) {
      errors.push(`runtime gates.${gate} must be true`);
    }
  }

  const systemTests: Array<[string, string]> = [
    ["web/test/machines1112.test.ts", "parity-machines-11-12.json"],
    ["web/test/questsContracts4.test.ts", "parity-quests-contracts-4.json"],
    ["web/test/rivalMarkets2.test.ts", "parity-rival-markets-2.json"],
    ["web/test/endgame2.test.ts", "parity-endgame-2.json"],
  ];
  for (const [testFile, needle] of systemTests) {
    if (!existsSync(resolve(root, testFile))) errors.push(`missing system test ${testFile}`);
    else if (!readFileSync(resolve(root, testFile), "utf8").includes(needle)) {
      errors.push(`${testFile} missing ${needle}`);
    }
  }

  const measure = measureParityLock4(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (suites=${measure.suiteCount} finish4=${measure.finish4Count} gap=${measure.gapClosed})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.parityLock4Missing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((dod.quotas?.parityLockSuites ?? 0) < 16) {
    errors.push("DoD quotas.parityLockSuites must be ≥ 16");
  }
  if ((dod.quotas?.parityLockFinish4Suites ?? 0) < 4) {
    errors.push("DoD quotas.parityLockFinish4Suites must be ≥ 4");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 29) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 29");
  }
  if ((kickoff.baseline?.paritySuites ?? 0) < 16) {
    errors.push("kickoff.baseline.paritySuites must be ≥ 16");
  }
  if (kickoff.gaps?.parityLock4Missing !== false) {
    errors.push("kickoff gap parityLock4Missing must be false");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("parityLock4Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed parityLock4Missing");
  }
  if (FINISH4_OPEN_GAP_FLAGS.length !== 0) {
    errors.push(`OPEN_GAP_FLAGS expected 0 after Phase 29, got ${FINISH4_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.parityLock4Phase !== 29) errors.push("listing.parityLock4Phase must be 29");
  if (listing.parityLock4Catalog !== "shared/ship/parity-lock-4.0.json") {
    errors.push("listing.parityLock4Catalog mismatch");
  }
  if (!ci.includes("parity4:validate")) errors.push("ci.yml missing parity4:validate");
  if (!ci.includes("parity3:validate")) errors.push("ci.yml missing baseline parity3:validate");
  if (!ci.includes("parity2:validate")) errors.push("ci.yml missing baseline parity2:validate");
  if (!ci.includes("parity:validate")) errors.push("ci.yml missing baseline parity:validate");
  if (!pin.fixtures?.includes("parity-parity-lock-4.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-parity-lock-4.0.json");
  }
  for (const f of [
    "parity-machines-11-12.json",
    "parity-quests-contracts-4.json",
    "parity-rival-markets-2.json",
    "parity-endgame-2.json",
  ]) {
    if (!pin.fixtures?.includes(f)) errors.push(`RELEASE_PIN.fixtures missing ${f}`);
  }
  if (pin.parityLock4 !== "shared/ship/parity-lock-4.0.json") {
    errors.push("RELEASE_PIN.parityLock4 path mismatch");
  }
  if (pin.schemaVersion < 25) errors.push("RELEASE_PIN.schemaVersion must be >= 25");
  if (!pkg.scripts?.["parity4:validate"]) errors.push("web/package.json missing parity4:validate");
  if (PARITY_LOCK_4.parityLockCatalog !== "shared/fixtures/parity-lock.json") {
    errors.push("ship parityLockCatalog mismatch");
  }

  const phase29 = (kickoff.phases as any[])?.find((p: any) => p.phase === 29);
  if (!phase29 || phase29.validate !== "parity4:validate") {
    errors.push("kickoff phase 29 validate must be parity4:validate");
  }
  if (!finish4Kt.includes("parity4:validate")) {
    errors.push("Finish4Kickoff.kt phase 29 missing parity4:validate");
  }
  {
    const openBlock = finish4Kt.slice(
      finish4Kt.indexOf("OPEN_GAP_FLAGS"),
      finish4Kt.indexOf("fun score"),
    );
    if (openBlock.includes("parityLock4Missing")) {
      errors.push("Finish4Kickoff.OPEN_GAP_FLAGS must drop parityLock4Missing");
    }
  }
  if (!kotlin.includes("PARITY_LOCK_4_MARKER") || !kotlin.includes("REQUIRED_FINISH4_SUITE_IDS")) {
    errors.push("Kotlin ParityLock4 missing constants");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("FINISH4_SUITE_FLOOR")) {
    errors.push("Kotlin ParityLock4 missing gap/floor constants");
  }
  if (!parityKt.includes("FINISH4_PARITY_LOCK_PHASE") || !parityKt.includes("machines_11_12")) {
    errors.push("Kotlin ParityLock missing Finish 4.0 suites");
  }

  const block = dod.parityLock4;
  if (!block) errors.push("DoD missing parityLock4 block");
  else {
    if (block.phase !== 29) errors.push("DoD parityLock4.phase must be 29");
    if (block.plan !== "30_finish_4.0") errors.push("DoD parityLock4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD parityLock4.status must be complete");
    if (block.parityLock4Marker !== PARITY_LOCK_4_MARKER) {
      errors.push("DoD parityLock4 marker mismatch");
    }
  }

  for (const gatePath of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("parity4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK parity4:validate — parity lock 4.0 machines/quests/rivals/endgame");
