/**
 * Finish 4.0 Phase 4 — Android GameViewModel intent/handler split readiness.
 *
 * Usage:
 *   npm run viewmodelsplit:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  measureViewModelSplit,
  VIEWMODEL_SPLIT,
  VIEWMODEL_SPLIT_MARKER,
  VIEWMODEL_SPLIT_PHASE,
  VIEWMODEL_SPLIT_SCHEMA,
} from "../src/ship/viewModelSplit";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/viewmodel-split.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-viewmodel-split.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ViewModelSplit.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 4) errors.push(`phase expected 4, got ${catalog.phase}`);
  if (catalog.schema !== VIEWMODEL_SPLIT_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (VIEWMODEL_SPLIT_PHASE !== 4) errors.push("phase mirror mismatch");
  if (catalog.viewModelSplitMarker !== VIEWMODEL_SPLIT_MARKER) errors.push("marker mismatch");
  if (fixture.viewModelSplitMarker !== VIEWMODEL_SPLIT_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  // Finish 5.0 Phase 4 soft-floors: fishing intents raised extracted floors.
  if ((catalog.viewModelMaxLines ?? 0) < 1500) {
    errors.push("viewModelMaxLines soft-floor must be ≥1500");
  }
  if ((catalog.extractedFileMin ?? 0) < 6) {
    errors.push("extractedFileMin soft-floor must be ≥6");
  }
  if ((catalog.softFloors?.extractedFileHistoricalMin ?? 0) < 6) {
    errors.push("soft floor extractedFileHistoricalMin must stay ≥6");
  }
  if ((catalog.requiredFiles as string[]).length < 6) {
    errors.push("requiredFiles must list ≥6 modules");
  }
  if (!(catalog.requiredFiles as string[]).includes("vm/VmFishingIntents.kt")) {
    errors.push("requiredFiles must include vm/VmFishingIntents.kt after Finish 5 Phase 4");
  }

  const measure = measureViewModelSplit(root);
  if (!measure.viewModelSlim) {
    errors.push(
      `GameViewModel.kt has ${measure.viewModelLines} lines (max ${catalog.viewModelMaxLines})`,
    );
  }
  if (measure.viewModelLines >= 1633) {
    errors.push(`GameViewModel.kt did not shrink below pre-split size (${measure.viewModelLines})`);
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted ViewModel modules ${measure.extractedFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  for (const d of measure.viewModelStillDefines) {
    errors.push(`GameViewModel.kt still defines ${d}`);
  }
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.viewModelSplitIncomplete must be false");
  }

  const phase4 = (kickoff.phases as any[])?.find((p) => p.phase === 4);
  if (!phase4) errors.push("kickoff missing phase 4");
  else if (phase4.validate !== "viewmodelsplit:validate") {
    errors.push("kickoff phase 4 validate must be viewmodelsplit:validate");
  }
  if (phase4?.id !== "viewmodel-split") errors.push("kickoff phase 4 id must be viewmodel-split");
  if (kickoff.gaps?.viewModelSplitIncomplete !== false) {
    errors.push("kickoff.gaps.viewModelSplitIncomplete must be false");
  }

  if (listing.viewModelSplitPhase !== 4) errors.push("listing.viewModelSplitPhase must be 4");
  if (listing.viewModelSplitCatalog !== "shared/ship/viewmodel-split.json") {
    errors.push("listing.viewModelSplitCatalog mismatch");
  }
  if (pin.viewModelSplit !== "shared/ship/viewmodel-split.json") {
    errors.push("RELEASE_PIN.viewModelSplit path missing");
  }
  if (!pin.fixtures?.includes("parity-viewmodel-split.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-viewmodel-split.json");
  }

  const block = dod.viewModelSplit;
  if (!block) errors.push("DoD missing viewModelSplit block");
  else {
    if (block.phase !== 4) errors.push("DoD viewModelSplit.phase must be 4");
    if (block.plan !== "30_finish_4.0") errors.push("DoD viewModelSplit.plan mismatch");
    if (block.status !== "complete") errors.push("DoD viewModelSplit.status must be complete");
    if (block.viewModelSplitMarker !== VIEWMODEL_SPLIT_MARKER) {
      errors.push("DoD viewModelSplit marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["viewmodelsplit:validate"]) {
    errors.push("package.json missing viewmodelsplit:validate");
  }
  if (!ci.includes("viewmodelsplit:validate")) {
    errors.push("ci.yml missing viewmodelsplit:validate");
  }
  if (!kotlin.includes("VIEW_MODEL_MAX_LINES")) {
    errors.push("Kotlin ViewModelSplit missing VIEW_MODEL_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin ViewModelSplit missing REQUIRED_FILES");
  }

  const vmBody = readFileSync(resolve(root, catalog.viewModelPath), "utf8");
  if (!vmBody.includes("shellIntents") || !vmBody.includes("economyIntents")) {
    errors.push("GameViewModel must wire shellIntents + economyIntents");
  }
  if (!vmBody.includes("travelIntents") || !vmBody.includes("iapIntents")) {
    errors.push("GameViewModel must wire travelIntents + iapIntents");
  }

  if (fixture.expect?.requiredFileCount !== 6) {
    errors.push("parity requiredFileCount must be 6");
  }
  if (fixture.expect?.gapFlagClosed !== "viewModelSplitIncomplete") {
    errors.push("parity gapFlagClosed mismatch");
  }
  if (fixture.expect?.viewModelMaxLines !== 1500) {
    errors.push("parity viewModelMaxLines must be 1500");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("viewmodelsplit:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK viewmodelsplit:validate — GameViewModel shell/economy/travel/IAP intents extracted",
);
