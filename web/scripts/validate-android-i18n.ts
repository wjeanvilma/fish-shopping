/**
 * Finish 3.0 Phase 5 — Android i18n completion readiness.
 *
 * Usage:
 *   npm run androidi18n:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANDROID_I18N,
  ANDROID_I18N_MARKER,
  ANDROID_I18N_PHASE,
  ANDROID_I18N_SCHEMA,
  measureAndroidI18n,
} from "../src/ship/androidI18n";
import { UI_STRING_KEYS, uiStringKeyCount } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/android-i18n.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-android-i18n.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const index = readJson(resolve(root, "shared/i18n/ui-strings.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/AndroidI18n.kt",
    ),
    "utf8",
  );
  const uiKt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/UiStrings.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 5) errors.push(`phase expected 5, got ${catalog.phase}`);
  if (catalog.schema !== ANDROID_I18N_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (ANDROID_I18N_PHASE !== 5) errors.push("phase mirror mismatch");
  if (catalog.androidI18nMarker !== ANDROID_I18N_MARKER) errors.push("marker mismatch");
  if (fixture.androidI18nMarker !== ANDROID_I18N_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.uiStringKeyMin !== 120) errors.push("uiStringKeyMin must be 120");
  if (catalog.androidTextLiteralsMax !== 0) {
    errors.push("androidTextLiteralsMax must be 0");
  }
  if ((index.keyMin ?? 0) < 120) errors.push("ui-strings.json keyMin must be ≥120");

  const measure = measureAndroidI18n(root);
  if (!measure.keysEnough) {
    errors.push(
      `ui keys en=${measure.enKeys} es=${measure.esKeys} < min ${catalog.uiStringKeyMin}`,
    );
  }
  if (!measure.keyParity) errors.push("en/es UI string key sets differ");
  if (!measure.textLiteralsOk) {
    errors.push(
      `ui/hud Text(" literals ${measure.textLiterals} > max ${catalog.androidTextLiteralsMax}`,
    );
  }
  if (measure.uiStringsCalls < 100) {
    errors.push(`ui/hud UiStrings.t calls ${measure.uiStringsCalls} look too low`);
  }
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.androidI18nIncomplete must be false");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (UI_STRING_KEYS.length !== measure.enKeys) {
    errors.push("runtime UI_STRING_KEYS drift vs en bundle");
  }
  if (uiStringKeyCount("en") < 120 || uiStringKeyCount("es") < 120) {
    errors.push("runtime uiStringKeyCount below 120");
  }
  if (!uiKt.includes("private val EN = mapOf")) errors.push("UiStrings.kt missing EN map");
  if (!uiKt.includes("private val ES = mapOf")) errors.push("UiStrings.kt missing ES map");
  for (const sample of ["dashboard.dailyStreak", "offline.title", "hud.coinsAmount"]) {
    if (!uiKt.includes(`"${sample}"`)) errors.push(`UiStrings.kt missing key ${sample}`);
  }

  const phase5 = (kickoff.phases as any[])?.find((p) => p.phase === 5);
  if (!phase5) errors.push("kickoff missing phase 5");
  else if (phase5.validate !== "androidi18n:validate") {
    errors.push("kickoff phase 5 validate must be androidi18n:validate");
  }
  if (kickoff.gaps?.androidI18nIncomplete !== false) {
    errors.push("kickoff.gaps.androidI18nIncomplete must be false");
  }
  if ((kickoff.baseline?.i18nUiKeys ?? 0) < 120) {
    errors.push("kickoff.baseline.i18nUiKeys must be ≥120");
  }
  if ((kickoff.baseline?.androidTextLiterals ?? 1) !== 0) {
    errors.push("kickoff.baseline.androidTextLiterals must be 0");
  }

  if (listing.androidI18nPhase !== 5) errors.push("listing.androidI18nPhase must be 5");
  if (listing.androidI18nCatalog !== "shared/ship/android-i18n.json") {
    errors.push("listing.androidI18nCatalog mismatch");
  }
  if (pin.androidI18n !== "shared/ship/android-i18n.json") {
    errors.push("RELEASE_PIN.androidI18n path missing");
  }
  if (!pin.fixtures?.includes("parity-android-i18n.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-android-i18n.json");
  }

  const block = dod.androidI18n;
  if (!block) errors.push("DoD missing androidI18n block");
  else {
    if (block.phase !== 5) errors.push("DoD androidI18n.phase must be 5");
    if (block.plan !== "30_finish_3.0") errors.push("DoD androidI18n.plan mismatch");
    if (block.status !== "complete") errors.push("DoD androidI18n.status must be complete");
    if (block.androidI18nMarker !== ANDROID_I18N_MARKER) {
      errors.push("DoD androidI18n marker mismatch");
    }
  }

  if (!pkg.scripts?.["androidi18n:validate"]) {
    errors.push("package.json missing androidi18n:validate");
  }
  if (!ci.includes("androidi18n:validate")) errors.push("ci.yml missing androidi18n:validate");
  if (!kotlin.includes("UI_STRING_KEY_MIN")) {
    errors.push("Kotlin AndroidI18n missing UI_STRING_KEY_MIN");
  }
  if (!kotlin.includes("ANDROID_TEXT_LITERALS_MAX")) {
    errors.push("Kotlin AndroidI18n missing ANDROID_TEXT_LITERALS_MAX");
  }

  if (fixture.expect?.uiStringKeyMin !== 120) {
    errors.push("parity uiStringKeyMin must be 120");
  }
  if (fixture.expect?.androidTextLiteralsMax !== 0) {
    errors.push("parity androidTextLiteralsMax must be 0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("androidi18n:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK androidi18n:validate — Android HUD chrome through UiStrings (≥120 keys, 0 Text(\" literals)",
);
