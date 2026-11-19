/**
 * Finish 6.0 Phase 6 — LOC mid-check scoreboard
 * (mirrors shared/ship/loc-midcheck-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/loc-midcheck-6.json";
import { FINISH6_KICKOFF, productLocProgress } from "./finish6Kickoff";
import { LOC_FLOORS, measureLocScoreboard, type LocScoreboard } from "./locFloors";

export interface LocMidcheck6Slice {
  measuredAtPhase: number;
  afterPhases: string[];
  gameCoreLoc: number;
  appLoc: number;
  webSrcLoc: number;
  productLoc: number;
  productLocProgressPercent: number;
  productLocProgressPermille: number;
  productLocRemainingToPlan: number;
}

export interface LocMidcheck6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  locMidcheck6Marker: string;
  kickoffCatalog: string;
  locCatalog: string;
  priorFreezeCatalog: string;
  priorLocMidcheckCatalog: string;
  planTargets: {
    gameCoreLoc: number;
    appLoc: number;
    webSrcLoc: number;
    productLoc: number;
  };
  priorBaseline: {
    measuredAtPhase: number;
    gameCoreLoc: number;
    appLoc: number;
    webSrcLoc: number;
    productLoc: number;
  };
  midcheck: LocMidcheck6Slice;
  interimSoftFloors: {
    enabled: boolean;
    gameCoreLoc: number;
    appLoc: number;
    webSrcLoc: number;
    productLoc: number;
  };
  midcheckSlackLines: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  smokeScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const LOC_MIDCHECK_6 = catalogJson as unknown as LocMidcheck6Catalog;
export const LOC_MIDCHECK_6_PHASE = LOC_MIDCHECK_6.phase;
export const LOC_MIDCHECK_6_SCHEMA = LOC_MIDCHECK_6.schema;
export const LOC_MIDCHECK_6_MARKER = LOC_MIDCHECK_6.locMidcheck6Marker;

export interface LocMidcheck6Measure {
  live: LocScoreboard;
  liveProgressPercent: number;
  meetsInterimFloors: boolean;
  meetsPriorBaseline: boolean;
  midcheckAligned: boolean;
  planTargetsIntact: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureLocMidcheck6(repoRoot: string): LocMidcheck6Measure {
  const missingGates: string[] = [];
  for (const gate of LOC_MIDCHECK_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const live = measureLocScoreboard(repoRoot);
  const floors = LOC_MIDCHECK_6.interimSoftFloors;
  const mid = LOC_MIDCHECK_6.midcheck;
  const baseline = LOC_MIDCHECK_6.priorBaseline;
  const slack = LOC_MIDCHECK_6.midcheckSlackLines;

  const meetsInterimFloors =
    floors.enabled &&
    live.gameCore.lines >= floors.gameCoreLoc &&
    live.app.lines >= floors.appLoc &&
    live.webSrc.lines >= floors.webSrcLoc &&
    live.productTotal >= floors.productLoc;

  const meetsPriorBaseline =
    live.gameCore.lines >= baseline.gameCoreLoc &&
    live.app.lines >= baseline.appLoc &&
    live.webSrc.lines >= baseline.webSrcLoc &&
    live.productTotal >= baseline.productLoc;

  const midcheckAligned =
    live.productTotal + slack >= mid.productLoc &&
    live.gameCore.lines + slack >= mid.gameCoreLoc &&
    live.app.lines + slack >= mid.appLoc &&
    live.webSrc.lines + slack >= mid.webSrcLoc;

  const planTargetsIntact =
    LOC_MIDCHECK_6.planTargets.productLoc === 120000 &&
    LOC_MIDCHECK_6.planTargets.gameCoreLoc === 38000 &&
    LOC_MIDCHECK_6.planTargets.appLoc === 26000 &&
    LOC_MIDCHECK_6.planTargets.webSrcLoc === 56000 &&
    (LOC_FLOORS.productTotalPlanTarget ?? 0) === 120000 &&
    FINISH6_KICKOFF.gapTargets.productLoc === 120000;

  const kickoff = readJson(resolve(repoRoot, LOC_MIDCHECK_6.kickoffCatalog));
  const phase6 = (kickoff.phases as any[])?.find((p) => p.phase === 6);

  return {
    live,
    liveProgressPercent: productLocProgress(live.productTotal),
    meetsInterimFloors,
    meetsPriorBaseline,
    midcheckAligned,
    planTargetsIntact,
    kickoffWired:
      phase6?.id === "loc-midcheck-6" && phase6?.validate === "locmidcheck6:validate",
    missingGates,
  };
}

export function formatLocMidcheck6(m: LocMidcheck6Measure): string {
  const mid = LOC_MIDCHECK_6.midcheck;
  return [
    `LOC mid-check (Finish 6.0 Phase 6)`,
    `  live product=${m.live.productTotal} midcheck=${mid.productLoc} interimFloor=${LOC_MIDCHECK_6.interimSoftFloors.productLoc}`,
    `  progress ${m.liveProgressPercent}% (locked ${mid.productLocProgressPercent}%) toward ${LOC_MIDCHECK_6.planTargets.productLoc}`,
    `  scopes live: game-core=${m.live.gameCore.lines} app=${m.live.app.lines} web/src=${m.live.webSrc.lines}`,
  ].join("\n");
}
