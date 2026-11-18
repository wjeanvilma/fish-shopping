/**
 * Finish 3.0 Phase 2 — Android HUD panel decomposition readiness.
 *
 * Usage:
 *   npm run androidhud:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANDROID_HUD_SPLIT,
  ANDROID_HUD_SPLIT_MARKER,
  ANDROID_HUD_SPLIT_PHASE,
  ANDROID_HUD_SPLIT_SCHEMA,
  measureAndroidHudSplit,
} from "../src/ship/androidHudSplit";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/android-hud-split.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-android-hud-split.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/AndroidHudSplit.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 2) errors.push(`phase expected 2, got ${catalog.phase}`);
  if (catalog.schema !== ANDROID_HUD_SPLIT_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (ANDROID_HUD_SPLIT_PHASE !== 2) errors.push("phase mirror mismatch");
  if (catalog.androidHudSplitMarker !== ANDROID_HUD_SPLIT_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.androidHudSplitMarker !== ANDROID_HUD_SPLIT_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.gameScreenMaxLines !== 1000) errors.push("gameScreenMaxLines must be 1000");
  if (catalog.extractedFileMin !== 14) errors.push("extractedFileMin must be 14");
  if ((catalog.requiredFiles as string[]).length !== 16) {
    errors.push("requiredFiles must list 16 modules");
  }

  const measure = measureAndroidHudSplit(root);
  if (!measure.gameScreenSlim) {
    errors.push(
      `GameScreen.kt has ${measure.gameScreenLines} lines (max ${catalog.gameScreenMaxLines})`,
    );
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted HUD modules ${measure.extractedKtFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing HUD file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.androidHudDecomposition must be false");
  }

  const phase2 = (kickoff.phases as any[])?.find((p) => p.phase === 2);
  if (!phase2) errors.push("kickoff missing phase 2");
  else if (phase2.validate !== "androidhud:validate") {
    errors.push("kickoff phase 2 validate must be androidhud:validate");
  }
  if (kickoff.gaps?.androidHudDecomposition !== false) {
    errors.push("kickoff.gaps.androidHudDecomposition must be false");
  }

  if (listing.androidHudSplitPhase !== 2) errors.push("listing.androidHudSplitPhase must be 2");
  if (listing.androidHudSplitCatalog !== "shared/ship/android-hud-split.json") {
    errors.push("listing.androidHudSplitCatalog mismatch");
  }
  if (pin.androidHudSplit !== "shared/ship/android-hud-split.json") {
    errors.push("RELEASE_PIN.androidHudSplit path missing");
  }
  if (!pin.fixtures?.includes("parity-android-hud-split.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-android-hud-split.json");
  }

  const block = dod.androidHudSplit;
  if (!block) errors.push("DoD missing androidHudSplit block");
  else {
    if (block.phase !== 2) errors.push("DoD androidHudSplit.phase must be 2");
    if (block.plan !== "30_finish_3.0") errors.push("DoD androidHudSplit.plan mismatch");
    if (block.status !== "complete") errors.push("DoD androidHudSplit.status must be complete");
    if (block.androidHudSplitMarker !== ANDROID_HUD_SPLIT_MARKER) {
      errors.push("DoD androidHudSplit marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["androidhud:validate"]) {
    errors.push("package.json missing androidhud:validate");
  }
  if (!ci.includes("androidhud:validate")) errors.push("ci.yml missing androidhud:validate");
  if (!kotlin.includes("GAME_SCREEN_MAX_LINES")) {
    errors.push("Kotlin AndroidHudSplit missing GAME_SCREEN_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin AndroidHudSplit missing REQUIRED_FILES");
  }

  // Ensure GameScreen no longer defines extracted panels.
  const gameScreen = readFileSync(resolve(root, catalog.gameScreenPath), "utf8");
  for (const banned of [
    "fun SettingsPanel",
    "fun StaffPanel",
    "fun QuestLogPanel",
    "fun SpeciesBookPanel",
    "fun ContractsPanel",
    "fun BusinessDashboardPanel",
  ]) {
    if (gameScreen.includes(banned)) {
      errors.push(`GameScreen.kt still defines ${banned}`);
    }
  }
  if (!gameScreen.includes("fun GameScreen") || !gameScreen.includes("fun Hud")) {
    errors.push("GameScreen.kt must retain GameScreen + Hud");
  }

  if (fixture.expect?.requiredFileCount !== 16) {
    errors.push("parity requiredFileCount must be 16");
  }
  if (fixture.expect?.gapFlagClosed !== "androidHudDecomposition") {
    errors.push("parity gapFlagClosed mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("androidhud:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK androidhud:validate — Android HUD decomposed (GameScreen slim, panels extracted)",
);
