/**
 * Finish 4.0 Phase 2 — systems.ts fishing/production/inventory split readiness.
 *
 * Usage:
 *   npm run systemssplit1:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  measureSystemsSplit1,
  SYSTEMS_SPLIT_1,
  SYSTEMS_SPLIT_1_MARKER,
  SYSTEMS_SPLIT_1_PHASE,
  SYSTEMS_SPLIT_1_SCHEMA,
} from "../src/ship/systemsSplit1";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/systems-split-1.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-systems-split-1.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/SystemsSplit1.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 2) errors.push(`phase expected 2, got ${catalog.phase}`);
  if (catalog.schema !== SYSTEMS_SPLIT_1_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (SYSTEMS_SPLIT_1_PHASE !== 2) errors.push("phase mirror mismatch");
  if (catalog.systemsSplit1Marker !== SYSTEMS_SPLIT_1_MARKER) errors.push("marker mismatch");
  if (fixture.systemsSplit1Marker !== SYSTEMS_SPLIT_1_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.systemsFacadeMaxLines !== 4700) errors.push("systemsFacadeMaxLines must be 4700");
  if (catalog.extractedFileMin !== 5) errors.push("extractedFileMin must be 5");
  if ((catalog.requiredFiles as string[]).length !== 5) {
    errors.push("requiredFiles must list 5 modules");
  }

  const measure = measureSystemsSplit1(root);
  if (!measure.facadeSlim) {
    errors.push(
      `systems.ts has ${measure.facadeLines} lines (max ${catalog.systemsFacadeMaxLines})`,
    );
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted systems modules ${measure.extractedTsFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing systems file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  for (const d of measure.facadeStillDefines) {
    errors.push(`systems.ts still defines ${d}`);
  }
  for (const r of measure.facadeMissingReexports) {
    errors.push(`systems.ts missing re-export/symbol ${r}`);
  }
  if (!measure.bridgeBound) errors.push("systems.ts must call bindSystemsBridge");
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.systemsSplitIncomplete must be false");
  }

  const phase2 = (kickoff.phases as any[])?.find((p) => p.phase === 2);
  if (!phase2) errors.push("kickoff missing phase 2");
  else if (phase2.validate !== "systemssplit1:validate") {
    errors.push("kickoff phase 2 validate must be systemssplit1:validate");
  }
  if (phase2?.id !== "systems-split-1") errors.push("kickoff phase 2 id must be systems-split-1");
  if (kickoff.gaps?.systemsSplitIncomplete !== false) {
    errors.push("kickoff.gaps.systemsSplitIncomplete must be false");
  }

  if (listing.systemsSplit1Phase !== 2) errors.push("listing.systemsSplit1Phase must be 2");
  if (listing.systemsSplit1Catalog !== "shared/ship/systems-split-1.json") {
    errors.push("listing.systemsSplit1Catalog mismatch");
  }
  if (pin.systemsSplit1 !== "shared/ship/systems-split-1.json") {
    errors.push("RELEASE_PIN.systemsSplit1 path missing");
  }
  if (!pin.fixtures?.includes("parity-systems-split-1.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-systems-split-1.json");
  }

  const block = dod.systemsSplit1;
  if (!block) errors.push("DoD missing systemsSplit1 block");
  else {
    if (block.phase !== 2) errors.push("DoD systemsSplit1.phase must be 2");
    if (block.plan !== "30_finish_4.0") errors.push("DoD systemsSplit1.plan mismatch");
    if (block.status !== "complete") errors.push("DoD systemsSplit1.status must be complete");
    if (block.systemsSplit1Marker !== SYSTEMS_SPLIT_1_MARKER) {
      errors.push("DoD systemsSplit1 marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["systemssplit1:validate"]) {
    errors.push("package.json missing systemssplit1:validate");
  }
  if (!ci.includes("systemssplit1:validate")) errors.push("ci.yml missing systemssplit1:validate");
  if (!kotlin.includes("SYSTEMS_FACADE_MAX_LINES")) {
    errors.push("Kotlin SystemsSplit1 missing SYSTEMS_FACADE_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin SystemsSplit1 missing REQUIRED_FILES");
  }

  // Extracted modules must not import the facade (circular ESM trap).
  for (const name of ["fishing.ts", "production.ts", "movement.ts"]) {
    const body = readFileSync(resolve(root, catalog.systemsPackageRoot, name), "utf8");
    if (body.includes('from "../systems"') || body.includes("from '../systems'")) {
      errors.push(`${name} must not import ../systems (use bridge)`);
    }
    if (!body.includes("systemsBridge") && name !== "context.ts") {
      // fishing/production/movement all use the bridge
      if (name !== "bridge.ts") {
        // context doesn't need bridge; others should
      }
    }
  }
  for (const name of ["fishing.ts", "production.ts", "movement.ts"]) {
    const body = readFileSync(resolve(root, catalog.systemsPackageRoot, name), "utf8");
    if (!body.includes("systemsBridge")) {
      errors.push(`${name} must use systemsBridge for cross-system deps`);
    }
  }

  if (fixture.expect?.requiredFileCount !== 5) {
    errors.push("parity requiredFileCount must be 5");
  }
  if (fixture.expect?.gapFlagClosed !== "systemsSplitIncomplete") {
    errors.push("parity gapFlagClosed mismatch");
  }
  if (fixture.expect?.systemsFacadeMaxLines !== 4700) {
    errors.push("parity systemsFacadeMaxLines must be 4700");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("systemssplit1:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK systemssplit1:validate — systems.ts fishing/production/movement extracted + bridge bound",
);
