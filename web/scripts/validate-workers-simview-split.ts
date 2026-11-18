/**
 * Finish 4.0 Phase 5 — Workers.kt + SimView.kt split + AI hooks readiness.
 *
 * Usage:
 *   npm run workersplit:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  measureWorkersSimViewSplit,
  WORKERS_SIMVIEW_SPLIT,
  WORKERS_SIMVIEW_SPLIT_MARKER,
  WORKERS_SIMVIEW_SPLIT_PHASE,
  WORKERS_SIMVIEW_SPLIT_SCHEMA,
} from "../src/ship/workersSimViewSplit";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/workers-simview-split.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-workers-simview-split.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/WorkersSimViewSplit.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 5) errors.push(`phase expected 5, got ${catalog.phase}`);
  if (catalog.schema !== WORKERS_SIMVIEW_SPLIT_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (WORKERS_SIMVIEW_SPLIT_PHASE !== 5) errors.push("phase mirror mismatch");
  if (catalog.workersSimViewSplitMarker !== WORKERS_SIMVIEW_SPLIT_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.workersSimViewSplitMarker !== WORKERS_SIMVIEW_SPLIT_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.workersMaxLines !== 600) errors.push("workersMaxLines must be 600");
  if (catalog.simViewMaxLines !== 800) errors.push("simViewMaxLines must be 800");
  if (catalog.extractedFileMin !== 5) errors.push("extractedFileMin must be 5");
  if ((catalog.requiredFiles as string[]).length !== 5) {
    errors.push("requiredFiles must list 5 modules");
  }

  const measure = measureWorkersSimViewSplit(root);
  if (!measure.workersSlim) {
    errors.push(`Workers.kt has ${measure.workersLines} lines (max ${catalog.workersMaxLines})`);
  }
  if (measure.workersLines >= 1638) {
    errors.push(`Workers.kt did not shrink below pre-split size (${measure.workersLines})`);
  }
  if (!measure.simViewSlim) {
    errors.push(`SimView.kt has ${measure.simViewLines} lines (max ${catalog.simViewMaxLines})`);
  }
  if (measure.simViewLines >= 1517) {
    errors.push(`SimView.kt did not shrink below pre-split size (${measure.simViewLines})`);
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted modules ${measure.extractedFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  for (const d of measure.stillDefines) errors.push(`still defines ${d}`);
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.workersSimViewSplitIncomplete must be false");
  }
  if (!measure.decisionHooksWired) {
    errors.push("systems.ts must record WorkerDecisionHooks haul traces");
  }

  const phase5 = (kickoff.phases as any[])?.find((p) => p.phase === 5);
  if (!phase5) errors.push("kickoff missing phase 5");
  else if (phase5.validate !== "workersplit:validate") {
    errors.push("kickoff phase 5 validate must be workersplit:validate");
  }
  if (phase5?.id !== "workers-simview-split") {
    errors.push("kickoff phase 5 id must be workers-simview-split");
  }
  if (kickoff.gaps?.workersSimViewSplitIncomplete !== false) {
    errors.push("kickoff.gaps.workersSimViewSplitIncomplete must be false");
  }

  if (listing.workersSimViewSplitPhase !== 5) {
    errors.push("listing.workersSimViewSplitPhase must be 5");
  }
  if (listing.workersSimViewSplitCatalog !== "shared/ship/workers-simview-split.json") {
    errors.push("listing.workersSimViewSplitCatalog mismatch");
  }
  if (pin.workersSimViewSplit !== "shared/ship/workers-simview-split.json") {
    errors.push("RELEASE_PIN.workersSimViewSplit path missing");
  }
  if (!pin.fixtures?.includes("parity-workers-simview-split.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-workers-simview-split.json");
  }

  const block = dod.workersSimViewSplit;
  if (!block) errors.push("DoD missing workersSimViewSplit block");
  else {
    if (block.phase !== 5) errors.push("DoD workersSimViewSplit.phase must be 5");
    if (block.plan !== "30_finish_4.0") errors.push("DoD workersSimViewSplit.plan mismatch");
    if (block.status !== "complete") errors.push("DoD workersSimViewSplit.status must be complete");
    if (block.workersSimViewSplitMarker !== WORKERS_SIMVIEW_SPLIT_MARKER) {
      errors.push("DoD workersSimViewSplit marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["workersplit:validate"]) {
    errors.push("package.json missing workersplit:validate");
  }
  if (!ci.includes("workersplit:validate")) errors.push("ci.yml missing workersplit:validate");
  if (!kotlin.includes("WORKERS_MAX_LINES")) {
    errors.push("Kotlin WorkersSimViewSplit missing WORKERS_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin WorkersSimViewSplit missing REQUIRED_FILES");
  }

  if (fixture.expect?.requiredFileCount !== 5) {
    errors.push("parity requiredFileCount must be 5");
  }
  if (fixture.expect?.gapFlagClosed !== "workersSimViewSplitIncomplete") {
    errors.push("parity gapFlagClosed mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("workersplit:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK workersplit:validate — Workers/SimView split + WorkerDecisionHooks AI traces locked",
);
