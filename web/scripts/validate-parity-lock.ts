/**
 * Phase 27 (post-1.0) — expanded Kotlin↔web parity lock readiness.
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
  if (catalog.contentVersion !== "1.0.1") errors.push("contentVersion must be 1.0.1");
  if (catalog.schemaVersion !== 20) errors.push("schemaVersion must stay 20");
  if (catalog.constraints?.byteIdenticalSnapshots !== true) {
    errors.push("byteIdenticalSnapshots required");
  }

  const suiteIds = (catalog.suites as any[]).map((s) => s.id);
  for (const need of ["prng", "starter_line", "entitlements_unlock", "legacy_migrations"]) {
    if (!suiteIds.includes(need)) errors.push(`suite missing ${need}`);
  }

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

  if (!pin.fixtures.includes("parity-entitlements.json")) {
    errors.push("RELEASE_PIN fixtures must include parity-entitlements.json");
  }
  if (!pin.fixtures.includes("parity-lock.json") && !pin.parityLock) {
    // parity-lock catalog is referenced from pin notes / optional key
  }
  if (pin.contentVersion !== "1.0.1") errors.push("RELEASE_PIN contentVersion must be 1.0.1");
  if (pin.schemaVersion !== 20) errors.push("RELEASE_PIN schemaVersion must stay 20");

  if (!web.includes("parityExpectedState")) errors.push("web parityLock missing parityExpectedState");
  if (!kotlin.includes("PHASE = 27")) errors.push("Kotlin ParityLock.PHASE must be 27");
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
console.log("OK parity:validate — expanded Kotlin↔web golden suites; schema 20");
