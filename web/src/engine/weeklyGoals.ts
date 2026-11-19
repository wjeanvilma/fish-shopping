/**
 * Finish 5.0 Phase 19 — weekly retention objectives (stats-backed, no schema bump).
 */
import weeklyJson from "../../../shared/content/weekly-retention.json";
import type { ContentPack } from "./content";
import type { GameState, Receipt } from "./state";
import { Stats } from "./state";
import { Prng, SafeMath } from "./foundations";
import { DailyGoalsSystem } from "./systems";
import type { StepContext } from "./systems/context";

export interface WeeklyObjectiveDef {
  id: string;
  name: string;
  description: string;
  goal: { stat: string; atLeast: number };
  rewardCoins: number;
  weight: number;
}

export interface WeeklyRetentionCatalog {
  phase: number;
  schema: string;
  weekLengthDays: number;
  boardSlots: number;
  weekBonusCoins: number;
  objectivesMin: number;
  objectives: WeeklyObjectiveDef[];
}

export const weeklyRetention = weeklyJson as unknown as WeeklyRetentionCatalog;
export const WEEKLY_RETENTION_SCHEMA = weeklyRetention.schema;
export const WEEKLY_OBJECTIVES_MIN = weeklyRetention.objectivesMin;

export const WeeklyGoalsSystem = {
  WEEK_ID: "stat.weekly_goals_week_id",
  CLAIMED: Stats.WEEKLY_GOALS_CLAIMED,

  boardSlotKey(index: number): string {
    return `stat.weekly_board_${index}`;
  },
  baselineKey(stat: string): string {
    return `stat.weekly_baseline.${stat}`;
  },
  claimedWeekKey(objectiveId: string): string {
    return `stat.weekly_claimed_week.${objectiveId}`;
  },

  weekId(content: ContentPack, state: GameState): number {
    const day = DailyGoalsSystem.currentDayId(content, state);
    if (day <= 0) return state.stat(WeeklyGoalsSystem.WEEK_ID);
    const len = Math.max(1, weeklyRetention.weekLengthDays);
    return Math.floor(day / len);
  },

  boardObjectives(state: GameState): WeeklyObjectiveDef[] {
    const out: WeeklyObjectiveDef[] = [];
    for (let i = 0; i < weeklyRetention.boardSlots; i++) {
      const idx = state.stat(WeeklyGoalsSystem.boardSlotKey(i)) - 1;
      if (idx >= 0 && idx < weeklyRetention.objectives.length) {
        out.push(weeklyRetention.objectives[idx]!);
      }
    }
    return out;
  },

  progress(state: GameState, objective: WeeklyObjectiveDef): number {
    const baseline = state.stat(WeeklyGoalsSystem.baselineKey(objective.goal.stat));
    return Math.max(0, state.stat(objective.goal.stat) - baseline);
  },

  isComplete(state: GameState, objective: WeeklyObjectiveDef): boolean {
    return WeeklyGoalsSystem.progress(state, objective) >= objective.goal.atLeast;
  },

  isClaimed(content: ContentPack, state: GameState, objective: WeeklyObjectiveDef): boolean {
    const week = WeeklyGoalsSystem.weekId(content, state);
    if (week <= 0) return false;
    return state.stat(WeeklyGoalsSystem.claimedWeekKey(objective.id)) === week;
  },

  claimRewardCoins(objective: WeeklyObjectiveDef): number {
    return objective.rewardCoins + weeklyRetention.weekBonusCoins;
  },

  step(ctx: StepContext): void {
    if (DailyGoalsSystem.wallClockEpochMs(ctx.state) <= 0) return;
    WeeklyGoalsSystem.rolloverIfNeeded(ctx);
  },

  claim(ctx: StepContext, objectiveId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "weekly_goal_claimed",
        tick: s.tick,
        objectiveId,
        payout: existing.coinDelta,
        receipt: existing,
        replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "weekly_goal_rejected", tick: s.tick, objectiveId, requestId, reason });
    };
    if (DailyGoalsSystem.wallClockEpochMs(s) <= 0) {
      reject("Wall clock not synced");
      return;
    }
    WeeklyGoalsSystem.rolloverIfNeeded(ctx);
    const objective = weeklyRetention.objectives.find((o) => o.id === objectiveId);
    if (!objective) {
      reject("Unknown weekly objective");
      return;
    }
    if (!WeeklyGoalsSystem.boardObjectives(s).some((o) => o.id === objectiveId)) {
      reject("Not on this week's board");
      return;
    }
    if (WeeklyGoalsSystem.isClaimed(ctx.content, s, objective)) {
      reject("Already claimed this week");
      return;
    }
    if (!WeeklyGoalsSystem.isComplete(s, objective)) {
      reject("Objective not complete");
      return;
    }
    const payout = WeeklyGoalsSystem.claimRewardCoins(objective);
    const week = WeeklyGoalsSystem.weekId(ctx.content, s);
    s.stats.set(WeeklyGoalsSystem.claimedWeekKey(objectiveId), week);
    if (payout > 0) s.coins = SafeMath.creditCoins(s.coins, payout);
    s.bumpStat(WeeklyGoalsSystem.CLAIMED);
    const receipt: Receipt = {
      id: s.newId("weekly"),
      type: "weekly_goal_reward",
      coinDelta: payout,
      tick: s.tick,
      reference: objectiveId,
    };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({
      type: "weekly_goal_claimed",
      tick: s.tick,
      objectiveId,
      payout,
      receipt,
      replayed: false,
    });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "weekly_goal" });
  },

  rolloverIfNeeded(ctx: StepContext): void {
    const s = ctx.state;
    const content = ctx.content;
    const newWeek = WeeklyGoalsSystem.weekId(content, s);
    const oldWeek = s.stat(WeeklyGoalsSystem.WEEK_ID);
    if (oldWeek === newWeek && WeeklyGoalsSystem.boardObjectives(s).length > 0) return;

    s.stats.set(WeeklyGoalsSystem.WEEK_ID, newWeek);
    for (const stat of new Set(weeklyRetention.objectives.map((o) => o.goal.stat))) {
      s.stats.set(WeeklyGoalsSystem.baselineKey(stat), s.stat(stat));
    }
    WeeklyGoalsSystem.refreshBoard(s, newWeek);
    if (oldWeek !== 0 && oldWeek !== newWeek) {
      ctx.emit({ type: "weekly_goals_rolled", tick: s.tick, weekId: newWeek });
    }
  },

  refreshBoard(state: GameState, week: number): void {
    const pool = [...weeklyRetention.objectives];
    const rng = new Prng((week ^ 0x7ee7) | 0);
    const slots = Math.min(weeklyRetention.boardSlots, pool.length);
    for (let i = 0; i < weeklyRetention.boardSlots; i++) {
      state.stats.delete(WeeklyGoalsSystem.boardSlotKey(i));
    }
    for (let i = 0; i < slots; i++) {
      if (pool.length === 0) break;
      const idxInPool = rng.pickWeighted(pool.map((o) => o.weight));
      const picked = pool.splice(idxInPool, 1)[0]!;
      const contentIndex = weeklyRetention.objectives.findIndex((o) => o.id === picked.id);
      if (contentIndex >= 0) {
        state.stats.set(WeeklyGoalsSystem.boardSlotKey(i), contentIndex + 1);
      }
    }
  },
};
