/**
 * Finish 6.0 Phase 14 — endgame deepen + schema 27
 * (mirrors shared/ship/endgame-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/endgame-4.json";
import { SCHEMA_VERSION, loadContent } from "../engine";

export interface Endgame4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  fromSchema: number;
  toSchema: number;
  endgame4Marker: string;
  tierCountMin: number;
  challengeCountMin: number;
  markCountMin: number;
  crestCountMin: number;
  sigilCountMin: number;
  tierIds: string[];
  challengeIds: string[];
  newTierIds: string[];
  newChallengeIds: string[];
  sigilIds: string[];
  stats: string[];
  extendsEndgame3: string;
  schema27Prep: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  legacyFixture: string;
  checklist: string[];
  preflightGates: string[];
}

export const ENDGAME_4 = catalogJson as unknown as Endgame4Catalog;
export const ENDGAME_4_PHASE = ENDGAME_4.phase;
export const ENDGAME_4_SCHEMA = ENDGAME_4.schema;
export const ENDGAME_4_MARKER = ENDGAME_4.endgame4Marker;
export const ENDGAME_4_VERSION = ENDGAME_4.schemaVersion;

export interface Endgame4Measure {
  schemaVersion: number;
  tierCount: number;
  challengeCount: number;
  markDefs: number;
  crestDefs: number;
  sigilDefs: number;
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

export function measureEndgame4(repoRoot: string): Endgame4Measure {
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

  const systemMarkers = ["endgameSigils", "requiresSigils", "grantsSigil", "tierRequirementsMet"];
  const codecMarkers = ["endgameSigils", "version >= 27"];

  let kickoffClosed = false;
  const kickoffPath = resolve(repoRoot, ENDGAME_4.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    const phase14 = (kickoff.phases as any[])?.find((p) => p.phase === 14);
    kickoffClosed =
      phase14?.id === "endgame-4" &&
      phase14?.validate === "endgame4:validate" &&
      kickoff.gaps?.endgameSchema27Pending === false &&
      (kickoff.schemaVersion ?? 0) >= 27 &&
      (kickoff.baseline?.schemaVersion ?? 0) >= 26;
  }

  let schemaPrepApplied = false;
  const prepPath = resolve(repoRoot, ENDGAME_4.schema27Prep);
  if (existsSync(prepPath)) {
    const prep = readJson(prepPath);
    schemaPrepApplied =
      prep.status === "applied" &&
      prep.currentSchemaVersion === 27 &&
      prep.targetSchemaVersion === 27 &&
      prep.ownedByPhase === 14;
  }

  const missingGates: string[] = [];
  for (const gate of ENDGAME_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const markDefs = content.endgame.challenges.filter((c) => !!c.grantsMark).length;
  const crestDefs = content.endgame.challenges.filter((c) => !!c.grantsCrest).length;
  const sigilDefs = content.endgame.challenges.filter((c) => !!c.grantsSigil).length;

  return {
    schemaVersion: SCHEMA_VERSION,
    tierCount: content.endgame.tiers.length,
    challengeCount: content.endgame.challenges.length,
    markDefs,
    crestDefs,
    sigilDefs,
    newTiersPresent: ENDGAME_4.newTierIds.every((id) => content.endgameTiersById.has(id)),
    newChallengesPresent: ENDGAME_4.newChallengeIds.every((id) =>
      content.endgameChallengesById.has(id),
    ),
    statsWiredTs: ENDGAME_4.stats.every((s) => tsStats.includes(s)),
    statsWiredKt: ENDGAME_4.stats.every((s) => ktStats.includes(s)),
    systemMarkersTs: systemMarkers.every((m) => tsSystems.includes(m)),
    systemMarkersKt: systemMarkers.every((m) => ktSystems.includes(m)),
    codecMarkersTs: codecMarkers.every((m) => snapshotTs.includes(m)),
    codecMarkersKt: codecMarkers.every((m) => codecKt.includes(m)),
    kickoffClosed,
    schemaPrepApplied,
    missingGates,
  };
}
