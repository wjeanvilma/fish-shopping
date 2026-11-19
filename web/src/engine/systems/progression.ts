/**
 * Extracted Finish 4.0 Phase 3 — upgrades / quests / reputation.
 */
import type { ContentPack, QuestDef, UpgradeDef, UpgradeEffect } from "../content";
import { idiv, SafeMath } from "../foundations";
import { GameState, Receipt, Stats } from "../state";
import { systemsBridge } from "./bridge";
import { StepContext } from "./context";

export type Availability =
  | { kind: "owned" }
  | { kind: "locked"; reason: string }
  | { kind: "too_expensive"; missing: number }
  | { kind: "purchasable" };

export const UpgradeSystem = {
  availability(content: ContentPack, s: GameState, u: UpgradeDef): Availability {
    if (s.ownedUpgrades.has(u.id)) return { kind: "owned" };
    const missing = u.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
    if (missing !== undefined) {
      const name = content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
      return { kind: "locked", reason: `Requires: ${name}` };
    }
    if (s.coins < u.cost) return { kind: "too_expensive", missing: u.cost - s.coins };
    return { kind: "purchasable" };
  },

  purchase(ctx: StepContext, upgradeId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({ type: "upgrade_purchased", tick: s.tick, upgradeId, receipt: prior, replayed: true });
      return;
    }
    const u = ctx.content.upgradesById.get(upgradeId);
    const reject = (reason: string) => ctx.emit({ type: "purchase_rejected", tick: s.tick, upgradeId, requestId, reason });
    if (!u) return reject("Unknown upgrade");
    // Phase 6: construction upgrades that have a harbor plot must be confirmed at the marker.
    if (!systemsBridge.plotStandingOnUpgradePlot(ctx.harbor, s, upgradeId)) {
      return reject("Stand on the expansion marker");
    }
    const a = UpgradeSystem.availability(ctx.content, s, u);
    switch (a.kind) {
      case "owned": return reject("Already owned");
      case "locked": return reject(a.reason);
      case "too_expensive": return reject(`Need ${a.missing} more coins`);
      case "purchasable": {
        s.coins -= u.cost;
        s.ownedUpgrades.add(u.id);
        UpgradeSystem.applyEffect(s, u.effect);
        UpgradeSystem.grantBaitOnPurchase(ctx, u.effect);
        s.bumpStat(Stats.UPGRADES_BOUGHT);
        const receipt: Receipt = { id: s.newId("receipt"), type: "upgrade", coinDelta: -u.cost, tick: s.tick, reference: requestId };
        s.purchaseReceipts.set(requestId, receipt);
        s.record(receipt);
        ctx.emit({ type: "upgrade_purchased", tick: s.tick, upgradeId: u.id, receipt, replayed: false });
        ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
      }
    }
  },

  grantBaitOnPurchase(ctx: StepContext, effect: UpgradeEffect): void {
    if (effect.kind !== "grant_bait") return;
    const bait = ctx.content.baitById.get(effect.bait);
    if (!bait) return;
    const bag = ctx.state.player.bag;
    let added = 0;
    for (let i = 0; i < effect.quantity; i++) {
      if (bag.roomFor(bait.id) < 1) break;
      bag.add(bait.id, 1);
      added++;
    }
    if (added > 0) {
      ctx.state.bumpStat(Stats.BAIT_BOUGHT, added);
      if (ctx.state.player.preferredBaitId === null) ctx.state.player.preferredBaitId = bait.id;
    }
  },

  applyEffect(s: GameState, effect: UpgradeEffect): void {
    if (effect.kind === "carry_capacity") {
      s.player.bag.capacityUnits = Math.max(s.player.bag.capacityUnits, effect.capacityUnits);
    } else if (effect.kind === "recipe_duration") {
      for (const m of s.machines) {
        if (m.machineId !== effect.machine) continue;
        const current = m.recipeDurations.get(effect.recipe);
        if (current === undefined || effect.durationTicks < current) m.recipeDurations.set(effect.recipe, effect.durationTicks);
      }
    } else if (effect.kind === "catch_speed") {
      s.player.catchSpeedPermille = Math.max(s.player.catchSpeedPermille, effect.speedPermille);
    } else if (effect.kind === "grant_bait") {
      // granted only at purchase via grantBaitOnPurchase
    } else if (effect.kind === "timing_window") {
      const p = s.player;
      p.timingWindowStartPermille = Math.min(p.timingWindowStartPermille, effect.windowStartPermille);
      p.timingWindowEndPermille = Math.max(p.timingWindowEndPermille, effect.windowEndPermille);
      p.timingPerfectStartPermille = Math.min(p.timingPerfectStartPermille, effect.perfectStartPermille);
      p.timingPerfectEndPermille = Math.max(p.timingPerfectEndPermille, effect.perfectEndPermille);
      p.timingPerfectStartPermille = Math.max(
        p.timingWindowStartPermille,
        Math.min(p.timingPerfectStartPermille, p.timingWindowEndPermille - 1),
      );
      p.timingPerfectEndPermille = Math.max(
        p.timingPerfectStartPermille + 1,
        Math.min(p.timingPerfectEndPermille, p.timingWindowEndPermille),
      );
    } else if (effect.kind === "fish_regen") {
      s.player.fishRegenPermille = Math.max(s.player.fishRegenPermille, effect.speedPermille);
    } else if (effect.kind === "worker_move_speed") {
      // Phase 19: staff gear is assigned per-worker via loadouts — purchasing only unlocks the pool.
    } else if (effect.kind === "worker_carry") {
      // Phase 19 loadout gear — no global floor.
    } else if (effect.kind === "worker_catch_speed") {
      // Phase 19 loadout gear — no global floor.
    } else if (effect.kind === "worker_wage") {
      s.workerWagePerWorkerPerHour = Math.max(s.workerWagePerWorkerPerHour, effect.coinsPerWorkerPerHour);
    } else if (effect.kind === "maintenance_discount") {
      s.maintenanceDiscountPerStation = Math.max(s.maintenanceDiscountPerStation, effect.coinsOffPerStation);
    } else if (effect.kind === "bag_spoil_resist") {
      s.bagSpoilPeriodMultPermille = Math.max(s.bagSpoilPeriodMultPermille, effect.periodMultPermille);
    } else if (effect.kind === "counter_spoil_resist") {
      s.counterSpoilPeriodMultPermille = Math.max(s.counterSpoilPeriodMultPermille, effect.periodMultPermille);
    }
    // unlock_fishing_spot / unlock_machine / unlock_counter / grant_bait are ownership-gated
  },
};

