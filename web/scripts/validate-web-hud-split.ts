/**
 * Finish 3.0 Phase 3 — web HUD panel decomposition readiness.
 *
 * Usage:
 *   npm run webhud:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  measureWebHudSplit,
  WEB_HUD_SPLIT,
  WEB_HUD_SPLIT_MARKER,
  WEB_HUD_SPLIT_PHASE,
  WEB_HUD_SPLIT_SCHEMA,
} from "../src/ship/webHudSplit";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/web-hud-split.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-web-hud-split.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/WebHudSplit.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 3) errors.push(`phase expected 3, got ${catalog.phase}`);
  if (catalog.schema !== WEB_HUD_SPLIT_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (WEB_HUD_SPLIT_PHASE !== 3) errors.push("phase mirror mismatch");
  if (catalog.webHudSplitMarker !== WEB_HUD_SPLIT_MARKER) errors.push("marker mismatch");
  if (fixture.webHudSplitMarker !== WEB_HUD_SPLIT_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.appMaxLines !== 900) errors.push("appMaxLines must be 900");
  if (catalog.extractedFileMin !== 12) errors.push("extractedFileMin must be 12");
  if ((catalog.requiredFiles as string[]).length !== 15) {
    errors.push("requiredFiles must list 15 modules");
  }

  const measure = measureWebHudSplit(root);
  if (!measure.appSlim) {
    errors.push(`App.tsx has ${measure.appLines} lines (max ${catalog.appMaxLines})`);
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted UI modules ${measure.extractedUiFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing UI file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  if (!measure.gapClosed) errors.push("kickoff gaps.webHudDecomposition must be false");

  const phase3 = (kickoff.phases as any[])?.find((p) => p.phase === 3);
  if (!phase3) errors.push("kickoff missing phase 3");
  else if (phase3.validate !== "webhud:validate") {
    errors.push("kickoff phase 3 validate must be webhud:validate");
  }
  if (kickoff.gaps?.webHudDecomposition !== false) {
    errors.push("kickoff.gaps.webHudDecomposition must be false");
  }
  if (kickoff.gaps?.androidHudDecomposition !== false) {
    errors.push("kickoff.gaps.androidHudDecomposition must stay false");
  }

  if (listing.webHudSplitPhase !== 3) errors.push("listing.webHudSplitPhase must be 3");
  if (listing.webHudSplitCatalog !== "shared/ship/web-hud-split.json") {
    errors.push("listing.webHudSplitCatalog mismatch");
  }
  if (pin.webHudSplit !== "shared/ship/web-hud-split.json") {
    errors.push("RELEASE_PIN.webHudSplit path missing");
  }
  if (!pin.fixtures?.includes("parity-web-hud-split.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-web-hud-split.json");
  }

  const block = dod.webHudSplit;
  if (!block) errors.push("DoD missing webHudSplit block");
  else {
    if (block.phase !== 3) errors.push("DoD webHudSplit.phase must be 3");
    if (block.plan !== "30_finish_3.0") errors.push("DoD webHudSplit.plan mismatch");
    if (block.status !== "complete") errors.push("DoD webHudSplit.status must be complete");
    if (block.webHudSplitMarker !== WEB_HUD_SPLIT_MARKER) {
      errors.push("DoD webHudSplit marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["webhud:validate"]) errors.push("package.json missing webhud:validate");
  if (!ci.includes("webhud:validate")) errors.push("ci.yml missing webhud:validate");
  if (!kotlin.includes("APP_MAX_LINES")) errors.push("Kotlin WebHudSplit missing APP_MAX_LINES");
  if (!kotlin.includes("REQUIRED_FILES")) errors.push("Kotlin WebHudSplit missing REQUIRED_FILES");

  const app = readFileSync(resolve(root, catalog.appPath), "utf8");
  for (const banned of [
    "function SettingsPanel",
    "function StaffPanel",
    "function QuestLogPanel",
    "function SpeciesBookPanel",
    "function ContractsPanel",
    "function BusinessDashboardPanel",
    "function formatCoins",
  ]) {
    if (app.includes(banned)) errors.push(`App.tsx still defines ${banned}`);
  }
  if (!app.includes("export function App") || !app.includes("function Hud") || !app.includes("function World")) {
    errors.push("App.tsx must retain App + World + Hud");
  }

  if (fixture.expect?.requiredFileCount !== 15) {
    errors.push("parity requiredFileCount must be 15");
  }
  if (fixture.expect?.gapFlagClosed !== "webHudDecomposition") {
    errors.push("parity gapFlagClosed mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("webhud:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK webhud:validate — web HUD decomposed (App slim, panels extracted)");
