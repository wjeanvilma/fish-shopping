/**
 * Finish 3.0 Phase 17 — cloud production QA harness 2 readiness.
 *
 * Usage:
 *   npm run cloudqa2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  CLOUD_QA_2_SCENARIO_IDS,
  CLOUD_QA_BASELINE_SCENARIO_IDS,
  CLOUD_QA_SCENARIO_IDS,
  cloudQaFailures,
  runCloudQa2Harness,
  runCloudQaHarness,
} from "../src/cloud/cloudQaHarness";
import {
  CLOUD_QA_2,
  CLOUD_QA_2_MARKER,
  CLOUD_QA_2_PHASE,
  CLOUD_QA_2_SCHEMA,
  CLOUD_QA_2_SCENARIO_FLOOR,
  CLOUD_QA_2_TOTAL_FLOOR,
  measureCloudQa2,
} from "../src/ship/cloudQa2";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/cloud-qa-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-cloud-qa-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const production = readJson(resolve(root, "shared/cloud/production-path.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/CloudQa2.kt"),
    "utf8",
  );

  if (catalog.phase !== 17) errors.push(`phase expected 17, got ${catalog.phase}`);
  if (catalog.schema !== CLOUD_QA_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (CLOUD_QA_2_PHASE !== 17) errors.push("phase mirror mismatch");
  if (catalog.cloudQa2Marker !== CLOUD_QA_2_MARKER) errors.push("marker mismatch");
  if (fixture.cloudQa2Marker !== CLOUD_QA_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.qaScenarioMin !== 8 || CLOUD_QA_2_SCENARIO_FLOOR !== 8) {
    errors.push("qaScenarioMin must be 8");
  }
  if (catalog.qaScenarioTotalMin !== 12 || CLOUD_QA_2_TOTAL_FLOOR !== 12) {
    errors.push("qaScenarioTotalMin must be 12");
  }
  if (catalog.snippetMode !== "snippet_only_not_deployed") {
    errors.push("snippetMode must stay snippet_only_not_deployed");
  }

  const measure = measureCloudQa2(root);
  if (measure.schemaVersion !== 24) errors.push("measure schemaVersion must be 24");
  if (!measure.wave2Complete) {
    errors.push(`wave-2 incomplete: missing ${measure.missingWave2.join(", ") || "count"}`);
  }
  if (!measure.totalComplete) {
    errors.push(`total scenarios ${measure.totalCount} < ${CLOUD_QA_2_TOTAL_FLOOR}`);
  }
  if (!measure.harnessSymbols) errors.push("cloudQaHarness missing Phase 17 symbols");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 17 must set validate=cloudqa2:validate and measuredAtPhase≥17");
  }
  if (!measure.snippetOnly) errors.push("snippet-only rules mode broken (deployable rules present?)");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of fixture.expect.wave2ScenarioIds as string[]) {
    if (!(CLOUD_QA_2_SCENARIO_IDS as readonly string[]).includes(id)) {
      errors.push(`missing wave-2 QA scenario ${id}`);
    }
    if (!(catalog.wave2ScenarioIds as string[]).includes(id)) {
      errors.push(`catalog.wave2ScenarioIds missing ${id}`);
    }
  }
  for (const id of fixture.expect.baselineScenarioIds as string[]) {
    if (!(CLOUD_QA_BASELINE_SCENARIO_IDS as readonly string[]).includes(id)) {
      errors.push(`missing baseline QA scenario ${id}`);
    }
  }
  if (CLOUD_QA_SCENARIO_IDS.length < CLOUD_QA_2_TOTAL_FLOOR) {
    errors.push(`CLOUD_QA_SCENARIO_IDS length ${CLOUD_QA_SCENARIO_IDS.length} < ${CLOUD_QA_2_TOTAL_FLOOR}`);
  }

  const wave2Results = await runCloudQa2Harness();
  for (const fail of cloudQaFailures(wave2Results)) {
    errors.push(`QA2 ${fail.id}: ${fail.detail}`);
  }
  const allResults = await runCloudQaHarness();
  for (const fail of cloudQaFailures(allResults)) {
    errors.push(`QA ${fail.id}: ${fail.detail}`);
  }

  if (production.firestoreRulesMode !== "snippet_only_not_deployed") {
    errors.push("production-path.firestoreRulesMode must stay snippet_only_not_deployed");
  }
  if (!Array.isArray(production.cutoverChecklist) ||
    !production.cutoverChecklist.some((c: string) => c.includes("cloudqa2:validate"))) {
    errors.push("production-path.cutoverChecklist must mention cloudqa2:validate");
  }
  for (const forbidden of [
    ...(catalog.forbiddenDeployablePaths as string[]),
    ...(fixture.expect.forbiddenPaths as string[]),
  ]) {
    if (existsSync(resolve(root, forbidden))) {
      errors.push(`deployable rules must not exist in repo: ${forbidden}`);
    }
  }

  if (kickoff.baseline?.measuredAtPhase < 17) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 17");
  }
  const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
  if (!phase17 || phase17.validate !== "cloudqa2:validate") {
    errors.push("kickoff phase 17 validate must be cloudqa2:validate");
  }
  if (phase17?.id !== "cloud-qa-2") errors.push("kickoff phase 17 id must be cloud-qa-2");

  if (listing.cloudQa2Phase !== 17) errors.push("listing.cloudQa2Phase must be 17");
  if (listing.cloudQa2Catalog !== "shared/ship/cloud-qa-2.json") {
    errors.push("listing.cloudQa2Catalog mismatch");
  }
  if (pin.cloudQa2 !== "shared/ship/cloud-qa-2.json") {
    errors.push("RELEASE_PIN.cloudQa2 path missing");
  }
  if (!pin.fixtures?.includes("parity-cloud-qa-2.json")) {
    errors.push("RELEASE_PIN missing parity-cloud-qa-2.json");
  }

  const block = dod.cloudQa2;
  if (!block) errors.push("DoD missing cloudQa2 block");
  else {
    if (block.phase !== 17) errors.push("DoD cloudQa2.phase must be 17");
    if (block.plan !== "30_finish_3.0") errors.push("DoD cloudQa2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD cloudQa2.status must be complete");
    if (block.cloudQa2Marker !== CLOUD_QA_2_MARKER) errors.push("DoD cloudQa2 marker mismatch");
  }
  if ((dod.quotas?.cloudQaScenarios ?? 0) < 12) {
    errors.push("DoD quotas.cloudQaScenarios must be ≥ 12");
  }

  if (!pkg.scripts?.["cloudqa2:validate"]) errors.push("package.json missing cloudqa2:validate");
  if (!ci.includes("cloudqa2:validate")) errors.push("ci.yml missing cloudqa2:validate");
  if (!kotlin.includes("WAVE2_SCENARIO_IDS") || !kotlin.includes("QA_SCENARIO_MIN")) {
    errors.push("Kotlin CloudQa2 missing wave2 / floor constants");
  }

  if (fixture.expect?.schemaVersion !== 24) errors.push("parity expect.schemaVersion must be 24");
  if (fixture.expect?.contentVersion !== "2.0.0") errors.push("parity expect.contentVersion mismatch");

  for (const gate of CLOUD_QA_2.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("cloudqa2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK cloudqa2:validate — cloud production QA harness 2 locked (snippet-only)");
