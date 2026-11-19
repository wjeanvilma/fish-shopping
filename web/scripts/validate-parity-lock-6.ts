/**
 * Finish 6.0 Phase 29 — Parity lock 6.0 readiness.
 *
 * Usage:
 *   npm run parity6:validate
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
  PARITY_LOCK_FINISH5_SUITE_IDS,
  PARITY_LOCK_FINISH6_PHASE,
  PARITY_LOCK_FINISH6_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PARITY6_FINISH6_SUITE_FLOOR,
  PARITY6_SUITE_FLOOR,
  PARITY_LOCK_6,
  PARITY_LOCK_6_MARKER,
  PARITY_LOCK_6_PHASE,
  PARITY_LOCK_6_SCHEMA,
  REQUIRED_FINISH6_BASELINE_SUITE_IDS,
  REQUIRED_FINISH6_FINISH2_SUITE_IDS,
  REQUIRED_FINISH6_FINISH3_SUITE_IDS,
  REQUIRED_FINISH6_FINISH4_SUITE_IDS,
  REQUIRED_FINISH6_FINISH5_SUITE_IDS,
  REQUIRED_FINISH6_SUITE_IDS,
  measureParityLock6,
} from "../src/ship/parityLock6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/parity-lock-6.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-parity-lock-6.0.json"));
  const catalog = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const finish2 = readJson(resolve(root, "shared/ship/parity-lock-2.0.json"));
  const finish3 = readJson(resolve(root, "shared/ship/parity-lock-3.0.json"));
  const finish4 = readJson(resolve(root, "shared/ship/parity-lock-4.0.json"));
  const finish5 = readJson(resolve(root, "shared/ship/parity-lock-5.0.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ParityLock6.kt"),
    "utf8",
  );
  const parityKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt"),
    "utf8",
  );

  if (ship.phase !== 29) errors.push(`ship phase expected 29, got ${ship.phase}`);
  if (ship.schema !== PARITY_LOCK_6_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (PARITY_LOCK_6_PHASE !== 29) errors.push("phase mirror mismatch");
  if (ship.schemaVersion !== 27) errors.push("ship schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (ship.parityLock6Marker !== PARITY_LOCK_6_MARKER) errors.push("ship marker mismatch");
  if (fixture.parityLock6Marker !== PARITY_LOCK_6_MARKER) errors.push("fixture marker mismatch");
  if (ship.contentVersion !== "5.0.0") errors.push("ship contentVersion must stay 5.0.0");
  if (ship.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (ship.closesGap !== "parityLock6Missing") errors.push("closesGap mismatch");
  if (ship.extendsParityLock5 !== "shared/ship/parity-lock-5.0.json") {
    errors.push("extendsParityLock5 path mismatch");
  }
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
  if (finish5.suiteFloor !== 20 || finish5.finish5SuiteFloor !== 4) {
    errors.push("Finish 5.0 parity-lock-5.0 floors must stay 20/4");
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
  if ((ship.softFloors?.finish5HistoricalSuiteFloor as number) < 20) {
    errors.push("soft floor finish5HistoricalSuiteFloor must stay ≥20");
  }

  if (ship.suiteFloor !== 24 || PARITY6_SUITE_FLOOR !== 24) errors.push("suiteFloor must be 24");
  if (ship.finish6SuiteFloor !== 4 || PARITY6_FINISH6_SUITE_FLOOR !== 4) {
    errors.push("finish6SuiteFloor must be 4");
  }

  if (catalog.phase !== 27) errors.push("baseline parity-lock phase must stay 27");
  if (catalog.finish2ParityLockPhase !== 29) errors.push("finish2ParityLockPhase must stay 29");
  if (catalog.finish3ParityLockPhase !== 29) errors.push("finish3ParityLockPhase must stay 29");
  if (catalog.finish4ParityLockPhase !== 29) errors.push("finish4ParityLockPhase must stay 29");
  if (catalog.finish5ParityLockPhase !== 29) errors.push("finish5ParityLockPhase must stay 29");
  if (catalog.finish6ParityLockPhase !== 29 || PARITY_LOCK_FINISH6_PHASE !== 29) {
    errors.push("finish6ParityLockPhase must be 29");
  }
  if (catalog.parityLock6Catalog !== "shared/ship/parity-lock-6.0.json") {
    errors.push("parity-lock.parityLock6Catalog mismatch");
  }
  if ((catalog.suiteFloor ?? 0) < 24) errors.push("parity-lock.suiteFloor must be ≥ 24");
  if ((catalog.finish6SuiteFloor ?? 0) < 4) errors.push("parity-lock.finish6SuiteFloor must be ≥ 4");
  // Soft-floor: Phase 30 freeze may bump live parity-lock contentVersion to 6.0.0.
  if (!["5.0.0", "6.0.0"].includes(catalog.contentVersion)) {
    errors.push("parity-lock contentVersion must be 5.0.0 or 6.0.0");
  }
  if ((catalog.schemaVersion ?? 0) < 27) errors.push("parity-lock schemaVersion must be ≥ 27");

  if (PARITY_LOCK_SUITE_IDS.length < 24) {
    errors.push(`runtime suites ${PARITY_LOCK_SUITE_IDS.length} < 24`);
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
  if (PARITY_LOCK_FINISH6_SUITE_IDS.length < 4) {
    errors.push(`finish6 suites ${PARITY_LOCK_FINISH6_SUITE_IDS.length} < 4`);
  }

  for (const id of REQUIRED_FINISH6_BASELINE_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing baseline suite ${id}`);
  }
  for (const id of REQUIRED_FINISH6_FINISH2_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish2 suite ${id}`);
    if (!PARITY_LOCK_FINISH2_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish2`);
    }
  }
  for (const id of REQUIRED_FINISH6_FINISH3_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish3 suite ${id}`);
    if (!PARITY_LOCK_FINISH3_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish3`);
    }
  }
  for (const id of REQUIRED_FINISH6_FINISH4_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish4 suite ${id}`);
    if (!PARITY_LOCK_FINISH4_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish4`);
    }
  }
  for (const id of REQUIRED_FINISH6_FINISH5_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish5 suite ${id}`);
    if (!PARITY_LOCK_FINISH5_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish5`);
    }
  }
  for (const id of REQUIRED_FINISH6_SUITE_IDS) {
    if (!PARITY_LOCK_SUITE_IDS.includes(id)) errors.push(`missing finish6 suite ${id}`);
    if (!PARITY_LOCK_FINISH6_SUITE_IDS.includes(id)) {
      errors.push(`suite ${id} must be flagged finish6`);
    }
  }
  for (const id of fixture.expect.finish6SuiteIds as string[]) {
    if (!REQUIRED_FINISH6_SUITE_IDS.includes(id)) errors.push(`ship missing required ${id}`);
  }
  for (const path of fixture.expect.finish6Fixtures as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing finish6 fixture ${path}`);
  }
  for (const gate of fixture.expect.gates as string[]) {
    if (catalog.gates?.[gate] !== true) errors.push(`parity-lock gates.${gate} must be true`);
    if ((PARITY_LOCK.gates as Record<string, boolean | undefined>)[gate] !== true) {
      errors.push(`runtime gates.${gate} must be true`);
    }
  }

  const systemTests: Array<[string, string]> = [
    ["web/test/machines1516.test.ts", "parity-machines-15-16.json"],
    ["web/test/questsContracts6.test.ts", "parity-quests-contracts-6.json"],
    ["web/test/endgame4.test.ts", "parity-endgame-4.json"],
    ["web/test/rivalsSeasonal6.test.ts", "parity-rivals-seasonal-6.json"],
  ];
  for (const [testFile, needle] of systemTests) {
    if (!existsSync(resolve(root, testFile))) errors.push(`missing system test ${testFile}`);
    else if (!readFileSync(resolve(root, testFile), "utf8").includes(needle)) {
      errors.push(`${testFile} missing ${needle}`);
    }
  }

  const measure = measureParityLock6(root);
  if (!measure.floorsMet) {
    errors.push(
      `floors short (suites=${measure.suiteCount} finish6=${measure.finish6Count} ` +
        `gap=${measure.gapClosed} wired=${measure.kickoffWired})`,
    );
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.parityLock6Missing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((dod.quotas?.parityLockSuites ?? 0) < 24) {
    errors.push("DoD quotas.parityLockSuites must be ≥ 24");
  }
  if ((dod.quotas?.parityLockFinish6Suites ?? 0) < 4) {
    errors.push("DoD quotas.parityLockFinish6Suites must be ≥ 4");
  }
  if (kickoff.gaps?.parityLock6Missing !== false) {
    errors.push("kickoff gap parityLock6Missing must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("parityLock6Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed parityLock6Missing");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length !== 0) {
    errors.push(`OPEN_GAP_FLAGS expected 0 after Phase 29, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.parityLock6Phase !== 29) errors.push("listing.parityLock6Phase must be 29");
  if (listing.parityLock6Catalog !== "shared/ship/parity-lock-6.0.json") {
    errors.push("listing.parityLock6Catalog mismatch");
  }
  if (!ci.includes("parity6:validate")) errors.push("ci.yml missing parity6:validate");
  if (!ci.includes("parity5:validate")) errors.push("ci.yml missing soft parity5:validate");
  if (!ci.includes("parity4:validate")) errors.push("ci.yml missing soft parity4:validate");
  if (!ci.includes("parity3:validate")) errors.push("ci.yml missing soft parity3:validate");
  if (!ci.includes("parity2:validate")) errors.push("ci.yml missing soft parity2:validate");
  if (!ci.includes("parity:validate")) errors.push("ci.yml missing soft parity:validate");
  if (!pin.fixtures?.includes("parity-parity-lock-6.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-parity-lock-6.0.json");
  }
  for (const f of [
    "parity-machines-15-16.json",
    "parity-quests-contracts-6.json",
    "parity-endgame-4.json",
    "parity-rivals-seasonal-6.json",
  ]) {
    if (!pin.fixtures?.includes(f)) errors.push(`RELEASE_PIN.fixtures missing ${f}`);
  }
  if (pin.parityLock6 !== "shared/ship/parity-lock-6.0.json") {
    errors.push("RELEASE_PIN.parityLock6 path mismatch");
  }
  if (pin.schemaVersion < 27) errors.push("RELEASE_PIN.schemaVersion must be >= 27");
  if (!pkg.scripts?.["parity6:validate"]) errors.push("web/package.json missing parity6:validate");
  if (PARITY_LOCK_6.parityLockCatalog !== "shared/fixtures/parity-lock.json") {
    errors.push("ship parityLockCatalog mismatch");
  }
  if (ship.softParity5Validate !== "npm run parity5:validate") {
    errors.push("catalog softParity5Validate must pin parity5:validate");
  }

  const phase29 = (kickoff.phases as any[])?.find((p: any) => p.phase === 29);
  if (!phase29 || phase29.validate !== "parity6:validate") {
    errors.push("kickoff phase 29 validate must be parity6:validate");
  }
  if (phase29?.id !== "parity-lock-6") errors.push("kickoff phase 29 id must be parity-lock-6");
  if (!finish6Kt.includes("parity6:validate")) {
    errors.push("Finish6Kickoff.kt phase 29 missing parity6:validate");
  }
  {
    const openBlock = finish6Kt.slice(
      finish6Kt.indexOf("OPEN_GAP_FLAGS"),
      finish6Kt.indexOf("fun score"),
    );
    if (openBlock.includes("parityLock6Missing")) {
      errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop parityLock6Missing");
    }
  }
  if (!kotlin.includes("PARITY_LOCK_6_MARKER") || !kotlin.includes("REQUIRED_FINISH6_SUITE_IDS")) {
    errors.push("Kotlin ParityLock6 missing constants");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("FINISH6_SUITE_FLOOR")) {
    errors.push("Kotlin ParityLock6 missing gap/floor constants");
  }
  if (!parityKt.includes("FINISH6_PARITY_LOCK_PHASE") || !parityKt.includes("machines_15_16")) {
    errors.push("Kotlin ParityLock missing Finish 6.0 suites");
  }

  const block = dod.parityLock6;
  if (!block) errors.push("DoD missing parityLock6 block");
  else {
    if (block.phase !== 29) errors.push("DoD parityLock6.phase must be 29");
    if (block.plan !== "30_finish_6.0") errors.push("DoD parityLock6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD parityLock6.status must be complete");
    if (block.parityLock6Marker !== PARITY_LOCK_6_MARKER) {
      errors.push("DoD parityLock6 marker mismatch");
    }
  }

  for (const gatePath of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("parity6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK parity6:validate — parity lock 6.0 machines/quests/endgame/rivals");
