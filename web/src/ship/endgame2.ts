/**
 * Finish 4.0 Phase 17 — endgame deepen + schema 25
 * (mirrors shared/ship/endgame-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/endgame-2.json";
import { SCHEMA_VERSION, loadContent } from "../engine";

export interface Endgame2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  endgame2Marker: string;
  tierCountMin: number;
  challengeCountMin: number;
  markCountMin: number;
  tierIds: string[];
  challengeIds: string[];
  newTierIds: string[];
  newChallengeIds: string[];
  markIds: string[];
  stats: string[];
  extendsSchema24Endgame: string;
  schema25Prep: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  legacyFixture: string;
  checklist: string[];
  preflightGates: string[];
}

export const ENDGAME_2 = catalogJson as unknown as Endgame2Catalog;
export const ENDGAME_2_PHASE = ENDGAME_2.phase;
export const ENDGAME_2_SCHEMA = ENDGAME_2.schema;
export const ENDGAME_2_MARKER = ENDGAME_2.endgame2Marker;
export const ENDGAME_2_VERSION = ENDGAME_2.schemaVersion;

export interface Endgame2Measure {
  schemaVersion: number;
  tierCount: number;
  challengeCount: number;
  markDefs: number;
  newTiersPresent: boolean;
  newChallengesPresent: boolean;
  statsWiredTs: boolean;
  statsWiredKt: boolean;
  systemMarkersTs: boolean;
  systemMarkersKt: boolean;
  codecMarkersTs: boolean;
  codecMarkersKt: boolean;
  kickoffClosed: boolean;
  schemaPrepApplied: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureEndgame2(repoRoot: string): Endgame2Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);

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

  const systemMarkers = ["endgameMarks", "requiresMarks", "grantsMark", "tierRequirementsMet"];
  const codecMarkers = ["endgameMarks", "version >= 25"];

  let kickoffClosed = false;
  const kickoffPath = resolve(repoRoot, ENDGAME_2.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
    kickoffClosed =
      phase17?.id === "endgame-2" &&
      phase17?.validate === "endgame2:validate" &&
      kickoff.gaps?.endgameSchema25Pending === false &&
      (kickoff.schemaVersion ?? 0) >= 25 &&
      (kickoff.baseline?.schemaVersion ?? 0) >= 25;
  }

  let schemaPrepApplied = false;
  const prepPath = resolve(repoRoot, ENDGAME_2.schema25Prep);
  if (existsSync(prepPath)) {
    const prep = readJson(prepPath);
    schemaPrepApplied =
      prep.status === "applied" &&
      prep.currentSchemaVersion === 25 &&
      prep.targetSchemaVersion === 25 &&
      prep.ownedByPhase === 17;
  }

  const missingGates: string[] = [];
  for (const gate of ENDGAME_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const markDefs = content.endgame.challenges.filter((c) => !!c.grantsMark).length;

  return {
    schemaVersion: SCHEMA_VERSION,
    tierCount: content.endgame.tiers.length,
    challengeCount: content.endgame.challenges.length,
    markDefs,
    newTiersPresent: ENDGAME_2.newTierIds.every((id) => content.endgameTiersById.has(id)),
    newChallengesPresent: ENDGAME_2.newChallengeIds.every((id) =>
      content.endgameChallengesById.has(id),
    ),
    statsWiredTs: ENDGAME_2.stats.every((s) => tsStats.includes(s)),
    statsWiredKt: ENDGAME_2.stats.every((s) => ktStats.includes(s)),
    systemMarkersTs: systemMarkers.every((m) => tsSystems.includes(m)),
    systemMarkersKt: systemMarkers.every((m) => ktSystems.includes(m)),
    codecMarkersTs: codecMarkers.every((m) => snapshotTs.includes(m)),
    codecMarkersKt: codecMarkers.every((m) => codecKt.includes(m)),
    kickoffClosed,
    schemaPrepApplied,
    missingGates,
  };
}
