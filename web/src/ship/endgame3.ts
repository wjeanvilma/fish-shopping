/**
 * Finish 5.0 Phase 17 — endgame deepen + schema 26
 * (mirrors shared/ship/endgame-3.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/endgame-3.json";
import { SCHEMA_VERSION, loadContent } from "../engine";

export interface Endgame3Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  endgame3Marker: string;
  tierCountMin: number;
  challengeCountMin: number;
  markCountMin: number;
  crestCountMin: number;
  tierIds: string[];
  challengeIds: string[];
  newTierIds: string[];
  newChallengeIds: string[];
  crestIds: string[];
  stats: string[];
  extendsEndgame2: string;
  schema26Prep: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  legacyFixture: string;
  checklist: string[];
  preflightGates: string[];
}

export const ENDGAME_3 = catalogJson as unknown as Endgame3Catalog;
export const ENDGAME_3_PHASE = ENDGAME_3.phase;
export const ENDGAME_3_SCHEMA = ENDGAME_3.schema;
export const ENDGAME_3_MARKER = ENDGAME_3.endgame3Marker;
export const ENDGAME_3_VERSION = ENDGAME_3.schemaVersion;

export interface Endgame3Measure {
  schemaVersion: number;
  tierCount: number;
  challengeCount: number;
  markDefs: number;
  crestDefs: number;
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

export function measureEndgame3(repoRoot: string): Endgame3Measure {
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

  const systemMarkers = ["endgameCrests", "requiresCrests", "grantsCrest", "tierRequirementsMet"];
  const codecMarkers = ["endgameCrests", "version >= 26"];

  let kickoffClosed = false;
  const kickoffPath = resolve(repoRoot, ENDGAME_3.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
    kickoffClosed =
      phase17?.id === "endgame-3" &&
      phase17?.validate === "endgame3:validate" &&
      kickoff.gaps?.endgameSchema26Pending === false &&
      (kickoff.schemaVersion ?? 0) >= 26 &&
      (kickoff.baseline?.schemaVersion ?? 0) >= 26;
  }

  let schemaPrepApplied = false;
  const prepPath = resolve(repoRoot, ENDGAME_3.schema26Prep);
  if (existsSync(prepPath)) {
    const prep = readJson(prepPath);
    schemaPrepApplied =
      prep.status === "applied" &&
      prep.currentSchemaVersion === 26 &&
      prep.targetSchemaVersion === 26 &&
      prep.ownedByPhase === 17;
  }

  const missingGates: string[] = [];
  for (const gate of ENDGAME_3.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const markDefs = content.endgame.challenges.filter((c) => !!c.grantsMark).length;
  const crestDefs = content.endgame.challenges.filter((c) => !!c.grantsCrest).length;

  return {
    schemaVersion: SCHEMA_VERSION,
    tierCount: content.endgame.tiers.length,
    challengeCount: content.endgame.challenges.length,
    markDefs,
    crestDefs,
    newTiersPresent: ENDGAME_3.newTierIds.every((id) => content.endgameTiersById.has(id)),
    newChallengesPresent: ENDGAME_3.newChallengeIds.every((id) =>
      content.endgameChallengesById.has(id),
    ),
    statsWiredTs: ENDGAME_3.stats.every((s) => tsStats.includes(s)),
    statsWiredKt: ENDGAME_3.stats.every((s) => ktStats.includes(s)),
    systemMarkersTs: systemMarkers.every((m) => tsSystems.includes(m)),
    systemMarkersKt: systemMarkers.every((m) => ktSystems.includes(m)),
    codecMarkersTs: codecMarkers.every((m) => snapshotTs.includes(m)),
    codecMarkersKt: codecMarkers.every((m) => codecKt.includes(m)),
    kickoffClosed,
    schemaPrepApplied,
    missingGates,
  };
}
