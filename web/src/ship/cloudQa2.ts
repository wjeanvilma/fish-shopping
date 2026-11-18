/**
 * Finish 3.0 Phase 17 — cloud production QA harness 2
 * (mirrors shared/ship/cloud-qa-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/cloud-qa-2.json";
import {
  CLOUD_QA_2_SCENARIO_IDS,
  CLOUD_QA_BASELINE_SCENARIO_IDS,
  CLOUD_QA_SCENARIO_IDS,
} from "../cloud/cloudQaHarness";
import { SCHEMA_VERSION } from "../engine";

export interface CloudQa2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  cloudQa2Marker: string;
  priorFirestoreQaPhase: number;
  priorHarnessModule: string;
  qaScenarioMin: number;
  qaScenarioTotalMin: number;
  baselineScenarioCount: number;
  wave2ScenarioCount: number;
  wave2ScenarioIds: string[];
  productionPathCatalog: string;
  snippetPath: string;
  snippetMode: string;
  forbiddenDeployablePaths: string[];
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const CLOUD_QA_2 = catalogJson as unknown as CloudQa2Catalog;
export const CLOUD_QA_2_PHASE = CLOUD_QA_2.phase;
export const CLOUD_QA_2_SCHEMA = CLOUD_QA_2.schema;
export const CLOUD_QA_2_MARKER = CLOUD_QA_2.cloudQa2Marker;
export const CLOUD_QA_2_SCENARIO_FLOOR = CLOUD_QA_2.qaScenarioMin;
export const CLOUD_QA_2_TOTAL_FLOOR = CLOUD_QA_2.qaScenarioTotalMin;

export interface CloudQa2Measure {
  schemaVersion: number;
  wave2Count: number;
  totalCount: number;
  wave2Complete: boolean;
  totalComplete: boolean;
  missingWave2: string[];
  harnessSymbols: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  snippetOnly: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureCloudQa2(repoRoot: string): CloudQa2Measure {
  const missingWave2 = CLOUD_QA_2.wave2ScenarioIds.filter(
    (id) => !(CLOUD_QA_2_SCENARIO_IDS as readonly string[]).includes(id),
  );
  const harness = existsSync(resolve(repoRoot, CLOUD_QA_2.priorHarnessModule))
    ? readFileSync(resolve(repoRoot, CLOUD_QA_2.priorHarnessModule), "utf8")
    : "";
  const harnessSymbols = [
    "CLOUD_QA_2_SCENARIO_IDS",
    "runCloudQa2Harness",
    "schema24_snapshot_roundtrip",
    "push_unavailable_queues",
    "guest_uid_preserved_on_ensure",
  ].every((s) => harness.includes(s));

  let measuredAtPhase = -1;
  let kickoffWired = false;
  try {
    const kickoff = readJson(resolve(repoRoot, CLOUD_QA_2.kickoffCatalog));
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
    kickoffWired =
      measuredAtPhase >= 17 &&
      phase17?.id === "cloud-qa-2" &&
      phase17?.validate === "cloudqa2:validate";
  } catch {
    kickoffWired = false;
  }

  const production = existsSync(resolve(repoRoot, CLOUD_QA_2.productionPathCatalog))
    ? readJson(resolve(repoRoot, CLOUD_QA_2.productionPathCatalog))
    : {};
  const snippetOnly =
    production.firestoreRulesMode === "snippet_only_not_deployed" &&
    !existsSync(resolve(repoRoot, "firestore.rules")) &&
    !existsSync(resolve(repoRoot, "firebase/firestore.rules"));

  const missingGates = CLOUD_QA_2.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    wave2Count: CLOUD_QA_2_SCENARIO_IDS.length,
    totalCount: CLOUD_QA_SCENARIO_IDS.length,
    wave2Complete:
      missingWave2.length === 0 &&
      CLOUD_QA_2_SCENARIO_IDS.length >= CLOUD_QA_2_SCENARIO_FLOOR,
    totalComplete:
      CLOUD_QA_SCENARIO_IDS.length >= CLOUD_QA_2_TOTAL_FLOOR &&
      CLOUD_QA_BASELINE_SCENARIO_IDS.length >= CLOUD_QA_2.baselineScenarioCount,
    missingWave2,
    harnessSymbols,
    kickoffWired,
    measuredAtPhase,
    snippetOnly,
    missingGates,
  };
}
