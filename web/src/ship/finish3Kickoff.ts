/**
 * Finish 3.0 Phase 1 — kickoff + gap scoreboard
 * (mirrors shared/ship/finish-3.0-kickoff.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import kickoffJson from "../../../shared/ship/finish-3.0-kickoff.json";

export interface Finish3PhaseGate {
  phase: number;
  id: string;
  title: string;
  validate?: string;
}

export interface Finish3GapTargets {
  authoredHarbors: number;
  authoredFish: number;
  i18nLocales: number;
  i18nUiKeysMin: number;
  androidTextLiteralsMax: number;
  staffComingSoonReasons: number;
  productLoc: number;
  speciesMin: number;
  machinesMin: number;
  questsMin: number;
}

export interface Finish3KickoffCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  kickoffMarker: string;
  priorPlan: {
    id: string;
    status: string;
    freezeCatalog: string;
    releaseTag: string;
    contentVersion: string;
    schemaVersion: number;
  };
  endState: {
    contentVersion: string;
    schemaVersionMin: number;
    releaseTag: string;
    versionName: string;
    productLocMin: number;
    gameCoreLocMin: number;
    appLocMin: number;
    webSrcLocMin: number;
  };
  baseline: {
    measuredAtPhase: number;
    contentVersion: string;
    schemaVersion: number;
    gameCoreLoc: number;
    appLoc: number;
    webSrcLoc: number;
    productLoc: number;
    harbors: number;
    species: number;
    machines: number;
    quests: number;
    authoredHarbors: number;
    authoredFish: number;
    i18nLocales: number;
    i18nUiKeys: number;
    androidUiStringsCalls: number;
    androidTextLiterals: number;
    staffComingSoonReasons: number;
  };
  gaps: Record<string, number | boolean>;
  gapTargets: Finish3GapTargets;
  phases: Finish3PhaseGate[];
  definitionOfDone: string;
  locCatalog: string;
  harborArtCatalog: string;
  fishArtCatalog: string;
  i18nScaffold: string;
  parityFixture: string;
  validateScript: string;
  smokeScript: string;
  checklist: string[];
  preflightGates: string[];
}

export interface GapScore {
  id: string;
  current: number;
  target: number;
  remaining: number;
  met: boolean;
}

export interface GapScoreboard {
  authoredHarbors: GapScore;
  authoredFish: GapScore;
  productLoc: GapScore;
  species: GapScore;
  machines: GapScore;
  quests: GapScore;
  i18nLocales: GapScore;
  staffComingSoon: GapScore;
  openFlags: string[];
  openFlagCount: number;
  allNumericGapsClosed: boolean;
}

export const FINISH3_KICKOFF = kickoffJson as unknown as Finish3KickoffCatalog;
export const FINISH3_KICKOFF_PHASE = FINISH3_KICKOFF.phase;
export const FINISH3_KICKOFF_SCHEMA = FINISH3_KICKOFF.schema;
export const FINISH3_KICKOFF_MARKER = FINISH3_KICKOFF.kickoffMarker;
export const FINISH3_PLAN = FINISH3_KICKOFF.plan;
export const FINISH3_PHASE_COUNT = 30;

/** Boolean gap flags still open (true) on the kickoff catalog. */
export const FINISH3_OPEN_GAP_FLAGS: string[] = Object.entries(FINISH3_KICKOFF.gaps)
  .filter(([, v]) => v === true)
  .map(([k]) => k)
  .sort();

function scoreGap(
  id: string,
  current: number,
  target: number,
  opts?: { remainingOverride?: number; invertRemaining?: boolean },
): GapScore {
  const invert = opts?.invertRemaining === true;
  const remaining =
    opts?.remainingOverride ??
    (invert ? Math.max(0, current - target) : Math.max(0, target - current));
  const met = invert ? current <= target : current >= target;
  return { id, current, target, remaining, met };
}

export function finish3PhaseIds(): string[] {
  return FINISH3_KICKOFF.phases.map((p) => p.id);
}

export function requireThirtyPhases(phases: Finish3PhaseGate[] = FINISH3_KICKOFF.phases): boolean {
  if (phases.length !== FINISH3_PHASE_COUNT) return false;
  if (phases[0]?.id !== "kickoff" || phases[phases.length - 1]?.id !== "freeze-3") return false;
  return phases.every((p, i) => p.phase === i + 1);
}

