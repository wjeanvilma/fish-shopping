/**
 * Finish 2.0 Phase 26 — Firestore rules snippet + cloud QA harness readiness.
 *
 * Usage:
 *   npm run firestoreqa:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  CLOUD_QA_SCENARIO_IDS,
  cloudQaFailures,
  runCloudQaHarness,
} from "../src/cloud/cloudQaHarness";
import { CLOUD_PRODUCTION_PATH, cloudProductionReadiness } from "../src/cloud/cloudProductionPath";
import {
  FIRESTORE_QA_SCENARIO_FLOOR,
  FIRESTORE_RULES_SNIPPET,
  FIRESTORE_RULES_SNIPPET_MARKER,
  FIRESTORE_RULES_SNIPPET_PHASE,
  FIRESTORE_RULES_SNIPPET_SCHEMA,
  FIRESTORE_SNIPPET_MODE,
  FIRESTORE_SNIPPET_PATH,
} from "../src/ship/firestoreRulesSnippet";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/firestore-rules-snippet.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-firestore-rules-snippet.json"));
  const production = readJson(resolve(root, "shared/cloud/production-path.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const snippetPath = resolve(root, catalog.snippetPath as string);
  const snippetText = existsSync(snippetPath) ? readFileSync(snippetPath, "utf8") : "";

  if (catalog.phase !== 26) errors.push(`phase expected 26, got ${catalog.phase}`);
  if (catalog.schema !== FIRESTORE_RULES_SNIPPET_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (FIRESTORE_RULES_SNIPPET_PHASE !== 26) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.firestoreSnippetMarker !== FIRESTORE_RULES_SNIPPET_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.firestoreSnippetMarker !== FIRESTORE_RULES_SNIPPET_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.snippetPath !== FIRESTORE_SNIPPET_PATH) errors.push("snippetPath mirror mismatch");
  if (catalog.snippetMode !== FIRESTORE_SNIPPET_MODE) errors.push("snippetMode mismatch");
  if (catalog.qaScenarioMin !== 4 || FIRESTORE_QA_SCENARIO_FLOOR !== 4) {
    errors.push("qaScenarioMin must be 4");
  }
  if (catalog.documentPath !== "users/{uid}/saves/harbor") errors.push("documentPath mismatch");
  if (JSON.stringify(catalog.documentFields) !== JSON.stringify(["snapshot", "savedAtEpochMs", "checksum"])) {
    errors.push("documentFields mismatch");
  }

  if (!existsSync(snippetPath)) errors.push(`missing snippet ${catalog.snippetPath}`);
  for (const needle of fixture.expect.snippetMustContain as string[]) {
    if (!snippetText.includes(needle)) errors.push(`snippet missing "${needle}"`);
  }
  for (const forbidden of [
    ...(catalog.forbiddenDeployablePaths as string[]),
    ...(fixture.expect.forbiddenPaths as string[]),
  ]) {
    if (existsSync(resolve(root, forbidden))) {
      errors.push(`deployable rules must not exist in repo: ${forbidden}`);
    }
  }

  if (production.firestoreRules !== catalog.snippetPath) {
    errors.push("production-path.firestoreRules must point at snippet");
  }
  if (production.firestoreRulesSnippet !== catalog.snippetPath) {
    errors.push("production-path.firestoreRulesSnippet mismatch");
  }
  if (production.firestoreRulesMode !== "snippet_only_not_deployed") {
    errors.push("production-path.firestoreRulesMode must be snippet_only_not_deployed");
  }
  if (production.finish2FirestoreSnippetPhase !== 26) {
    errors.push("production-path.finish2FirestoreSnippetPhase must be 26");
  }
  if (production.phase !== 25) errors.push("production-path phase must stay 25 (post-1.0 cutover)");
  if (CLOUD_PRODUCTION_PATH.firestoreRules !== catalog.snippetPath) {
    errors.push("runtime CLOUD_PRODUCTION_PATH.firestoreRules drift");
  }
  for (const key of fixture.expect.productionPathKeys as string[]) {
    if (production[key] == null) errors.push(`production-path missing ${key}`);
  }

  const readiness = cloudProductionReadiness({});
  if (readiness.firestoreRulesInRepo) {
    errors.push("firestoreRulesInRepo must stay false (snippet-only, no deployable rules)");
  }
  if (!readiness.firestoreRulesSnippetShipped) {
    errors.push("firestoreRulesSnippetShipped must be true");
  }

  if (CLOUD_QA_SCENARIO_IDS.length < FIRESTORE_QA_SCENARIO_FLOOR) {
    errors.push(`QA scenarios ${CLOUD_QA_SCENARIO_IDS.length} < ${FIRESTORE_QA_SCENARIO_FLOOR}`);
  }
  for (const id of fixture.expect.qaScenarioIds as string[]) {
    if (!(CLOUD_QA_SCENARIO_IDS as readonly string[]).includes(id)) {
      errors.push(`missing QA scenario ${id}`);
    }
  }
  const qaResults = await runCloudQaHarness();
  for (const fail of cloudQaFailures(qaResults)) {
    errors.push(`QA ${fail.id}: ${fail.detail}`);
  }

  if ((dod.quotas?.cloudQaScenarios ?? 0) < 4) {
    errors.push("DoD quotas.cloudQaScenarios must be ≥ 4");
  }
  if (listing.firestoreRulesSnippetPhase !== 26) {
    errors.push("listing.firestoreRulesSnippetPhase must be 26");
  }
  if (listing.firestoreRulesSnippetCatalog !== "shared/ship/firestore-rules-snippet.json") {
    errors.push("listing.firestoreRulesSnippetCatalog mismatch");
  }
  if (!ci.includes("firestoreqa:validate")) errors.push("ci.yml missing firestoreqa:validate");
  if (!ci.includes("cloud:validate")) errors.push("ci.yml missing baseline cloud:validate");
  if (!pin.fixtures?.includes("parity-firestore-rules-snippet.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-firestore-rules-snippet.json");
  }
  if (pin.firestoreRulesSnippet !== "shared/ship/firestore-rules-snippet.json") {
    errors.push("RELEASE_PIN.firestoreRulesSnippet path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (!pkg.scripts?.["firestoreqa:validate"]) {
    errors.push("web/package.json missing firestoreqa:validate");
  }
  if (FIRESTORE_RULES_SNIPPET.parityFixture !== "shared/fixtures/parity-firestore-rules-snippet.json") {
    errors.push("parityFixture path mismatch");
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("firestoreqa:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK firestoreqa:validate — rules snippet + conflict/offline QA harness");
