/**
 * Finish 6.0 Phase 1 — kickoff + gap scoreboard
 * (mirrors shared/ship/finish-6.0-kickoff.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import kickoffJson from "../../../shared/ship/finish-6.0-kickoff.json";

export interface Finish6PhaseGate {
  phase: number;
  id: string;
  title: string;
  validate?: string;
}

export interface Finish6GapTargets {
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
  harborsMin: number;
  seasonalMin: number;
  baitsMin: number;
  cosmeticsMin: number;
  chainsMin: number;
  rivalsMin: number;
  paritySuitesMin: number;
  playwrightE2eMin: number;
  composeE2eMin: number;
  systemsTsMax: number;
  gameViewModelMax: number;
  gameHostMax: number;
}

export interface Finish6KickoffCatalog {
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
    versionCode: number;
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
    deliveryChains: number;
    rivalMarkets: number;
    seasonalEvents: number;
    baits: number;
    cosmetics: number;
    authoredHarbors: number;
    authoredFish: number;
    harborBlockouts: number;
    i18nLocales: number;
    i18nUiKeys: number;
    androidUiStringsCalls: number;
    androidTextLiterals: number;
    staffComingSoonReasons: number;
    paritySuites: number;
    playwrightE2e: number;
    composeE2e: number;
    systemsTsLines: number;
    gameViewModelLines: number;
    gameHostLines: number;
  };
  gaps: Record<string, number | boolean>;
  gapTargets: Finish6GapTargets;
  phases: Finish6PhaseGate[];
  definitionOfDone: string;
  locCatalog: string;
  harborArtCatalog: string;
  fishArtCatalog: string;
  priorFreezeCatalog: string;
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
  systemsTs: GapScore;
  gameViewModel: GapScore;
  gameHost: GapScore;
  openFlags: string[];
  openFlagCount: number;
  allNumericGapsClosed: boolean;
}

export const FINISH6_KICKOFF = kickoffJson as unknown as Finish6KickoffCatalog;
export const FINISH6_KICKOFF_PHASE = FINISH6_KICKOFF.phase;
export const FINISH6_KICKOFF_SCHEMA = FINISH6_KICKOFF.schema;
export const FINISH6_KICKOFF_MARKER = FINISH6_KICKOFF.kickoffMarker;
export const FINISH6_PLAN = FINISH6_KICKOFF.plan;
export const FINISH6_PHASE_COUNT = 30;

/** Boolean gap flags still open (true) on the kickoff catalog. */
export const FINISH6_OPEN_GAP_FLAGS: string[] = Object.entries(FINISH6_KICKOFF.gaps)
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

export function finish6PhaseIds(): string[] {
  return FINISH6_KICKOFF.phases.map((p) => p.id);
}

export function requireThirtyPhases(phases: Finish6PhaseGate[] = FINISH6_KICKOFF.phases): boolean {
  if (phases.length !== FINISH6_PHASE_COUNT) return false;
  if (phases[0]?.id !== "kickoff" || phases[phases.length - 1]?.id !== "freeze-6") return false;
  return phases.every((p, i) => p.phase === i + 1);
}

export function productLocProgress(
  currentProductLoc: number = FINISH6_KICKOFF.baseline.productLoc,
): number {
  const span = Math.max(
    1,
    FINISH6_KICKOFF.gapTargets.productLoc - FINISH6_KICKOFF.baseline.productLoc,
  );
  const gained = Math.max(0, currentProductLoc - FINISH6_KICKOFF.baseline.productLoc);
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
  systemsTsLines?: number;
  gameViewModelLines?: number;
  gameHostLines?: number;
  openFlags?: string[];
}): GapScoreboard {
  const b = FINISH6_KICKOFF.baseline;
  const t = FINISH6_KICKOFF.gapTargets;
  const authoredHarbors = scoreGap(
    "authoredHarbors",
    overrides?.authoredHarbors ?? b.authoredHarbors,
    t.authoredHarbors,
    { remainingOverride: FINISH6_KICKOFF.gaps.authoredHarborsRemaining as number },
  );
  const authoredFish = scoreGap(
    "authoredFish",
    overrides?.authoredFish ?? b.authoredFish,
    t.authoredFish,
    { remainingOverride: FINISH6_KICKOFF.gaps.authoredFishRemaining as number },
  );
  const productLoc = scoreGap(
    "productLoc",
    overrides?.productLoc ?? b.productLoc,
    t.productLoc,
    { remainingOverride: FINISH6_KICKOFF.gaps.productLocRemaining as number },
  );
  const species = scoreGap("species", overrides?.species ?? b.species, t.speciesMin, {
    remainingOverride: FINISH6_KICKOFF.gaps.speciesRemaining as number,
  });
  const machines = scoreGap("machines", overrides?.machines ?? b.machines, t.machinesMin, {
    remainingOverride: FINISH6_KICKOFF.gaps.machinesRemaining as number,
  });
  const quests = scoreGap("quests", overrides?.quests ?? b.quests, t.questsMin, {
    remainingOverride: FINISH6_KICKOFF.gaps.questsRemaining as number,
  });
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
  const systemsTs = scoreGap(
    "systemsTs",
    overrides?.systemsTsLines ?? b.systemsTsLines,
    t.systemsTsMax,
    { invertRemaining: true },
  );
  const gameViewModel = scoreGap(
    "gameViewModel",
    overrides?.gameViewModelLines ?? b.gameViewModelLines,
    t.gameViewModelMax,
    { invertRemaining: true },
  );
  const gameHost = scoreGap(
    "gameHost",
    overrides?.gameHostLines ?? b.gameHostLines,
    t.gameHostMax,
    { invertRemaining: true },
  );
  const openFlags = overrides?.openFlags ?? FINISH6_OPEN_GAP_FLAGS;
  const numeric = [
    authoredHarbors,
    authoredFish,
    productLoc,
    species,
    machines,
    quests,
    i18nLocales,
    staffComingSoon,
    systemsTs,
    gameViewModel,
    gameHost,
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
    systemsTs,
    gameViewModel,
    gameHost,
    openFlags,
    openFlagCount: openFlags.length,
    allNumericGapsClosed: numeric.every((g) => g.met) && openFlags.length === 0,
  };
}

export function measureArtCounts(repoRoot: string): {
  authoredHarbors: number;
  authoredFish: number;
} {
  const harborPath = resolve(repoRoot, FINISH6_KICKOFF.harborArtCatalog);
  const fishPath = resolve(repoRoot, FINISH6_KICKOFF.fishArtCatalog);
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
    `Finish 6.0 Phase 1 gaps: harbors ${board.authoredHarbors.current}/${board.authoredHarbors.target}, ` +
    `fish ${board.authoredFish.current}/${board.authoredFish.target}, ` +
    `LOC ${board.productLoc.current}/${board.productLoc.target}, ` +
    `openFlags=${board.openFlagCount}`
  );
}
