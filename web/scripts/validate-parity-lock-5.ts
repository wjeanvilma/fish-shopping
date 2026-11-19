/**
 * Finish 5.0 Phase 29 — Parity lock 5.0 readiness.
 *
 * Usage:
 *   npm run parity5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  PARITY_LOCK,
  PARITY_LOCK_FINISH2_SUITE_IDS,
  PARITY_LOCK_FINISH3_SUITE_IDS,
  PARITY_LOCK_FINISH4_SUITE_IDS,
  PARITY_LOCK_FINISH5_PHASE,
  PARITY_LOCK_FINISH5_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  PARITY5_FINISH5_SUITE_FLOOR,
  PARITY5_SUITE_FLOOR,
  PARITY_LOCK_5,
  PARITY_LOCK_5_MARKER,
  PARITY_LOCK_5_PHASE,
  PARITY_LOCK_5_SCHEMA,
  REQUIRED_FINISH5_BASELINE_SUITE_IDS,
  REQUIRED_FINISH5_FINISH2_SUITE_IDS,
  REQUIRED_FINISH5_FINISH3_SUITE_IDS,
  REQUIRED_FINISH5_FINISH4_SUITE_IDS,
  REQUIRED_FINISH5_SUITE_IDS,
  measureParityLock5,
} from "../src/ship/parityLock5";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/parity-lock-5.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-parity-lock-5.0.json"));
  const catalog = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const finish2 = readJson(resolve(root, "shared/ship/parity-lock-2.0.json"));
  const finish3 = readJson(resolve(root, "shared/ship/parity-lock-3.0.json"));
  const finish4 = readJson(resolve(root, "shared/ship/parity-lock-4.0.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ParityLock5.kt"),
    "utf8",
  );
  const parityKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt"),
    "utf8",
  );

  if (ship.phase !== 29) errors.push(`ship phase expected 29, got ${ship.phase}`);
  if (ship.schema !== PARITY_LOCK_5_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (PARITY_LOCK_5_PHASE !== 29) errors.push("phase mirror mismatch");
  if (ship.schemaVersion !== 26) errors.push("ship schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (ship.parityLock5Marker !== PARITY_LOCK_5_MARKER) errors.push("ship marker mismatch");
  if (fixture.parityLock5Marker !== PARITY_LOCK_5_MARKER) errors.push("fixture marker mismatch");
  if (ship.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (ship.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (ship.closesGap !== "parityLock5Missing") errors.push("closesGap mismatch");
  if (ship.extendsParityLock4 !== "shared/ship/parity-lock-4.0.json") {
    errors.push("extendsParityLock4 path mismatch");
  }
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
  if (finish4.suiteFloor !== 16 || finish4.finish4SuiteFloor !== 4) {
    errors.push("Finish 4.0 parity-lock-4.0 floors must stay 16/4");
  }
  if ((ship.softFloors?.finish2HistoricalSuiteFloor as number) < 8) {
    errors.push("soft floor finish2HistoricalSuiteFloor must stay ≥8");
  }
  if ((ship.softFloors?.finish3HistoricalSuiteFloor as number) < 12) {
    errors.push("soft floor finish3HistoricalSuiteFloor must stay ≥12");
  }
  if ((ship.softFloors?.finish4HistoricalSuiteFloor as number) < 16) {
    errors.push("soft floor finish4HistoricalSuiteFloor must stay ≥16");
  }

  if (ship.suiteFloor !== 20 || PARITY5_SUITE_FLOOR !== 20) errors.push("suiteFloor must be 20");
  if (ship.finish5SuiteFloor !== 4 || PARITY5_FINISH5_SUITE_FLOOR !== 4) {
    errors.push("finish5SuiteFloor must be 4");
  }

  if (catalog.phase !== 27) errors.push("baseline parity-lock phase must stay 27");
  if (catalog.finish2ParityLockPhase !== 29) errors.push("finish2ParityLockPhase must stay 29");
  if (catalog.finish3ParityLockPhase !== 29) errors.push("finish3ParityLockPhase must stay 29");
  if (catalog.finish4ParityLockPhase !== 29) errors.push("finish4ParityLockPhase must stay 29");
  if (catalog.finish5ParityLockPhase !== 29 || PARITY_LOCK_FINISH5_PHASE !== 29) {
    errors.push("finish5ParityLockPhase must be 29");
  }
  if (catalog.parityLock5Catalog !== "shared/ship/parity-lock-5.0.json") {
    errors.push("parity-lock.parityLock5Catalog mismatch");
  }
  if ((catalog.suiteFloor ?? 0) < 20) errors.push("parity-lock.suiteFloor must be ≥ 20");
  if ((catalog.finish5SuiteFloor ?? 0) < 4) errors.push("parity-lock.finish5SuiteFloor must be ≥ 4");
  // Soft-floor: Phase 30 freeze may bump live parity-lock contentVersion to 5.0.0.
  if (!["4.0.0", "5.0.0"].includes(catalog.contentVersion)) {
    errors.push("parity-lock contentVersion must be 4.0.0 or 5.0.0");
  }
  if ((catalog.schemaVersion ?? 0) < 26) errors.push("parity-lock schemaVersion must be ≥ 26");

  if (PARITY_LOCK_SUITE_IDS.length < 20) {
    errors.push(`runtime suites ${PARITY_LOCK_SUITE_IDS.length} < 20`);
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
  if (PARITY_LOCK_FINISH5_SUITE_IDS.length < 4) {
    errors.push(`finish5 suites ${PARITY_LOCK_FINISH5_SUITE_IDS.length} < 4`);
  }

  for (const id of REQUIRED_FINISH5_BASELINE_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing baseline suite ${id}`);
  }
  for (const id of REQUIRED_FINISH5_FINISH2_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish2 suite ${id}`);
    if (!PARITY_LOCK_FINISH2_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish2`);
    }
  }
  for (const id of REQUIRED_FINISH5_FINISH3_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish3 suite ${id}`);
    if (!PARITY_LOCK_FINISH3_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish3`);
    }
  }
  for (const id of REQUIRED_FINISH5_FINISH4_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish4 suite ${id}`);
    if (!PARITY_LOCK_FINISH4_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish4`);
    }
  }
  for (const id of REQUIRED_FINISH5_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish5 suite ${id}`);
    if (!PARITY_LOCK_FINISH5_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish5`);
    }
  }
  for (const id of fixture.expect.finish5SuiteIds as string[]) {
    if (!REQUIRED_FINISH5_SUITE_IDS.includes(id)) errors.push(`ship missing required ${id}`);
  }
  for (const path of fixture.expect.finish5Fixtures as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing finish5 fixture ${path}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (catalog.gates?.[gate] !== true) errors.push(`parity-lock gates.${gate} must be true`);
    if ((PARITY_LOCK.gates as Record<string, boolean | undefined>)[gate] !== true) {
      errors.push(`runtime gates.${gate} must be true`);
    }
  }

  const systemTests: Array<[string, string]> = [
    ["web/test/machines1314.test.ts", "parity-machines-13-14.json"],
    ["web/test/questsContracts5.test.ts", "parity-quests-contracts-5.json"],
    ["web/test/endgame3.test.ts", "parity-endgame-3.json"],
    ["web/test/rivalsSeasonal5.test.ts", "parity-rivals-seasonal-5.json"],
  ];
  for (const [testFile, needle] of systemTests) {
    if (!existsSync(resolve(root, testFile))) errors.push(`missing system test ${testFile}`);
    else if (!readFileSync(resolve(root, testFile), "utf8").includes(needle)) {
      errors.push(`${testFile} missing ${needle}`);
    }
  }

  const measure = measureParityLock5(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (suites=${measure.suiteCount} finish5=${measure.finish5Count} ` +
        `gap=${measure.gapClosed} wired=${measure.kickoffWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.parityLock5Missing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((dod.quotas?.parityLockSuites ?? 0) < 20) {
    errors.push("DoD quotas.parityLockSuites must be ≥ 20");
  }
  if ((dod.quotas?.parityLockFinish5Suites ?? 0) < 4) {
    errors.push("DoD quotas.parityLockFinish5Suites must be ≥ 4");
  }
  if (kickoff.gaps?.parityLock5Missing !== false) {
    errors.push("kickoff gap parityLock5Missing must be false");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("parityLock5Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed parityLock5Missing");
  }
  if (FINISH5_OPEN_GAP_FLAGS.length !== 0) {
    errors.push(`OPEN_GAP_FLAGS expected 0 after Phase 29, got ${FINISH5_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.parityLock5Phase !== 29) errors.push("listing.parityLock5Phase must be 29");
  if (listing.parityLock5Catalog !== "shared/ship/parity-lock-5.0.json") {
    errors.push("listing.parityLock5Catalog mismatch");
  }
  if (!ci.includes("parity5:validate")) errors.push("ci.yml missing parity5:validate");
  if (!ci.includes("parity4:validate")) errors.push("ci.yml missing soft parity4:validate");
  if (!ci.includes("parity3:validate")) errors.push("ci.yml missing soft parity3:validate");
  if (!ci.includes("parity2:validate")) errors.push("ci.yml missing soft parity2:validate");
  if (!ci.includes("parity:validate")) errors.push("ci.yml missing soft parity:validate");
  if (!pin.fixtures?.includes("parity-parity-lock-5.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-parity-lock-5.0.json");
  }
  for (const f of [
    "parity-machines-13-14.json",
    "parity-quests-contracts-5.json",
    "parity-endgame-3.json",
    "parity-rivals-seasonal-5.json",
  ]) {
    if (!pin.fixtures?.includes(f)) errors.push(`RELEASE_PIN.fixtures missing ${f}`);
  }
  if (pin.parityLock5 !== "shared/ship/parity-lock-5.0.json") {
    errors.push("RELEASE_PIN.parityLock5 path mismatch");
  }
  if (pin.schemaVersion < 26) errors.push("RELEASE_PIN.schemaVersion must be >= 26");
  if (!pkg.scripts?.["parity5:validate"]) errors.push("web/package.json missing parity5:validate");
  if (PARITY_LOCK_5.parityLockCatalog !== "shared/fixtures/parity-lock.json") {
    errors.push("ship parityLockCatalog mismatch");
  }
  if (ship.softParity4Validate !== "npm run parity4:validate") {
    errors.push("catalog softParity4Validate must pin parity4:validate");
  }

  const phase29 = (kickoff.phases as any[])?.find((p: any) => p.phase === 29);
  if (!phase29 || phase29.validate !== "parity5:validate") {
    errors.push("kickoff phase 29 validate must be parity5:validate");
  }
  if (phase29?.id !== "parity-lock-5") errors.push("kickoff phase 29 id must be parity-lock-5");
  if (!finish5Kt.includes("parity5:validate")) {
    errors.push("Finish5Kickoff.kt phase 29 missing parity5:validate");
  }
  {
    const openBlock = finish5Kt.slice(
      finish5Kt.indexOf("OPEN_GAP_FLAGS"),
      finish5Kt.indexOf("fun score"),
    );
    if (openBlock.includes("parityLock5Missing")) {
      errors.push("Finish5Kickoff.OPEN_GAP_FLAGS must drop parityLock5Missing");
    }
  }
  if (!kotlin.includes("PARITY_LOCK_5_MARKER") || !kotlin.includes("REQUIRED_FINISH5_SUITE_IDS")) {
    errors.push("Kotlin ParityLock5 missing constants");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("FINISH5_SUITE_FLOOR")) {
    errors.push("Kotlin ParityLock5 missing gap/floor constants");
  }
  if (!parityKt.includes("FINISH5_PARITY_LOCK_PHASE") || !parityKt.includes("machines_13_14")) {
    errors.push("Kotlin ParityLock missing Finish 5.0 suites");
  }

  const block = dod.parityLock5;
  if (!block) errors.push("DoD missing parityLock5 block");
  else {
    if (block.phase !== 29) errors.push("DoD parityLock5.phase must be 29");
    if (block.plan !== "30_finish_5.0") errors.push("DoD parityLock5.plan mismatch");
    if (block.status !== "complete") errors.push("DoD parityLock5.status must be complete");
    if (block.parityLock5Marker !== PARITY_LOCK_5_MARKER) {
      errors.push("DoD parityLock5 marker mismatch");
    }
  }

  for (const gatePath of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("parity5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK parity5:validate — parity lock 5.0 machines/quests/endgame/rivals");
