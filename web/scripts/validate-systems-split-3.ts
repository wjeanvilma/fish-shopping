/**
 * Finish 6.0 Phase 4 — systems.ts rivals/economy/staffTrees/workers split readiness.
 *
 * Usage:
 *   npm run systemssplit3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureSystemsSplit3,
  SYSTEMS_SPLIT_3,
  SYSTEMS_SPLIT_3_MARKER,
  SYSTEMS_SPLIT_3_PHASE,
  SYSTEMS_SPLIT_3_SCHEMA,
} from "../src/ship/systemsSplit3";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/systems-split-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-systems-split-3.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/SystemsSplit3.kt",
    ),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 4) errors.push(`phase expected 4, got ${catalog.phase}`);
  if (catalog.schema !== SYSTEMS_SPLIT_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (SYSTEMS_SPLIT_3_PHASE !== 4) errors.push("phase mirror mismatch");
  if (catalog.systemsSplit3Marker !== SYSTEMS_SPLIT_3_MARKER) errors.push("marker mismatch");
  if (fixture.systemsSplit3Marker !== SYSTEMS_SPLIT_3_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.systemsFacadeMaxLines !== 2800) errors.push("systemsFacadeMaxLines must be 2800");
  if (catalog.extractedFileMin !== 12) errors.push("extractedFileMin must be 12");
  if ((catalog.requiredFiles as string[]).length !== 4) {
    errors.push("requiredFiles must list 4 Phase 4 modules");
  }
  if (catalog.closesGap !== "systemsSplit3Incomplete") {
    errors.push("closesGap must be systemsSplit3Incomplete");
  }

  const measure = measureSystemsSplit3(root);
  if (!measure.facadeSlim) {
    errors.push(
      `systems.ts has ${measure.facadeLines} lines (max ${catalog.systemsFacadeMaxLines})`,
    );
  }
  if (measure.facadeLines >= 3800) {
    errors.push(`systems.ts did not shrink below Phase 3 Finish-4 facade max (${measure.facadeLines})`);
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted systems modules ${measure.extractedTsFiles} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing systems file ${f}`);
  for (const f of measure.missingPriorFiles) errors.push(`missing prior systems file ${f}`);
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
  for (const m of measure.missingBridgeModules) {
    errors.push(`${m} must use systemsBridge for host-system deps`);
  }
  if (!measure.bridgeBound) errors.push("systems.ts must call bindSystemsBridge");
  if (!measure.gapClosed) errors.push("kickoff.gaps.systemsSplit3Incomplete must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 4 must set id=systems-split-3 validate=systemssplit3:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.systemsSplit3Incomplete !== false) {
    errors.push("kickoff gap systemsSplit3Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("systemsSplit3Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include systemsSplit3Incomplete after Phase 4");
  }

  const phase4 = (kickoff.phases as any[])?.find((p: any) => p.phase === 4);
  if (!phase4) errors.push("kickoff missing phase 4");
  else if (phase4.validate !== "systemssplit3:validate") {
    errors.push("kickoff phase 4 validate must be systemssplit3:validate");
  }
  if (phase4?.id !== "systems-split-3") errors.push("kickoff phase 4 id must be systems-split-3");

  if (listing.systemsSplit3Phase !== 4) errors.push("listing.systemsSplit3Phase must be 4");
  if (listing.systemsSplit3Catalog !== "shared/ship/systems-split-3.json") {
    errors.push("listing.systemsSplit3Catalog mismatch");
  }
  if (pin.systemsSplit3 !== "shared/ship/systems-split-3.json") {
    errors.push("RELEASE_PIN.systemsSplit3 path missing");
  }
  if (!pin.fixtures?.includes("parity-systems-split-3.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-systems-split-3.json");
  }

  const block = dod.systemsSplit3;
  if (!block) errors.push("DoD missing systemsSplit3 block");
  else {
    if (block.phase !== 4) errors.push("DoD systemsSplit3.phase must be 4");
    if (block.plan !== "30_finish_6.0") errors.push("DoD systemsSplit3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD systemsSplit3.status must be complete");
    if (block.systemsSplit3Marker !== SYSTEMS_SPLIT_3_MARKER) {
      errors.push("DoD systemsSplit3 marker mismatch");
    }
  }

  if (!pkg.scripts?.["systemssplit3:validate"]) {
    errors.push("package.json missing systemssplit3:validate");
  }
  if (!pkg.scripts?.["systemssplit3:smoke"]) {
    errors.push("package.json missing systemssplit3:smoke");
  }
  if (!ci.includes("systemssplit3:validate")) errors.push("ci.yml missing systemssplit3:validate");
  if (!ci.includes("systemssplit3:smoke")) errors.push("ci.yml missing systemssplit3:smoke");
  if (!kotlin.includes("SYSTEMS_FACADE_MAX_LINES")) {
    errors.push("Kotlin SystemsSplit3 missing SYSTEMS_FACADE_MAX_LINES");
  }
  if (!kotlin.includes("REQUIRED_FILES")) {
    errors.push("Kotlin SystemsSplit3 missing REQUIRED_FILES");
  }
  if (!finish6Kt.includes("systemssplit3:validate")) {
    errors.push("Finish6Kickoff.kt phase 4 missing systemssplit3:validate");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("fun score"),
  );
  if (openBlock.includes("systemsSplit3Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop systemsSplit3Incomplete");
  }

  if (fixture.expect?.requiredFileCount !== 4) {
    errors.push("parity requiredFileCount must be 4");
  }
  if (fixture.expect?.systemsFacadeMaxLines !== 2800) {
    errors.push("parity systemsFacadeMaxLines must be 2800");
  }
  if (fixture.expect?.extractedFileMin !== 12) {
    errors.push("parity extractedFileMin must be 12");
  }
  if (fixture.expect?.gapClosed !== "systemsSplit3Incomplete") {
    errors.push("parity gapClosed mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("systemssplit3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK systemssplit3:validate — systems.ts rivals/economy/staffTrees/workers extracted + systemsSplit3Incomplete closed",
);
