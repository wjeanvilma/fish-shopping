/** Phase 9 business dashboard — mirrors game-core sim/BusinessDashboard.kt. */
import type { ContentPack, CounterDef, HarborDef } from "./content";
import type { CounterState, GameState } from "./state";
import { Stats } from "./state";
import { CustomerSystem, DailyGoalsSystem, ReputationSystem } from "./systems";
import { abandonPermille, wageRatioPermille } from "./telemetry";
import type { DailyGoalView } from "./view";

export interface BusinessDashboardSpeciesView {
  speciesId: string;
  name: string;
  sharePermille: number;
  catches: number;
}

export interface BusinessDashboardBottleneckView {
  id: string;
  kind: string;
  label: string;
  reason: string;
}

export interface BusinessDashboardView {
  sessionTicks: number;
  sessionLabel: string;
  rateIntervalLabel: string;
  salesCount: number;
  itemsSold: number;
  committedRevenue: number;
  contractRevenue: number;
  lostCustomers: number;
  abandonPermille: number;
  wagesPaid: number;
  wageRatioPermille: number;
  revenuePerMinute: number;
  salesPerMinute: number;
  topSpecies: BusinessDashboardSpeciesView[];
  bottlenecks: BusinessDashboardBottleneckView[];
  empty: boolean;
  dailyLoginStreak: number;
  dailyGoals: DailyGoalView[];
  offlineJournalLines: string[];
  /** Finish 4.0 Phase 20 — cashflow / ops surfaces. */
  maintenancePaid: number;
  repairSpent: number;
  itemsSpoiled: number;
  loanInterestAccrued: number;
  loanCollected: number;
  operatingCosts: number;
  netOperatingProfit: number;
  activeScarcityTipPermille: number;
  reputationScorePermille: number;
  reputationLabel: string;
  /** Finish 5.0 Phase 21 — pier ledger / loan book analytics. */
  loanOwed: number;
  loansTaken: number;
  loanRepaid: number;
  coinGoal: number;
  coinGoalProgressPermille: number;
  ledgerNetCashflow: number;
  contractRevenueSharePermille: number;
  ledgerLines: string[];
}

