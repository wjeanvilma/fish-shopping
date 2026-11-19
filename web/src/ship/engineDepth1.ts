/**
 * Finish 5.0 Phase 2 — engine depth 1 (fishing/mastery/spoilage)
 * (mirrors shared/ship/engine-depth-1.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/engine-depth-1.json";
import { CastPhases } from "../engine/systems/castPhases";

export interface EngineDepth1Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  engineDepth1Marker: string;
  castPhases: string[];
  castPhaseMin: number;
  requiredStats: string[];
  requiredEvents: string[];
  viewFields: string[];
  strikeXpPerfectPermille: number;
  strikeXpGoodPermille: number;
  waitingEndPermille: number;
  strikeEndPermille: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const ENGINE_DEPTH_1 = catalogJson as unknown as EngineDepth1Catalog;
export const ENGINE_DEPTH_1_PHASE = ENGINE_DEPTH_1.phase;
export const ENGINE_DEPTH_1_SCHEMA = ENGINE_DEPTH_1.schema;
export const ENGINE_DEPTH_1_MARKER = ENGINE_DEPTH_1.engineDepth1Marker;

export interface EngineDepth1Measure {
  castPhaseCount: number;
  castPhasesPresent: boolean;
  statsPresent: boolean;
  eventsPresent: boolean;
  viewFieldsPresent: boolean;
  strikeXpMatches: boolean;
  castBandMatches: boolean;
  kickoffWired: boolean;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureEngineDepth1(repoRoot: string): EngineDepth1Measure {
  const fishingTs = existsSync(resolve(repoRoot, "web/src/engine/systems/fishing.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems/fishing.ts"), "utf8")
    : "";
  const castTs = existsSync(resolve(repoRoot, "web/src/engine/systems/castPhases.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems/castPhases.ts"), "utf8")
    : "";
  const stateTs = existsSync(resolve(repoRoot, "web/src/engine/state.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/state.ts"), "utf8")
    : "";
  const viewTs = existsSync(resolve(repoRoot, "web/src/engine/view.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/view.ts"), "utf8")
    : "";
  const systemsTs = existsSync(resolve(repoRoot, "web/src/engine/systems.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems.ts"), "utf8")
    : "";
  const fishingKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/fishing/FishingSystem.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/fishing/FishingSystem.kt"),
      "utf8",
    )
    : "";
  const castKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/fishing/CastPhases.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/fishing/CastPhases.kt"),
      "utf8",
    )
    : "";
  const economyKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/economy/Economy.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/economy/Economy.kt"),
      "utf8",
    )
    : "";
  const viewKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt"),
      "utf8",
    )
    : "";
  const gameStateKt = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt"),
      "utf8",
    )
    : "";

  const kickoff = readJson(resolve(repoRoot, ENGINE_DEPTH_1.kickoffCatalog));
  const phase2 = (kickoff.phases as any[])?.find((p) => p.phase === 2);

  const missingGates: string[] = [];
  for (const gate of ENGINE_DEPTH_1.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const statsPresent = ENGINE_DEPTH_1.requiredStats.every(
    (id) => stateTs.includes(id) && gameStateKt.includes(id),
  );
  const eventsPresent = ENGINE_DEPTH_1.requiredEvents.every(
    (ev) =>
      (stateTs.includes(`"${ev}"`) || stateTs.includes(`type: "${ev}"`)) &&
      (gameStateKt.includes("CastPhaseChanged") || fishingKt.includes("CastPhaseChanged")) &&
      (gameStateKt.includes("CastStrikeReel") || fishingKt.includes("CastStrikeReel")),
  );

  return {
    castPhaseCount: ENGINE_DEPTH_1.castPhases.length,
    castPhasesPresent: ENGINE_DEPTH_1.castPhases.every(
      (p) => castTs.includes(`"${p}"`) && castKt.toUpperCase().includes(p.toUpperCase()),
    ),
    statsPresent,
    eventsPresent:
      eventsPresent &&
      fishingTs.includes("cast_phase_changed") &&
      fishingTs.includes("cast_strike_reel") &&
      fishingKt.includes("CastPhaseChanged") &&
      fishingKt.includes("CastStrikeReel"),
    viewFieldsPresent:
      ENGINE_DEPTH_1.viewFields.every((f) => viewTs.includes(f) && viewKt.includes(f)) &&
      systemsTs.includes("bagSpoilPressurePermille") &&
      systemsTs.includes("ticksUntilBagSpoil") &&
      economyKt.includes("bagSpoilPressurePermille") &&
      economyKt.includes("ticksUntilBagSpoil"),
    strikeXpMatches:
      CastPhases.strikeXpMultPermille("strike", "perfect") === ENGINE_DEPTH_1.strikeXpPerfectPermille &&
      CastPhases.strikeXpMultPermille("strike", "good") === ENGINE_DEPTH_1.strikeXpGoodPermille &&
      castKt.includes(String(ENGINE_DEPTH_1.strikeXpPerfectPermille)) &&
      castKt.includes(String(ENGINE_DEPTH_1.strikeXpGoodPermille)),
    castBandMatches:
      CastPhases.WAITING_END_PERMILLE === ENGINE_DEPTH_1.waitingEndPermille &&
      CastPhases.STRIKE_END_PERMILLE === ENGINE_DEPTH_1.strikeEndPermille,
    kickoffWired:
      phase2?.id === "engine-depth-1" && phase2?.validate === "enginedepth1:validate",
    gapClosed: kickoff.gaps?.engineDepthIncomplete === false,
    missingGates,
  };
}
