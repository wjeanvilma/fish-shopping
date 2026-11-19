/**
 * Finish 5.0 Phase 3 — engine depth 2 (customers/contracts/progression) readiness.
 *
 * Usage:
 *   npm run enginedepth2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  ENGINE_DEPTH_2,
  ENGINE_DEPTH_2_MARKER,
  ENGINE_DEPTH_2_PHASE,
  ENGINE_DEPTH_2_SCHEMA,
  measureEngineDepth2,
} from "../src/ship/engineDepth2";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/engine-depth-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-engine-depth-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/EngineDepth2.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 3) errors.push(`phase expected 3, got ${catalog.phase}`);
  if (catalog.schema !== ENGINE_DEPTH_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (ENGINE_DEPTH_2_PHASE !== 3) errors.push("phase mirror mismatch");
  if (catalog.engineDepth2Marker !== ENGINE_DEPTH_2_MARKER) errors.push("marker mismatch");
  if (fixture.engineDepth2Marker !== ENGINE_DEPTH_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureEngineDepth2(root);
  if (measure.viewFieldCount < ENGINE_DEPTH_2.viewFieldMin) {
    errors.push(`view fields ${measure.viewFieldCount} < ${ENGINE_DEPTH_2.viewFieldMin}`);
  }
  if (!measure.viewFieldsPresent) errors.push("view fields missing from TS/Kotlin SimView");
  if (!measure.coachingContextsPresent) errors.push("coaching tip strings missing TS/Kotlin");
  if (!measure.helpersPresent) errors.push("pressure/progress helpers missing web↔Kotlin");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 3 must set id=engine-depth-2 validate=enginedepth2:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase3 = (kickoff.phases as any[])?.find((p) => p.phase === 3);
  if (!phase3 || phase3.validate !== "enginedepth2:validate") {
    errors.push("kickoff phase 3 validate must be enginedepth2:validate");
  }
  if (phase3?.id !== "engine-depth-2") errors.push("kickoff phase 3 id must be engine-depth-2");

  if (listing.engineDepth2Phase !== 3) errors.push("listing.engineDepth2Phase must be 3");
  if (listing.engineDepth2Catalog !== "shared/ship/engine-depth-2.json") {
    errors.push("listing.engineDepth2Catalog mismatch");
  }
  if (pin.engineDepth2 !== "shared/ship/engine-depth-2.json") {
    errors.push("RELEASE_PIN.engineDepth2 path missing");
  }
  if (!pin.fixtures?.includes("parity-engine-depth-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-engine-depth-2.json");
  }

  const block = dod.engineDepth2;
  if (!block) errors.push("DoD missing engineDepth2 block");
  else {
    if (block.phase !== 3) errors.push("DoD engineDepth2.phase must be 3");
    if (block.plan !== "30_finish_5.0") errors.push("DoD engineDepth2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD engineDepth2.status must be complete");
    if (block.engineDepth2Marker !== ENGINE_DEPTH_2_MARKER) {
      errors.push("DoD engineDepth2 marker mismatch");
    }
  }

  if (!pkg.scripts?.["enginedepth2:validate"]) errors.push("package.json missing enginedepth2:validate");
  if (!ci.includes("enginedepth2:validate")) errors.push("ci.yml missing enginedepth2:validate");
  if (!kotlin.includes("VIEW_FIELDS")) errors.push("Kotlin EngineDepth2 missing VIEW_FIELDS");
  if (!kotlin.includes("COACHING_CONTEXTS")) errors.push("Kotlin EngineDepth2 missing COACHING_CONTEXTS");
  if (!finish5Kt.includes("enginedepth2:validate")) {
    errors.push("Finish5Kickoff.kt phase 3 missing enginedepth2:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_engine_depth_2.py"))) {
    errors.push("missing author_engine_depth_2.py");
  }

  if (fixture.expect?.viewFieldMin !== 5) errors.push("parity viewFieldMin must be 5");
  if (fixture.expect?.coachingContextMin !== 5) errors.push("parity coachingContextMin must be 5");
  if (catalog.queuePressureTipPermille !== 700) errors.push("queuePressureTipPermille must be 700");
  if (catalog.impatientPatienceMaxTicks !== 40) errors.push("impatientPatienceMaxTicks must be 40");
  if (catalog.contractDeadlineWarnTicks !== 200) errors.push("contractDeadlineWarnTicks must be 200");
  if (catalog.questNearCompletePermille !== 800) errors.push("questNearCompletePermille must be 800");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("enginedepth2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK enginedepth2:validate — customers/contracts/progression engine depth wired");
