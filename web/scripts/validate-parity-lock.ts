/**
 * Phase 27 (post-1.0) — expanded Kotlin↔web parity lock readiness.
 * Finish 2.0 Phase 29 suites are required but phase stays 27.
 *
 * Usage:
 *   npm run parity:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const starter = readJson(resolve(root, "shared/fixtures/starter-line.json"));
  const entitlements = readJson(resolve(root, "shared/fixtures/parity-entitlements.json"));
  const web = readFileSync(resolve(root, "web/src/engine/parityLock.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/ParityLock.kt"),
    "utf8",
  );
  const parityTest = readFileSync(resolve(root, "web/test/parity.test.ts"), "utf8");
  const kotlinFixture = readFileSync(
    resolve(root, "game-core/src/test/kotlin/com/willio/jeanvilma/fishshopping/core/ParityLockFixture.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 27) errors.push(`phase expected 27, got ${catalog.phase}`);
  if (catalog.schema !== "fish.fixtures.parity_lock.v1") errors.push("bad schema");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must be 2.0.0");
  if (catalog.schemaVersion < 21) errors.push("schemaVersion must be >= 21");
  if (catalog.constraints?.byteIdenticalSnapshots !== true) {
    errors.push("byteIdenticalSnapshots required");
  }
  if (catalog.finish2ParityLockPhase !== 29) {
    errors.push("finish2ParityLockPhase must be 29");
  }

  const suiteIds = (catalog.suites as any[]).map((s) => s.id);
  for (const need of [
    "prng",
    "starter_line",
    "entitlements_unlock",
    "legacy_migrations",
    "achievements",
    "weather_tide",
    "fishing_mastery",
    "festival_weekends",
  ]) {
    if (!suiteIds.includes(need)) errors.push(`suite missing ${need}`);
  }
  if (suiteIds.length < 8) errors.push(`suite count ${suiteIds.length} < 8`);

  for (const field of catalog.expandedExpectFields as string[]) {
    if (!(field in starter.expect)) errors.push(`starter-line expect missing ${field}`);
    if (!(field in entitlements.expect)) errors.push(`parity-entitlements expect missing ${field}`);
  }

  if (starter.expect.tutorialIndex < 11) {
    errors.push("starter-line tutorialIndex should finish the scripted tutorial");
  }
  if (entitlements.expect.fullHarborUnlock !== true) {
    errors.push("parity-entitlements must grant fullHarborUnlock");
  }
  if (!Array.isArray(entitlements.expect.unlockedCosmetics) || entitlements.expect.unlockedCosmetics.length < 1) {
    errors.push("parity-entitlements must unlock a cosmetic");
  }

  for (const gate of [
    "achievementsIdempotent",
    "weatherDeterministicFromTick",
    "masteryXpOnCatch",
    "festivalTipsCatalogDriven",
  ]) {
    if (catalog.gates?.[gate] !== true) errors.push(`gates.${gate} must be true`);
  }

  for (const suite of catalog.suites as any[]) {
    if (suite.fixture && !existsSync(resolve(root, suite.fixture))) {
      errors.push(`missing suite fixture ${suite.fixture}`);
    }
    if (Array.isArray(suite.fixtures)) {
      for (const f of suite.fixtures as string[]) {
        if (!existsSync(resolve(root, f))) errors.push(`missing suite fixture ${f}`);
      }
    }
  }

  if (!pin.fixtures.includes("parity-entitlements.json")) {
    errors.push("RELEASE_PIN fixtures must include parity-entitlements.json");
  }
  if (pin.contentVersion !== "2.0.0") errors.push("RELEASE_PIN contentVersion must be 2.0.0");
  if (pin.schemaVersion !== catalog.schemaVersion) {
    errors.push("RELEASE_PIN schemaVersion must match parity-lock schemaVersion");
  }

  if (!web.includes("parityExpectedState")) errors.push("web parityLock missing parityExpectedState");
  if (!kotlin.includes("PHASE = 27")) errors.push("Kotlin ParityLock.PHASE must be 27");
  if (!kotlin.includes("FINISH2_PARITY_LOCK_PHASE = 29")) {
    errors.push("Kotlin ParityLock.FINISH2_PARITY_LOCK_PHASE must be 29");
  }
  if (!parityTest.includes("parity-entitlements")) errors.push("parity.test.ts missing entitlements suite");
  if (!kotlinFixture.includes("ParityLockFixture")) errors.push("Kotlin ParityLockFixture missing");
  if (!ci.includes("parity:validate")) errors.push("ci.yml missing parity:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("parity:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const schemaVersion = readJson(resolve(root, "shared/fixtures/parity-lock.json")).schemaVersion;
console.log(`OK parity:validate — expanded Kotlin↔web golden suites; schema ${schemaVersion}`);
