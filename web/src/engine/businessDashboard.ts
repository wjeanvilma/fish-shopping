/** Phase 9 business dashboard — mirrors game-core sim/BusinessDashboard.kt. */
import type { ContentPack } from "./content";
import type { GameState } from "./state";
import { Stats } from "./state";
import { abandonPermille, wageRatioPermille } from "./telemetry";

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

export const BusinessDashboard = {
  build(
    content: ContentPack,
    state: GameState,
    bottlenecks: BusinessDashboardBottleneckView[],
    topSpecies: BusinessDashboardSpeciesView[],
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
    const minutes = Math.trunc(sessionSeconds / 60);
    const revenuePerMinute = minutes > 0 ? Math.trunc(committedRevenue / minutes) : 0;
    const salesPerMinute = minutes > 0 ? Math.trunc(sales / minutes) : 0;
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
      empty: sales === 0 && lost === 0 && committedRevenue === 0 && contractRevenue === 0,
    };
  },
};
