/**
 * Finish 4.0 Phase 19 — staff/worker AI depth wave 2 readiness.
 *
 * Usage:
 *   npm run staffai2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  measureStaffAi2,
  STAFF_AI_2,
  STAFF_AI_2_MARKER,
  STAFF_AI_2_PHASE,
  STAFF_AI_2_SCHEMA,
} from "../src/ship/staffAi2";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/staff-ai-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-staff-ai-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const wave1 = readJson(resolve(root, "shared/ship/worker-ai-depth.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StaffAi2.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 19) errors.push(`phase expected 19, got ${catalog.phase}`);
  if (catalog.schema !== STAFF_AI_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (STAFF_AI_2_PHASE !== 19) errors.push("phase mirror mismatch");
  if (catalog.staffAi2Marker !== STAFF_AI_2_MARKER) errors.push("marker mismatch");
  if (fixture.staffAi2Marker !== STAFF_AI_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  if (catalog.depthBehaviors?.length !== 5) errors.push("depthBehaviors must list 5");
  if (catalog.depthStats?.length !== 3) errors.push("depthStats must list 3");
  if (catalog.decisionReasons?.length !== 5) errors.push("decisionReasons must list 5");

  const measure = measureStaffAi2(root);
  if (measure.behaviorCount !== 5) errors.push(`behaviorCount ${measure.behaviorCount} ≠ 5`);
  if (measure.statCount !== 3) errors.push(`statCount ${measure.statCount} ≠ 3`);
  if (measure.reasonCount !== 5) errors.push(`reasonCount ${measure.reasonCount} ≠ 5`);
  if (!measure.tsMarkersOk) {
    errors.push(`TS worker markers missing: ${measure.missingTsMarkers.join(", ")}`);
  }
  if (!measure.kotlinMarkersOk) {
    errors.push(`Kotlin worker markers missing: ${measure.missingKotlinMarkers.join(", ")}`);
  }
  if (!measure.tsStatsOk) errors.push("web Stats missing wave-2 depth stats");
  if (!measure.kotlinStatsOk) errors.push("Kotlin Stats missing wave-2 depth stats");
  if (!measure.branchesPresent) errors.push("staff-trees missing wave-2 branch ids");
  if (!measure.decisionReasonsPresent) {
    errors.push("decision reasons missing from TS/Kotlin worker AI");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 19 must set id=staff-ai-2 validate=staffai2:validate");
  }
  if (!measure.softWorkerAiPath) {
    errors.push("worker-ai-depth.kotlinWorkersPath must soft-floor to WorkerAi.kt");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase19 = (kickoff.phases as any[])?.find((p) => p.phase === 19);
  if (!phase19) errors.push("kickoff missing phase 19");
  else if (phase19.validate !== "staffai2:validate") {
    errors.push("kickoff phase 19 validate must be staffai2:validate");
  }
  if (phase19?.id !== "staff-ai-2") errors.push("kickoff phase 19 id must be staff-ai-2");

  if (listing.staffAi2Phase !== 19) errors.push("listing.staffAi2Phase must be 19");
  if (listing.staffAi2Catalog !== "shared/ship/staff-ai-2.json") {
    errors.push("listing.staffAi2Catalog mismatch");
  }
  if (pin.staffAi2 !== "shared/ship/staff-ai-2.json") {
    errors.push("RELEASE_PIN.staffAi2 path missing");
  }
  if (!pin.fixtures?.includes("parity-staff-ai-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-staff-ai-2.json");
  }

  const block = dod.staffAi2;
  if (!block) errors.push("DoD missing staffAi2 block");
  else {
    if (block.phase !== 19) errors.push("DoD staffAi2.phase must be 19");
    if (block.plan !== "30_finish_4.0") errors.push("DoD staffAi2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD staffAi2.status must be complete");
    if (block.staffAi2Marker !== STAFF_AI_2_MARKER) {
      errors.push("DoD staffAi2 marker mismatch");
    }
  }

  if (!pkg.scripts?.["staffai2:validate"]) {
    errors.push("package.json missing staffai2:validate");
  }
  if (!ci.includes("staffai2:validate")) errors.push("ci.yml missing staffai2:validate");
  if (!ci.includes("workerai:validate")) errors.push("ci.yml missing soft workerai:validate");
  if (!kotlin.includes("DEPTH_BRANCH_IDS")) {
    errors.push("Kotlin StaffAi2 missing DEPTH_BRANCH_IDS");
  }
  if (!kotlin.includes("DECISION_REASONS")) {
    errors.push("Kotlin StaffAi2 missing DECISION_REASONS");
  }
  if (!finish4Kt.includes("staffai2:validate")) {
    errors.push("Finish4Kickoff.kt phase 19 missing staffai2:validate");
  }

  if (!String(wave1.kotlinWorkersPath ?? "").includes("WorkerAi.kt")) {
    errors.push("soft-floor: worker-ai-depth.kotlinWorkersPath must point at WorkerAi.kt");
  }
  if (!(wave1.preflightGates as string[] | undefined)?.some((g) => g.includes("WorkerAi.kt"))) {
    errors.push("soft-floor: worker-ai-depth preflightGates must include WorkerAi.kt");
  }

  if (fixture.expect?.depthBehaviorCount !== 5) {
    errors.push("parity depthBehaviorCount must be 5");
  }
  if (fixture.expect?.depthStatCount !== 3) {
    errors.push("parity depthStatCount must be 3");
  }
  if (fixture.expect?.decisionReasonCount !== 5) {
    errors.push("parity decisionReasonCount must be 5");
  }

  for (const path of [
    STAFF_AI_2.webWorkersPath,
    STAFF_AI_2.kotlinWorkersPath,
    STAFF_AI_2.webStatsPath,
    STAFF_AI_2.kotlinStatsPath,
    STAFF_AI_2.authorTool,
  ]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing ${path}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("staffai2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK staffai2:validate — staff AI depth wave 2 wired");
