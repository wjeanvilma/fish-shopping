/**
 * Finish 4.0 Phase 15 — rival markets 8→12 + AI depth
 * (mirrors shared/ship/rival-markets-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/rival-markets-2.json";
import { loadContent } from "../engine";

export interface RivalMarkets2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  rivalCount: number;
  rivalMarkets2Marker: string;
  stats: string[];
  aiProfiles: string[];
  aiCatalog: {
    adaptiveAggressionBoostPermille: number;
    multiRivalPressureExtraMultPermille: number;
  };
  rivalIds: string[];
  newRivalIds: string[];
  extendsRivalMarkets: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const RIVAL_MARKETS_2 = catalogJson as unknown as RivalMarkets2Catalog;
export const RIVAL_MARKETS_2_PHASE = RIVAL_MARKETS_2.phase;
export const RIVAL_MARKETS_2_SCHEMA = RIVAL_MARKETS_2.schema;
export const RIVAL_MARKETS_2_MARKER = RIVAL_MARKETS_2.rivalMarkets2Marker;
export const RIVAL_COUNT_2 = RIVAL_MARKETS_2.rivalCount;

export interface RivalMarkets2Measure {
  rivalCount: number;
  newRivalsPresent: boolean;
  harborsCovered: boolean;
  aiProfilesPresent: boolean;
  aiCatalogWired: boolean;
  systemAiDepthTs: boolean;
  systemAiDepthKt: boolean;
  kickoffRivalsMet: boolean;
  missingGates: string[];
  missingNewRivals: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureRivalMarkets2(repoRoot: string): RivalMarkets2Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-4.0-kickoff.json"));

  const missingNewRivals = RIVAL_MARKETS_2.newRivalIds.filter((id) => !content.rivalsById.has(id));
  const harborIds = new Set(content.harbors.map((h) => h.id));
  const covered = new Set<string>();
  let profilesOk = true;
  for (const rival of content.rivalMarkets.rivals) {
    for (const h of rival.harbors) covered.add(h);
    if (!rival.aiProfile || !RIVAL_MARKETS_2.aiProfiles.includes(rival.aiProfile)) {
      profilesOk = false;
    }
  }
  const harborsCovered = [...harborIds].every((h) => covered.has(h));

  const cat = content.rivalMarkets;
  const aiCatalogWired =
    (cat.adaptiveAggressionBoostPermille ?? 0) ===
      RIVAL_MARKETS_2.aiCatalog.adaptiveAggressionBoostPermille &&
    (cat.multiRivalPressureExtraMultPermille ?? 1000) ===
      RIVAL_MARKETS_2.aiCatalog.multiRivalPressureExtraMultPermille;

  const tsSystems = readFileSync(resolve(repoRoot, "web/src/engine/systems.ts"), "utf8");
  const ktSystems = readFileSync(
    resolve(
      repoRoot,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/RivalMarketSystem.kt",
    ),
    "utf8",
  );
  const aiMarkers = [
    "effectiveAggressionPermille",
    "pressuringRivals",
    "multiRivalPressureExtraMultPermille",
    "adaptiveAggressionBoostPermille",
    "aiProfile",
  ];

  const missingGates: string[] = [];
  for (const gate of RIVAL_MARKETS_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    rivalCount: content.rivalMarkets.rivals.length,
    newRivalsPresent: missingNewRivals.length === 0,
    harborsCovered,
    aiProfilesPresent: profilesOk,
    aiCatalogWired,
    systemAiDepthTs: aiMarkers.every((m) => tsSystems.includes(m)),
    systemAiDepthKt: aiMarkers.every((m) => ktSystems.includes(m)),
    kickoffRivalsMet: (kickoff.baseline?.rivalMarkets ?? 0) >= RIVAL_COUNT_2,
    missingGates,
    missingNewRivals,
  };
}
