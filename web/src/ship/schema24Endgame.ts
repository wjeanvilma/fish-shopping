/**
 * Finish 3.0 Phase 15 — schema 24 + endgame deepen
 * (mirrors shared/ship/schema-24-endgame.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/schema-24-endgame.json";
import { SCHEMA_VERSION, loadContent } from "../engine";

export interface Schema24EndgameCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  schema24EndgameMarker: string;
  tierCount: number;
  challengeCount: number;
  tierIds: string[];
  challengeIds: string[];
  stats: string[];
  authorTool: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const SCHEMA_24_ENDGAME = catalogJson as unknown as Schema24EndgameCatalog;
export const SCHEMA_24_ENDGAME_PHASE = SCHEMA_24_ENDGAME.phase;
export const SCHEMA_24_ENDGAME_SCHEMA = SCHEMA_24_ENDGAME.schema;
export const SCHEMA_24_ENDGAME_MARKER = SCHEMA_24_ENDGAME.schema24EndgameMarker;
export const SCHEMA_24_VERSION = SCHEMA_24_ENDGAME.schemaVersion;
export const SCHEMA_24_TIER_COUNT = SCHEMA_24_ENDGAME.tierCount;
export const SCHEMA_24_CHALLENGE_COUNT = SCHEMA_24_ENDGAME.challengeCount;

export interface Schema24EndgameMeasure {
  schemaVersion: number;
  tierCount: number;
  challengeCount: number;
  tiersPresent: boolean;
  challengesPresent: boolean;
  statsWiredTs: boolean;
  statsWiredKt: boolean;
  systemMarkersTs: boolean;
  systemMarkersKt: boolean;
  codecMarkersTs: boolean;
  codecMarkersKt: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  missingGates: string[];
  missingTiers: string[];
  missingChallenges: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSchema24Endgame(repoRoot: string): Schema24EndgameMeasure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const missingTiers = SCHEMA_24_ENDGAME.tierIds.filter((id) => !content.endgameTiersById.has(id));
  const missingChallenges = SCHEMA_24_ENDGAME.challengeIds.filter(
    (id) => !content.endgameChallengesById.has(id),
  );

  const tsSystems = existsSync(resolve(repoRoot, "web/src/engine/systems.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/systems.ts"), "utf8")
    : "";
  const ktSystems = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/EndgameSystem.kt"),
  )
    ? readFileSync(
        resolve(
          repoRoot,
          "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/EndgameSystem.kt",
        ),
        "utf8",
      )
    : "";
  const snapshotTs = readFileSync(resolve(repoRoot, "web/src/engine/snapshot.ts"), "utf8");
  const codecKt = readFileSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/persistence/SnapshotCodec.kt"),
    "utf8",
  );
  const tsStats = readFileSync(resolve(repoRoot, "web/src/engine/state.ts"), "utf8");
  const ktStats = readFileSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt"),
    "utf8",
  );

  const systemMarkers = ["boardUnlocked", "tierRequirementsMet", "applyTierReward"];
  const codecMarkers = ["beatenRivalIds", "unlockedEndgameTiers", "completedEndgameChallenges", "version >= 24"];

  let kickoffWired = false;
  let measuredAtPhase = -1;
  const kickoffPath = resolve(repoRoot, SCHEMA_24_ENDGAME.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    const phase15 = (kickoff.phases as any[])?.find((p) => p.phase === 15);
    kickoffWired =
      phase15?.id === "schema-24-endgame" &&
      phase15?.validate === "schema24:validate" &&
      measuredAtPhase >= 15 &&
      (kickoff.schemaVersion ?? 0) >= 24;
  }

  const missingGates: string[] = [];
  for (const gate of SCHEMA_24_ENDGAME.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    tierCount: content.endgame.tiers.length,
    challengeCount: content.endgame.challenges.length,
    tiersPresent: missingTiers.length === 0,
    challengesPresent: missingChallenges.length === 0,
    statsWiredTs: SCHEMA_24_ENDGAME.stats.every((s) => tsStats.includes(s)),
    statsWiredKt: SCHEMA_24_ENDGAME.stats.every((s) => ktStats.includes(s)),
    systemMarkersTs: systemMarkers.every((m) => tsSystems.includes(m)),
    systemMarkersKt: systemMarkers.every((m) => ktSystems.includes(m)),
    codecMarkersTs: codecMarkers.every((m) => snapshotTs.includes(m)),
    codecMarkersKt: codecMarkers.every((m) => codecKt.includes(m)),
    kickoffWired,
    measuredAtPhase,
    missingGates,
    missingTiers,
    missingChallenges,
  };
}