export function formatSession(totalSeconds: number): string {
  const sec = Math.max(0, Math.trunc(totalSeconds));
  const h = Math.trunc(sec / 3600);
  const m = Math.trunc((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function activeScarcityTipPermille(
  content: ContentPack,
  state: GameState,
  harbor: HarborDef,
): number {
  let best = 1000;
  for (const cdef of harbor.counters) {
    if (!CustomerSystem.isUnlocked(cdef, state)) continue;
    const counter = state.counters.find((c) => c.counterId === cdef.id);
    if (!counter) continue;
    const tip = CustomerSystem.scarcityPriceMultPermille(
      content,
      cdef as CounterDef,
      counter as CounterState,
    );
    if (tip > best) best = tip;
  }
  return best;
}

const LEDGER_LINE_TYPES = new Set([
  "loan",
  "loan_repay",
  "loan_collect",
  "sale",
  "wage",
  "contract_payout",
  "contract_penalty",
]);

function buildLedgerLines(state: GameState): string[] {
  const lines: string[] = [];
  for (let i = state.ledger.length - 1; i >= 0 && lines.length < 6; i--) {
    const r = state.ledger[i];
    if (!LEDGER_LINE_TYPES.has(r.type)) continue;
    const sign = r.coinDelta >= 0 ? "+" : "";
    lines.push(`${r.type} ${sign}${r.coinDelta}`);
  }
  return lines;
}

export const BusinessDashboard = {
  build(
    content: ContentPack,
    state: GameState,
    bottlenecks: BusinessDashboardBottleneckView[],
    topSpecies: BusinessDashboardSpeciesView[],
    harbor?: HarborDef | null,
  ): BusinessDashboardView {
    const tps = Math.max(1, content.raw.ticksPerSecond);
    const sessionTicks = Math.max(0, state.tick);
    const sessionSeconds = Math.trunc(sessionTicks / tps);
    const sales = state.stat(Stats.SALES);
    const itemsSold = state.stat(Stats.ITEMS_SOLD);
    const committedRevenue = state.stat(Stats.REVENUE);
    const contractRevenue = state.stat(Stats.CONTRACT_REVENUE);
    const lost = state.stat(Stats.LOST_CUSTOMERS);
    const wages = state.stat(Stats.WAGES_PAID);
    const maintenance = state.stat(Stats.MAINTENANCE_PAID);
    const repairs = state.stat(Stats.REPAIR_SPENT);
    const spoiled = state.stat(Stats.ITEMS_SPOILED);
    const loanInterest = state.stat(Stats.LOAN_INTEREST_ACCRUED);
    const loanCollected = state.stat(Stats.LOAN_COLLECTED);
    const loanRepaid = state.stat(Stats.LOAN_REPAID);
    const loansTaken = state.stat(Stats.LOANS_TAKEN);
    const operatingCosts = wages + maintenance + repairs;
    const gross = committedRevenue + contractRevenue;
    const ledgerNetCashflow = gross - operatingCosts - loanInterest - loanCollected;
    const contractRevenueSharePermille =
      gross > 0 ? Math.trunc((contractRevenue * 1000) / gross) : 0;
    const coinGoalProgressPermille =
      state.coinGoal > 0
        ? Math.min(1000, Math.trunc((state.coins * 1000) / state.coinGoal))
        : 0;
    const minutes = Math.trunc(sessionSeconds / 60);
    const revenuePerMinute = minutes > 0 ? Math.trunc(committedRevenue / minutes) : 0;
    const salesPerMinute = minutes > 0 ? Math.trunc(sales / minutes) : 0;
    const daily = DailyGoalsSystem.boardObjectives(content, state).map((o) => {
      const progress = DailyGoalsSystem.progress(content, state, o);
      const complete = DailyGoalsSystem.isComplete(content, state, o);
      const claimed = DailyGoalsSystem.isClaimed(content, state, o);
      return {
        objectiveId: o.id,
        name: o.name,
        description: o.description,
        progress,
        target: o.goal.atLeast,
        rewardCoins: DailyGoalsSystem.claimRewardCoins(content, state, o),
        complete,
        claimed,
        claimEnabled: complete && !claimed,
      };
    });
    return {
      sessionTicks,
      sessionLabel: formatSession(sessionSeconds),
      rateIntervalLabel: minutes > 0 ? "per min" : "awaiting 1m",
      salesCount: sales,
      itemsSold,
      committedRevenue,
      contractRevenue,
      lostCustomers: lost,
      abandonPermille: abandonPermille(state),
      wagesPaid: wages,
      wageRatioPermille: wageRatioPermille(state),
      revenuePerMinute,
      salesPerMinute,
      topSpecies,
      bottlenecks,
      empty: sales === 0 && lost === 0 && committedRevenue === 0 && contractRevenue === 0 && daily.length === 0,
      dailyLoginStreak: DailyGoalsSystem.streak(state),
      dailyGoals: daily,
      offlineJournalLines: [],
      maintenancePaid: maintenance,
      repairSpent: repairs,
      itemsSpoiled: spoiled,
      loanInterestAccrued: loanInterest,
      loanCollected,
      operatingCosts,
      netOperatingProfit: gross - operatingCosts,
      activeScarcityTipPermille: harbor ? activeScarcityTipPermille(content, state, harbor) : 1000,
      reputationScorePermille: ReputationSystem.scorePermille(content, state),
      reputationLabel: ReputationSystem.bandLabel(content, state),
      loanOwed: state.loanOwed,
      loansTaken,
      loanRepaid,
      coinGoal: state.coinGoal,
      coinGoalProgressPermille,
      ledgerNetCashflow,
      contractRevenueSharePermille,
      ledgerLines: buildLedgerLines(state),
    };
  },
};