export const ProgressionSystem = {
  step(ctx: StepContext): void {
    const s = ctx.state;
    for (const q of ctx.content.quests) {
      if (s.completedQuests.has(q.id)) continue;
      if (!ProgressionSystem.requirementsMet(s, q)) continue;
      if (s.stat(q.goal.stat) < q.goal.atLeast) continue;
      completeQuest(ctx, q);
    }
    const step = ctx.content.tutorial[s.tutorialIndex];
    if (!step) return;
    const t = step.advanceOn;
    const done = t.kind === "enter_zone" ? s.player.zoneId === t.zone : s.stat(t.stat) >= t.atLeast;
    if (done) {
      s.tutorialIndex++;
      ctx.emit({ type: "tutorial_advanced", tick: s.tick, stepIndex: s.tutorialIndex });
    }
  },

  requirementsMet(s: GameState, q: QuestDef): boolean {
    return q.requires.every((r) => s.ownedUpgrades.has(r) || s.completedQuests.has(r));
  },

  missingRequirement(content: ContentPack, s: GameState, q: QuestDef): string | null {
    const missing = q.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
    if (!missing) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  /**
   * Finish 5.0 Phase 3 — progress toward the first unlocked incomplete quest (0..1000).
   * Null when tutorial unfinished or no unlocked quest remains.
   */
  nextQuestProgressPermille(content: ContentPack, s: GameState): number | null {
    if (s.tutorialIndex < content.tutorial.length) return null;
    const q = content.quests.find(
      (quest) => !s.completedQuests.has(quest.id) && ProgressionSystem.requirementsMet(s, quest),
    );
    if (!q) return null;
    const target = Math.max(1, q.goal.atLeast);
    const progress = Math.min(s.stat(q.goal.stat), target);
    return Math.trunc((progress * 1000) / target);
  },
};

function completeQuest(ctx: StepContext, q: QuestDef): void {
  const s = ctx.state;
  s.completedQuests.add(q.id);
  s.bumpStat(Stats.QUESTS_COMPLETED);
  const reward = q.reward;
  if (reward.coins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, reward.coins);
    const receipt: Receipt = { id: s.newId("quest"), type: "quest_reward", coinDelta: reward.coins, tick: s.tick, reference: q.id };
    s.record(receipt);
  }
  for (const uid of reward.unlockUpgrades) {
    const u = ctx.content.upgradesById.get(uid);
    if (!u) continue;
    s.ownedUpgrades.add(uid);
    UpgradeSystem.applyEffect(s, u.effect);
    UpgradeSystem.grantBaitOnPurchase(ctx, u.effect);
  }
  ctx.emit({
    type: "quest_completed", tick: s.tick, questId: q.id,
    coinsRewarded: reward.coins, unlockUpgrades: [...reward.unlockUpgrades],
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "quest" });
}

