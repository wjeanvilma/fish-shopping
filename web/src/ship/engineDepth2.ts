/**
 * Finish 5.0 Phase 3 — engine depth 2 (customers/contracts/progression)
 * (mirrors shared/ship/engine-depth-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/engine-depth-2.json";

export interface EngineDepth2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  engineDepth2Marker: string;
  viewFields: string[];
  viewFieldMin: number;
  coachingContexts: string[];
  coachingContextMin: number;
  queuePressureTipPermille: number;
  impatientPatienceMaxTicks: number;
  contractDeadlineWarnTicks: number;
  questNearCompletePermille: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const ENGINE_DEPTH_2 = catalogJson as unknown as EngineDepth2Catalog;
export const ENGINE_DEPTH_2_PHASE = ENGINE_DEPTH_2.phase;
export const ENGINE_DEPTH_2_SCHEMA = ENGINE_DEPTH_2.schema;
export const ENGINE_DEPTH_2_MARKER = ENGINE_DEPTH_2.engineDepth2Marker;

export interface EngineDepth2Measure {
  viewFieldCount: number;
  viewFieldsPresent: boolean;
  coachingContextsPresent: boolean;
  helpersPresent: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureEngineDepth2(repoRoot: string): EngineDepth2Measure {
  const viewTs = existsSync(resolve(repoRoot, "web/src/engine/view.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/view.ts"), "utf8")
    : "";
  const viewKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt"),
      "utf8",
    )
    : "";
  const coachingTs = existsSync(resolve(repoRoot, "web/src/engine/coaching.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/coaching.ts"), "utf8")
    : "";
  const coachingKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Coaching.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Coaching.kt"),
      "utf8",
    )
    : "";
  const customersTs = existsSync(resolve(repoRoot, "web/src/engine/systems/customers.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems/customers.ts"), "utf8")
    : "";
  const contractsTs = existsSync(resolve(repoRoot, "web/src/engine/systems/contracts.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems/contracts.ts"), "utf8")
    : "";
  const progressionTs = existsSync(resolve(repoRoot, "web/src/engine/systems/progression.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems/progression.ts"), "utf8")
    : "";
  const customersKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/CustomerSystem.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/CustomerSystem.kt"),
      "utf8",
    )
    : "";
  const contractsKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/contracts/Contracts.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/contracts/Contracts.kt"),
      "utf8",
    )
    : "";
  const progressionKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/Progression.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/Progression.kt"),
      "utf8",
    )
    : "";

  const kickoff = readJson(resolve(repoRoot, ENGINE_DEPTH_2.kickoffCatalog));
  const phase3 = (kickoff.phases as any[])?.find((p) => p.phase === 3);

  const missingGates: string[] = [];
  for (const gate of ENGINE_DEPTH_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const tipSnippets = [
    "Rush hour is packing the line",
    "Front of the line is impatient",
    "Contract fail streak is cutting the Jobs board",
    "A harbor contract is almost due",
    "Quest nearly done",
  ];

  return {
    viewFieldCount: ENGINE_DEPTH_2.viewFields.length,
    viewFieldsPresent: ENGINE_DEPTH_2.viewFields.every(
      (f) => viewTs.includes(f) && viewKt.includes(f),
    ),
    coachingContextsPresent: tipSnippets.every(
      (s) => coachingTs.includes(s) && coachingKt.includes(s),
    ),
    helpersPresent:
      customersTs.includes("serviceQueuePressurePermille") &&
      customersTs.includes("minPatienceTicksLeft") &&
      customersKt.includes("serviceQueuePressurePermille") &&
      customersKt.includes("minPatienceTicksLeft") &&
      contractsTs.includes("ticksUntilNearestDeadline") &&
      contractsTs.includes("contractBoardPressurePermille") &&
      contractsKt.includes("ticksUntilNearestDeadline") &&
      contractsKt.includes("contractBoardPressurePermille") &&
      progressionTs.includes("nextQuestProgressPermille") &&
      progressionKt.includes("nextQuestProgressPermille"),
    kickoffWired:
      phase3?.id === "engine-depth-2" && phase3?.validate === "enginedepth2:validate",
    missingGates,
  };
}
