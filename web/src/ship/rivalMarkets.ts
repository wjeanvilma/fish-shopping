/**
 * Finish 3.0 Phase 14 — rival NPC markets
 * (mirrors shared/ship/rival-markets.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/rival-markets.json";
import { loadContent } from "../engine";

export interface RivalMarketsCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  rivalCount: number;
  rivalMarketsMarker: string;
  stats: string[];
  rivalIds: string[];
  authorTool: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const RIVAL_MARKETS = catalogJson as unknown as RivalMarketsCatalog;
export const RIVAL_MARKETS_PHASE = RIVAL_MARKETS.phase;
export const RIVAL_MARKETS_SCHEMA = RIVAL_MARKETS.schema;
export const RIVAL_MARKETS_MARKER = RIVAL_MARKETS.rivalMarketsMarker;
export const RIVAL_COUNT = RIVAL_MARKETS.rivalCount;

export interface RivalMarketsMeasure {
  rivalCount: number;
  rivalsPresent: boolean;
  harborsCovered: boolean;
  statsWiredTs: boolean;
  statsWiredKt: boolean;
  systemMarkersTs: boolean;
  systemMarkersKt: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  missingGates: string[];
  missingRivals: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureRivalMarkets(repoRoot: string): RivalMarketsMeasure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const missingRivals = RIVAL_MARKETS.rivalIds.filter((id) => !content.rivalsById.has(id));
  const harborIds = new Set(content.harbors.map((h) => h.id));
  const covered = new Set<string>();
  for (const rival of content.rivalMarkets.rivals) {
    for (const h of rival.harbors) covered.add(h);
  }
  const harborsCovered = [...harborIds].every((h) => covered.has(h));

  const tsSystems = [
    "web/src/engine/systems.ts",
    "web/src/engine/systems/rivals.ts",
  ]
    .map((p) => {
      const full = resolve(repoRoot, p);
      return existsSync(full) ? readFileSync(full, "utf8") : "";
    })
    .join("\n");
  const ktSystems = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/RivalMarketSystem.kt"),
  )
    ? readFileSync(
        resolve(
          repoRoot,
          "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/RivalMarketSystem.kt",
        ),
        "utf8",
      )
    : "";
  const tsStats = readFileSync(resolve(repoRoot, "web/src/engine/state.ts"), "utf8");
  const ktStats = readFileSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt"),
    "utf8",
  );

  const coreMarkers = [
    "activeRivals",
    "customerSpawnMultPermille",
    "salePriceMultPermille",
    "noteSaleOutcome",
  ];
  const systemMarkersTsOk = coreMarkers.every((m) => tsSystems.includes(m));
  const systemMarkersKtOk = coreMarkers.every((m) => ktSystems.includes(m));

  let kickoffWired = false;
  let measuredAtPhase = -1;
  const kickoffPath = resolve(repoRoot, RIVAL_MARKETS.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    const phase14 = (kickoff.phases as any[])?.find((p) => p.phase === 14);
    kickoffWired =
      phase14?.id === "rival-markets" &&
      phase14?.validate === "rivalmarkets:validate" &&
      measuredAtPhase >= 14;
  }

  const missingGates: string[] = [];
  for (const gate of RIVAL_MARKETS.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    rivalCount: content.rivalMarkets.rivals.length,
    rivalsPresent: missingRivals.length === 0,
    harborsCovered,
    statsWiredTs: RIVAL_MARKETS.stats.every((s) => tsStats.includes(s)),
    statsWiredKt: RIVAL_MARKETS.stats.every((s) => ktStats.includes(s)),
    systemMarkersTs: systemMarkersTsOk,
    systemMarkersKt: systemMarkersKtOk,
    kickoffWired,
    measuredAtPhase,
    missingGates,
    missingRivals,
  };
}