/**
 * Service reputation from served vs abandoned counters (Phase 13).
 * Computed only — never persisted. Distinct from prestige harbor ★.
 */
export const ReputationSystem = {
  BAND_LABELS: ["Poor", "Fair", "Good", "Great", "Excellent"] as const,

  served(state: GameState): number {
    return state.stat(Stats.SALES);
  },

  abandoned(state: GameState): number {
    return state.stat(Stats.LOST_CUSTOMERS);
  },

  encounters(state: GameState): number {
    return ReputationSystem.served(state) + ReputationSystem.abandoned(state);
  },

  /** Serve-rate permille after optional unmet-preference soft penalty. */
  scorePermille(content: ContentPack, state: GameState): number {
    const def = content.reputation;
    const sales = ReputationSystem.served(state);
    const lost = ReputationSystem.abandoned(state);
    const total = sales + lost;
    const raw = total < def.minSample
      ? def.neutralScorePermille
      : idiv(sales * 1000, total);
    const unmet = state.stat(Stats.UNMET_PREFERENCE_SALES);
    const penalty = sales <= 0 || def.unmetPreferencePenaltyPermille <= 0
      ? 0
      : idiv(unmet * def.unmetPreferencePenaltyPermille, sales);
    return Math.max(1, raw - penalty);
  },

  band(content: ContentPack, state: GameState): number {
    const thresholds = content.reputation.scoreBandThresholdsPermille;
    const score = ReputationSystem.scorePermille(content, state);
    let b = 0;
    for (const t of thresholds) {
      if (score >= t) b++;
      else break;
    }
    return Math.min(thresholds.length, Math.max(0, b));
  },

  bandLabel(content: ContentPack, state: GameState): string {
    const b = ReputationSystem.band(content, state);
    return ReputationSystem.BAND_LABELS[b] ?? ReputationSystem.BAND_LABELS[ReputationSystem.BAND_LABELS.length - 1]!;
  },

  kindSpawnMultPermille(content: ContentPack, state: GameState, kind: string): number {
    const table = content.reputation.kindSpawnMultPermille;
    if (table.length === 0) return 1000;
    const row = table[Math.min(table.length - 1, Math.max(0, ReputationSystem.band(content, state)))]!;
    return row[kind] ?? 1000;
  },
};
