/**
 * Finish 4.0 Phase 3 — systems.ts customers/contracts/progression split readiness.
 *
 * Usage:
 *   npm run systemssplit2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  measureSystemsSplit2,
  SYSTEMS_SPLIT_2,
  SYSTEMS_SPLIT_2_MARKER,
  SYSTEMS_SPLIT_2_PHASE,
  SYSTEMS_SPLIT_2_SCHEMA,
} from "../src/ship/systemsSplit2";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/systems-split-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-systems-split-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/SystemsSplit2.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 3) errors.push(`phase expected 3, got ${catalog.phase}`);
  if (catalog.schema !== SYSTEMS_SPLIT_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (SYSTEMS_SPLIT_2_PHASE !== 3) errors.push("phase mirror mismatch");
  if (catalog.systemsSplit2Marker !== SYSTEMS_SPLIT_2_MARKER) errors.push("marker mismatch");
  if (fixture.systemsSplit2Marker !== SYSTEMS_SPLIT_2_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.systemsFacadeMaxLines !== 3800) errors.push("systemsFacadeMaxLines must be 3800");
  if (catalog.extractedFileMin !== 8) errors.push("extractedFileMin must be 8");
  if ((catalog.requiredFiles as string[]).length !== 3) {
    errors.push("requiredFiles must list 3 Phase 3 modules");
  }

  const measure = measureSystemsSplit2(root);
  if (!measure.facadeSlim) {
    errors.push(
      `systems.ts has ${measure.facadeLines} lines (max ${catalog.systemsFacadeMaxLines})`,
    );
  }
  if (measure.facadeLines >= 4627) {
    errors.push(`systems.ts did not shrink below Phase 2 size (${measure.facadeLines})`);
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted systems modules ${measure.extractedTsFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing systems file ${f}`);
  for (const f of measure.missingPriorFiles) errors.push(`missing Phase 2 systems file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  for (const d of measure.facadeStillDefines) {
    errors.push(`systems.ts still defines ${d}`);
  }
  for (const r of measure.facadeMissingReexports) {
    errors.push(`systems.ts missing re-export/symbol ${r}`);
  }
  for (const c of measure.circularImports) {
    errors.push(`${c} must not import ../systems (use bridge or sibling modules)`);
  }
  if (!measure.bridgeBound) errors.push("systems.ts must call bindSystemsBridge");

  const phase3 = (kickoff.phases as any[])?.find((p) => p.phase === 3);
  if (!phase3) errors.push("kickoff missing phase 3");
  else if (phase3.validate !== "systemssplit2:validate") {
    errors.push("kickoff phase 3 validate must be systemssplit2:validate");
  }
  if (phase3?.id !== "systems-split-2") errors.push("kickoff phase 3 id must be systems-split-2");

  if (listing.systemsSplit2Phase !== 3) errors.push("listing.systemsSplit2Phase must be 3");
  if (listing.systemsSplit2Catalog !== "shared/ship/systems-split-2.json") {
    errors.push("listing.systemsSplit2Catalog mismatch");
  }
  if (pin.systemsSplit2 !== "shared/ship/systems-split-2.json") {
    errors.push("RELEASE_PIN.systemsSplit2 path missing");
  }
  if (!pin.fixtures?.includes("parity-systems-split-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-systems-split-2.json");
  }

  const block = dod.systemsSplit2;
  if (!block) errors.push("DoD missing systemsSplit2 block");
  else {
    if (block.phase !== 3) errors.push("DoD systemsSplit2.phase must be 3");
    if (block.plan !== "30_finish_4.0") errors.push("DoD systemsSplit2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD systemsSplit2.status must be complete");
    if (block.systemsSplit2Marker !== SYSTEMS_SPLIT_2_MARKER) {
      errors.push("DoD systemsSplit2 marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["systemssplit2:validate"]) {
    errors.push("package.json missing systemssplit2:validate");
  }
  if (!ci.includes("systemssplit2:validate")) errors.push("ci.yml missing systemssplit2:validate");
  if (!kotlin.includes("SYSTEMS_FACADE_MAX_LINES")) {
    errors.push("Kotlin SystemsSplit2 missing SYSTEMS_FACADE_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin SystemsSplit2 missing REQUIRED_FILES");
  }

  // Phase 3 modules should use bridge and/or sibling progression (not facade).
  for (const name of ["customers.ts", "contracts.ts", "progression.ts"]) {
    const body = readFileSync(resolve(root, catalog.systemsPackageRoot, name), "utf8");
    if (name === "progression.ts") {
      if (!body.includes("systemsBridge")) {
        errors.push(`${name} must use systemsBridge for PlotSystem deps`);
      }
    } else if (!body.includes("systemsBridge")) {
      errors.push(`${name} must use systemsBridge for host-system deps`);
    }
  }

  if (fixture.expect?.requiredFileCount !== 3) {
    errors.push("parity requiredFileCount must be 3");
  }
  if (fixture.expect?.systemsFacadeMaxLines !== 3800) {
    errors.push("parity systemsFacadeMaxLines must be 3800");
  }
  if (fixture.expect?.extractedFileMin !== 8) {
    errors.push("parity extractedFileMin must be 8");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("systemssplit2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK systemssplit2:validate — systems.ts customers/contracts/progression extracted + bridge extended",
);