export function productLocProgress(currentProductLoc: number = FINISH3_KICKOFF.baseline.productLoc): number {
  const span = Math.max(1, FINISH3_KICKOFF.gapTargets.productLoc - FINISH3_KICKOFF.baseline.productLoc);
  const gained = Math.max(0, currentProductLoc - FINISH3_KICKOFF.baseline.productLoc);
  return Math.min(100, Math.max(0, Math.floor((gained * 100) / span)));
}

export function baselineScoreboard(overrides?: {
  authoredHarbors?: number;
  authoredFish?: number;
  productLoc?: number;
  species?: number;
  machines?: number;
  quests?: number;
  i18nLocales?: number;
  staffComingSoon?: number;
  openFlags?: string[];
}): GapScoreboard {
  const b = FINISH3_KICKOFF.baseline;
  const t = FINISH3_KICKOFF.gapTargets;
  const authoredHarbors = scoreGap(
    "authoredHarbors",
    overrides?.authoredHarbors ?? b.authoredHarbors,
    t.authoredHarbors,
    { remainingOverride: FINISH3_KICKOFF.gaps.authoredHarborsRemaining as number },
  );
  const authoredFish = scoreGap(
    "authoredFish",
    overrides?.authoredFish ?? b.authoredFish,
    t.authoredFish,
    { remainingOverride: FINISH3_KICKOFF.gaps.authoredFishRemaining as number },
  );
  const productLoc = scoreGap(
    "productLoc",
    overrides?.productLoc ?? b.productLoc,
    t.productLoc,
    { remainingOverride: FINISH3_KICKOFF.gaps.productLocRemaining as number },
  );
  const species = scoreGap("species", overrides?.species ?? b.species, t.speciesMin);
  const machines = scoreGap("machines", overrides?.machines ?? b.machines, t.machinesMin);
  const quests = scoreGap("quests", overrides?.quests ?? b.quests, t.questsMin);
  const i18nLocales = scoreGap(
    "i18nLocales",
    overrides?.i18nLocales ?? b.i18nLocales,
    t.i18nLocales,
  );
  const staffComingSoon = scoreGap(
    "staffComingSoon",
    overrides?.staffComingSoon ?? b.staffComingSoonReasons,
    t.staffComingSoonReasons,
    {
      remainingOverride: overrides?.staffComingSoon ?? b.staffComingSoonReasons,
      invertRemaining: true,
    },
  );
  const openFlags = overrides?.openFlags ?? FINISH3_OPEN_GAP_FLAGS;
  const numeric = [
    authoredHarbors,
    authoredFish,
    productLoc,
    species,
    machines,
    quests,
    i18nLocales,
    staffComingSoon,
  ];
  return {
    authoredHarbors,
    authoredFish,
    productLoc,
    species,
    machines,
    quests,
    i18nLocales,
    staffComingSoon,
    openFlags,
    openFlagCount: openFlags.length,
    allNumericGapsClosed: numeric.every((g) => g.met) && openFlags.length === 0,
  };
}

export function measureArtCounts(repoRoot: string): { authoredHarbors: number; authoredFish: number } {
  const harborPath = resolve(repoRoot, FINISH3_KICKOFF.harborArtCatalog);
  const fishPath = resolve(repoRoot, FINISH3_KICKOFF.fishArtCatalog);
  const harbors = existsSync(harborPath)
    ? (JSON.parse(readFileSync(harborPath, "utf8")).authoredHarbors as unknown[]).length
    : 0;
  const fish = existsSync(fishPath)
    ? (JSON.parse(readFileSync(fishPath, "utf8")).authoredSpecies as unknown[]).length
    : 0;
  return { authoredHarbors: harbors, authoredFish: fish };
}

export function summaryLine(board: GapScoreboard = baselineScoreboard()): string {
  return (
    `Finish 3.0 Phase 1 gaps: harbors ${board.authoredHarbors.current}/${board.authoredHarbors.target}, ` +
    `fish ${board.authoredFish.current}/${board.authoredFish.target}, ` +
    `LOC ${board.productLoc.current}/${board.productLoc.target}, ` +
    `openFlags=${board.openFlagCount}`
  );
}
