/**
 * Finish 5.0 Phase 6 — LOC mid-check scoreboard
 * (mirrors shared/ship/loc-midcheck.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/loc-midcheck.json";
import { FINISH5_KICKOFF, productLocProgress } from "./finish5Kickoff";
import { LOC_FLOORS, measureLocScoreboard, type LocScoreboard } from "./locFloors";

export interface LocMidcheckSlice {
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

export interface LocMidcheckCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  locMidcheckMarker: string;
  kickoffCatalog: string;
  locCatalog: string;
  priorFreezeCatalog: string;
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
  midcheck: LocMidcheckSlice;
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

export const LOC_MIDCHECK = catalogJson as unknown as LocMidcheckCatalog;
export const LOC_MIDCHECK_PHASE = LOC_MIDCHECK.phase;
export const LOC_MIDCHECK_SCHEMA = LOC_MIDCHECK.schema;
export const LOC_MIDCHECK_MARKER = LOC_MIDCHECK.locMidcheckMarker;

export interface LocMidcheckMeasure {
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

export function measureLocMidcheck(repoRoot: string): LocMidcheckMeasure {
  const missingGates: string[] = [];
  for (const gate of LOC_MIDCHECK.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const live = measureLocScoreboard(repoRoot);
  const floors = LOC_MIDCHECK.interimSoftFloors;
  const mid = LOC_MIDCHECK.midcheck;
  const baseline = LOC_MIDCHECK.priorBaseline;
  const slack = LOC_MIDCHECK.midcheckSlackLines;

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

  // Growth above locked midcheck is OK; small downward drift within slack is OK.
  const midcheckAligned =
    live.productTotal + slack >= mid.productLoc &&
    live.gameCore.lines + slack >= mid.gameCoreLoc &&
    live.app.lines + slack >= mid.appLoc &&
    live.webSrc.lines + slack >= mid.webSrcLoc;

  const planTargetsIntact =
    LOC_MIDCHECK.planTargets.productLoc === 120000 &&
    LOC_MIDCHECK.planTargets.gameCoreLoc === 38000 &&
    LOC_MIDCHECK.planTargets.appLoc === 26000 &&
    LOC_MIDCHECK.planTargets.webSrcLoc === 56000 &&
    (LOC_FLOORS.productTotalPlanTarget ?? 0) === 120000 &&
    FINISH5_KICKOFF.gapTargets.productLoc === 120000;

  const kickoff = readJson(resolve(repoRoot, LOC_MIDCHECK.kickoffCatalog));
  const phase6 = (kickoff.phases as any[])?.find((p) => p.phase === 6);

  return {
    live,
    liveProgressPercent: productLocProgress(live.productTotal),
    meetsInterimFloors,
    meetsPriorBaseline,
    midcheckAligned,
    planTargetsIntact,
    kickoffWired:
      phase6?.id === "loc-midcheck" && phase6?.validate === "locmidcheck:validate",
    missingGates,
  };
}

export function formatLocMidcheck(m: LocMidcheckMeasure): string {
  const mid = LOC_MIDCHECK.midcheck;
  return [
    `LOC mid-check (Finish 5.0 Phase 6)`,
    `  live product=${m.live.productTotal} midcheck=${mid.productLoc} interimFloor=${LOC_MIDCHECK.interimSoftFloors.productLoc}`,
    `  progress ${m.liveProgressPercent}% (locked ${mid.productLocProgressPercent}%) toward ${LOC_MIDCHECK.planTargets.productLoc}`,
    `  scopes live: game-core=${m.live.gameCore.lines} app=${m.live.app.lines} web/src=${m.live.webSrc.lines}`,
  ].join("\n");
}
