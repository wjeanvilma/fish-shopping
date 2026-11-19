/**
 * Finish 5.0 Phase 2 — engine depth 1 (fishing/mastery/spoilage) readiness.
 *
 * Usage:
 *   npm run enginedepth1:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  ENGINE_DEPTH_1,
  ENGINE_DEPTH_1_MARKER,
  ENGINE_DEPTH_1_PHASE,
  ENGINE_DEPTH_1_SCHEMA,
  measureEngineDepth1,
} from "../src/ship/engineDepth1";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/engine-depth-1.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-engine-depth-1.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/EngineDepth1.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 2) errors.push(`phase expected 2, got ${catalog.phase}`);
  if (catalog.schema !== ENGINE_DEPTH_1_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (ENGINE_DEPTH_1_PHASE !== 2) errors.push("phase mirror mismatch");
  if (catalog.engineDepth1Marker !== ENGINE_DEPTH_1_MARKER) errors.push("marker mismatch");
  if (fixture.engineDepth1Marker !== ENGINE_DEPTH_1_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureEngineDepth1(root);
  if (measure.castPhaseCount < ENGINE_DEPTH_1.castPhaseMin) {
    errors.push(`cast phases ${measure.castPhaseCount} < ${ENGINE_DEPTH_1.castPhaseMin}`);
  }
  if (!measure.castPhasesPresent) errors.push("cast phase ids missing from CastPhases mirrors");
  if (!measure.statsPresent) errors.push("cast stats missing from state/GameState");
  if (!measure.eventsPresent) errors.push("cast events missing from fishing/state/GameState");
  if (!measure.viewFieldsPresent) errors.push("view spoil/cast fields missing TS/Kotlin");
  if (!measure.strikeXpMatches) errors.push("strike XP multipliers mismatch catalog");
  if (!measure.castBandMatches) errors.push("cast band permille mismatch catalog");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 2 must set id=engine-depth-1 validate=enginedepth1:validate");
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.engineDepthIncomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase2 = (kickoff.phases as any[])?.find((p) => p.phase === 2);
  if (!phase2 || phase2.validate !== "enginedepth1:validate") {
    errors.push("kickoff phase 2 validate must be enginedepth1:validate");
  }
  if (phase2?.id !== "engine-depth-1") errors.push("kickoff phase 2 id must be engine-depth-1");
  if (kickoff.gaps?.engineDepthIncomplete !== false) {
    errors.push("kickoff gap engineDepthIncomplete must be false");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("engineDepthIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include engineDepthIncomplete after Phase 2");
  }

  if (listing.engineDepth1Phase !== 2) errors.push("listing.engineDepth1Phase must be 2");
  if (listing.engineDepth1Catalog !== "shared/ship/engine-depth-1.json") {
    errors.push("listing.engineDepth1Catalog mismatch");
  }
  if (pin.engineDepth1 !== "shared/ship/engine-depth-1.json") {
    errors.push("RELEASE_PIN.engineDepth1 path missing");
  }
  if (!pin.fixtures?.includes("parity-engine-depth-1.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-engine-depth-1.json");
  }

  const block = dod.engineDepth1;
  if (!block) errors.push("DoD missing engineDepth1 block");
  else {
    if (block.phase !== 2) errors.push("DoD engineDepth1.phase must be 2");
    if (block.plan !== "30_finish_5.0") errors.push("DoD engineDepth1.plan mismatch");
    if (block.status !== "complete") errors.push("DoD engineDepth1.status must be complete");
    if (block.engineDepth1Marker !== ENGINE_DEPTH_1_MARKER) {
      errors.push("DoD engineDepth1 marker mismatch");
    }
  }

  if (!pkg.scripts?.["enginedepth1:validate"]) errors.push("package.json missing enginedepth1:validate");
  if (!ci.includes("enginedepth1:validate")) errors.push("ci.yml missing enginedepth1:validate");
  if (!kotlin.includes("REQUIRED_STATS")) errors.push("Kotlin EngineDepth1 missing REQUIRED_STATS");
  if (!kotlin.includes("VIEW_FIELDS")) errors.push("Kotlin EngineDepth1 missing VIEW_FIELDS");
  if (!finish5Kt.includes("enginedepth1:validate")) {
    errors.push("Finish5Kickoff.kt phase 2 missing enginedepth1:validate");
  }
  if (finish5Kt.includes('"engineDepthIncomplete"') || finish5Kt.includes("\"engineDepthIncomplete\"")) {
    // OPEN_GAP_FLAGS list should no longer include the closed flag.
    const openBlock = finish5Kt.slice(
      finish5Kt.indexOf("OPEN_GAP_FLAGS"),
      finish5Kt.indexOf("fun score"),
    );
    if (openBlock.includes("engineDepthIncomplete")) {
      errors.push("Finish5Kickoff OPEN_GAP_FLAGS must drop engineDepthIncomplete");
    }
  }
  if (!existsSync(resolve(root, "shared/tools/author_engine_depth_1.py"))) {
    errors.push("missing author_engine_depth_1.py");
  }

  if (fixture.expect?.castPhaseMin !== 3) errors.push("parity castPhaseMin must be 3");
  if (fixture.expect?.viewFieldCount !== 5) errors.push("parity viewFieldCount must be 5");
  if (fixture.expect?.engineDepthIncomplete !== false) {
    errors.push("parity engineDepthIncomplete must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("enginedepth1:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK enginedepth1:validate — fishing/mastery/spoilage engine depth wired");
