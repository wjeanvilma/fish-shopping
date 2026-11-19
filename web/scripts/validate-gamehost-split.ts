/**
 * Finish 4.0 Phase 6 — GameHost + renderer presenter split readiness.
 *
 * Usage:
 *   npm run gamehostsplit:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  GAMEHOST_SPLIT,
  GAMEHOST_SPLIT_MARKER,
  GAMEHOST_SPLIT_PHASE,
  GAMEHOST_SPLIT_SCHEMA,
  measureGameHostSplit,
} from "../src/ship/gameHostSplit";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/gamehost-split.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-gamehost-split.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/GameHostSplit.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 6) errors.push(`phase expected 6, got ${catalog.phase}`);
  if (catalog.schema !== GAMEHOST_SPLIT_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (GAMEHOST_SPLIT_PHASE !== 6) errors.push("phase mirror mismatch");
  if (catalog.gameHostSplitMarker !== GAMEHOST_SPLIT_MARKER) errors.push("marker mismatch");
  if (fixture.gameHostSplitMarker !== GAMEHOST_SPLIT_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.gameHostMaxLines !== 1400) errors.push("gameHostMaxLines must be 1400");
  if (catalog.harborRendererMaxLines !== 780) errors.push("harborRendererMaxLines must be 780");
  // Finish 5.0 Phase 5 soft-floors: fishing intents raised extracted floors.
  if ((catalog.extractedFileMin ?? 0) < 12) {
    errors.push("extractedFileMin soft-floor must be ≥12");
  }
  if ((catalog.softFloors?.extractedFileHistoricalMin ?? 0) < 12) {
    errors.push("soft floor extractedFileHistoricalMin must stay ≥12");
  }
  if ((catalog.requiredFiles as string[]).length < 16) {
    errors.push("requiredFiles must list ≥16 modules");
  }
  if (!(catalog.requiredFiles as string[]).includes("web/src/game/host/hostFishingIntents.ts")) {
    errors.push("requiredFiles must include hostFishingIntents.ts after Finish 5 Phase 5");
  }

  const measure = measureGameHostSplit(root);
  if (!measure.gameHostSlim) {
    errors.push(
      `GameHost.ts has ${measure.gameHostLines} lines (max ${catalog.gameHostMaxLines})`,
    );
  }
  if (measure.gameHostLines >= 1664) {
    errors.push(`GameHost.ts did not shrink below pre-split size (${measure.gameHostLines})`);
  }
  if (!measure.harborRendererSlim) {
    errors.push(
      `HarborRenderer.kt has ${measure.harborRendererLines} lines (max ${catalog.harborRendererMaxLines})`,
    );
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted modules ${measure.extractedFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  for (const d of measure.stillDefines) errors.push(`facade still defines ${d}`);
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.gameHostSplitIncomplete must be false");
  }

  const phase6 = (kickoff.phases as any[])?.find((p) => p.phase === 6);
  if (!phase6) errors.push("kickoff missing phase 6");
  else if (phase6.validate !== "gamehostsplit:validate") {
    errors.push("kickoff phase 6 validate must be gamehostsplit:validate");
  }
  if (phase6?.id !== "gamehost-split") errors.push("kickoff phase 6 id must be gamehost-split");
  if (kickoff.gaps?.gameHostSplitIncomplete !== false) {
    errors.push("kickoff.gaps.gameHostSplitIncomplete must be false");
  }

  if (listing.gameHostSplitPhase !== 6) errors.push("listing.gameHostSplitPhase must be 6");
  if (listing.gameHostSplitCatalog !== "shared/ship/gamehost-split.json") {
    errors.push("listing.gameHostSplitCatalog mismatch");
  }
  if (pin.gameHostSplit !== "shared/ship/gamehost-split.json") {
    errors.push("RELEASE_PIN.gameHostSplit path missing");
  }
  if (!pin.fixtures?.includes("parity-gamehost-split.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-gamehost-split.json");
  }

  const block = dod.gameHostSplit;
  if (!block) errors.push("DoD missing gameHostSplit block");
  else {
    if (block.phase !== 6) errors.push("DoD gameHostSplit.phase must be 6");
    if (block.plan !== "30_finish_4.0") errors.push("DoD gameHostSplit.plan mismatch");
    if (block.status !== "complete") errors.push("DoD gameHostSplit.status must be complete");
    if (block.gameHostSplitMarker !== GAMEHOST_SPLIT_MARKER) {
      errors.push("DoD gameHostSplit marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["gamehostsplit:validate"]) {
    errors.push("package.json missing gamehostsplit:validate");
  }
  if (!ci.includes("gamehostsplit:validate")) {
    errors.push("ci.yml missing gamehostsplit:validate");
  }
  if (!kotlin.includes("GAME_HOST_MAX_LINES")) {
    errors.push("Kotlin GameHostSplit missing GAME_HOST_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin GameHostSplit missing REQUIRED_FILES");
  }

  const hostBody = readFileSync(resolve(root, catalog.gameHostPath), "utf8");
  if (!hostBody.includes("shellIntents") || !hostBody.includes("economyIntents")) {
    errors.push("GameHost must wire shellIntents + economyIntents");
  }
  if (!hostBody.includes("travelIntents") || !hostBody.includes("iapIntents")) {
    errors.push("GameHost must wire travelIntents + iapIntents");
  }
  if (!hostBody.includes("processHostStep")) {
    errors.push("GameHost must call processHostStep");
  }

  if (fixture.expect?.requiredFileCount !== 16) {
    errors.push("parity requiredFileCount must be 16");
  }
  if (fixture.expect?.gapFlagClosed !== "gameHostSplitIncomplete") {
    errors.push("parity gapFlagClosed mismatch");
  }
  if (fixture.expect?.gameHostMaxLines !== 1400) {
    errors.push("parity gameHostMaxLines must be 1400");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("gamehostsplit:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK gamehostsplit:validate — GameHost host/step buses + presenter cleanup locked",
);
