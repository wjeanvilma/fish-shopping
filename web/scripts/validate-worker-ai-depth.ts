/**
 * Finish 3.0 Phase 11 — worker AI depth readiness.
 *
 * Usage:
 *   npm run workerai:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  measureWorkerAiDepth,
  WORKER_AI_DEPTH,
  WORKER_AI_DEPTH_MARKER,
  WORKER_AI_DEPTH_PHASE,
  WORKER_AI_DEPTH_SCHEMA,
} from "../src/ship/workerAiDepth";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/worker-ai-depth.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-worker-ai-depth.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/WorkerAiDepth.kt"),
    "utf8",
  );

  if (catalog.phase !== 11) errors.push(`phase expected 11, got ${catalog.phase}`);
  if (catalog.schema !== WORKER_AI_DEPTH_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (WORKER_AI_DEPTH_PHASE !== 11) errors.push("phase mirror mismatch");
  if (catalog.workerAiDepthMarker !== WORKER_AI_DEPTH_MARKER) errors.push("marker mismatch");
  if (fixture.workerAiDepthMarker !== WORKER_AI_DEPTH_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");

  if (catalog.depthBehaviors?.length !== 5) errors.push("depthBehaviors must list 5");
  if (catalog.depthStats?.length !== 3) errors.push("depthStats must list 3");

  const measure = measureWorkerAiDepth(root);
  if (measure.behaviorCount !== 5) errors.push(`behaviorCount ${measure.behaviorCount} ≠ 5`);
  if (measure.statCount !== 3) errors.push(`statCount ${measure.statCount} ≠ 3`);
  if (!measure.tsMarkersOk) {
    errors.push(`TS worker markers missing: ${measure.missingTsMarkers.join(", ")}`);
  }
  if (!measure.kotlinMarkersOk) {
    errors.push(`Kotlin worker markers missing: ${measure.missingKotlinMarkers.join(", ")}`);
  }
  if (!measure.tsStatsOk) errors.push("web Stats missing depth stats");
  if (!measure.kotlinStatsOk) errors.push("Kotlin Stats missing depth stats");
  if (!measure.branchesPresent) errors.push("staff-trees missing depth branch ids");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 11 must set validate=workerai:validate and measuredAtPhase≥11");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase11 = (kickoff.phases as any[])?.find((p) => p.phase === 11);
  if (!phase11) errors.push("kickoff missing phase 11");
  else if (phase11.validate !== "workerai:validate") {
    errors.push("kickoff phase 11 validate must be workerai:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 11) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 11");
  }

  if (listing.workerAiDepthPhase !== 11) errors.push("listing.workerAiDepthPhase must be 11");
  if (listing.workerAiDepthCatalog !== "shared/ship/worker-ai-depth.json") {
    errors.push("listing.workerAiDepthCatalog mismatch");
  }
  if (pin.workerAiDepth !== "shared/ship/worker-ai-depth.json") {
    errors.push("RELEASE_PIN.workerAiDepth path missing");
  }
  if (!pin.fixtures?.includes("parity-worker-ai-depth.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-worker-ai-depth.json");
  }

  const block = dod.workerAiDepth;
  if (!block) errors.push("DoD missing workerAiDepth block");
  else {
    if (block.phase !== 11) errors.push("DoD workerAiDepth.phase must be 11");
    if (block.plan !== "30_finish_3.0") errors.push("DoD workerAiDepth.plan mismatch");
    if (block.status !== "complete") errors.push("DoD workerAiDepth.status must be complete");
    if (block.workerAiDepthMarker !== WORKER_AI_DEPTH_MARKER) {
      errors.push("DoD workerAiDepth marker mismatch");
    }
  }

  if (!pkg.scripts?.["workerai:validate"]) {
    errors.push("package.json missing workerai:validate");
  }
  if (!ci.includes("workerai:validate")) errors.push("ci.yml missing workerai:validate");
  if (!kotlin.includes("DEPTH_BRANCH_IDS")) {
    errors.push("Kotlin WorkerAiDepth missing DEPTH_BRANCH_IDS");
  }
  if (!kotlin.includes("DEPTH_STATS")) {
    errors.push("Kotlin WorkerAiDepth missing DEPTH_STATS");
  }

  if (fixture.expect?.depthBehaviorCount !== 5) {
    errors.push("parity depthBehaviorCount must be 5");
  }
  if (fixture.expect?.depthStatCount !== 3) {
    errors.push("parity depthStatCount must be 3");
  }

  for (const path of [
    WORKER_AI_DEPTH.webWorkersPath,
    WORKER_AI_DEPTH.kotlinWorkersPath,
    WORKER_AI_DEPTH.webStatsPath,
    WORKER_AI_DEPTH.kotlinStatsPath,
  ]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing ${path}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("workerai:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK workerai:validate — worker AI depth for Phase 10 roles wired");
