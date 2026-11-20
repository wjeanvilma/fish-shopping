/**
 * Per-tick systems. Each function mirrors the Kotlin object of the same name in game-core;
 * keep them line-for-line comparable so fixture mismatches are easy to trace.
 *
 * Finish 4.0 Phase 2–3: fishing/production/movement + customers/contracts/progression live under ./systems/.
 * Finish 6.0 Phase 4: rivals/economyBank/staffTrees/workers extracted; facade ≤2800.
 */
import type { AchievementDef, BaitDef, ContentPack, ContractTemplateDef, CounterDef, DailyObjectiveDef, DayPartDef, DecorDef, EndgameChallengeDef, EndgameTierDef, FishingSpotDef, HarborDef, ItemQuantity, PlotDef, PointMm, PrestigeMilestoneDef, QuestDef, RecipeDef, RivalMarketDef, RushWindowDef, SeasonalEventDef, SpeciesDef, TidePhaseDef, UpgradeDef, UpgradeEffect, WeatherPatternDef, WorkerDef } from "./content";
import { bankProductById, bankProductRepayAmount, bankRepayAmount } from "./content";
import type { TimingTier, TrophyRecord } from "./state";
import { counterAccepts, queueSlot, rectCenterX, rectCenterZ, rectContains } from "./content";
import { INPUT_SCALE, Prng, SafeMath, TICKS_PER_SECOND, compareStrings, idiv, type OfflineReport } from "./foundations";
import { Inventory, Transfers } from "./inventory";
import { ContractState, CounterState, CustomerState, FishingSpotState, GameState, MachineState, PlayerState, Receipt, Stats, WorkerState, type ContractOffer, type GameEvent, type HarborWorldStash } from "./state";

export { StepContext, PLAYER_RADIUS_MM, isOpen } from "./systems/context";
export { MovementSystem, TransferSystem } from "./systems/movement";
export { FishingSystem, BaitSystem, TrophySystem } from "./systems/fishing";
export { ProductionSystem } from "./systems/production";
export { CustomerSystem } from "./systems/customers";
export { UpgradeSystem, ProgressionSystem, ReputationSystem, type Availability } from "./systems/progression";
export { ContractSystem } from "./systems/contracts";
export { RivalMarketSystem } from "./systems/rivals";
export { EconomySystem, BankSystem } from "./systems/economyBank";
export { StaffTreesSystem } from "./systems/staffTrees";
export { WorkerSystem, AutomationSystem, type WorkerHireAvailability } from "./systems/workers";

import { ProductionSystem } from "./systems/production";
import { FishingSystem, BaitSystem, TrophySystem } from "./systems/fishing";
import { MovementSystem, TransferSystem } from "./systems/movement";
import { StepContext } from "./systems/context";
import { bindSystemsBridge } from "./systems/bridge";
import { WorkerDecisionHooks } from "./systems/workerDecisionHooks";
import { CustomerSystem } from "./systems/customers";
import { UpgradeSystem, ProgressionSystem, ReputationSystem } from "./systems/progression";
import { ContractSystem } from "./systems/contracts";
import { RivalMarketSystem } from "./systems/rivals";
import { EconomySystem, BankSystem } from "./systems/economyBank";
import { StaffTreesSystem } from "./systems/staffTrees";
import { WorkerSystem, AutomationSystem } from "./systems/workers";

// ---------------------------------------------------------------- world/Plots.kt

/** Phase 6 plot construction: walk-to-plot inspect → confirm spend → unlock register. */
export const PlotSystem = {
  plotForUpgrade(harbor: HarborDef, upgradeId: string): PlotDef | undefined {
    return harbor.plots.find((p) => p.grantsUpgrade === upgradeId);
  },

  requiresPlotPresence(harbor: HarborDef, upgradeId: string): boolean {
    return PlotSystem.plotForUpgrade(harbor, upgradeId) !== undefined;
  },

  standingOnPlot(s: GameState, plot: PlotDef): boolean {
    return s.player.zoneId === plot.zone;
  },

  standingOnUpgradePlot(harbor: HarborDef, s: GameState, upgradeId: string): boolean {
    const plot = PlotSystem.plotForUpgrade(harbor, upgradeId);
    if (!plot) return true;
    return PlotSystem.standingOnPlot(s, plot);
  },

  build(ctx: StepContext, plotId: string, requestId: string): void {
    const s = ctx.state;
    const plot = ctx.harbor.plots.find((p) => p.id === plotId);
    if (!plot) {
      ctx.emit({ type: "plot_build_rejected", tick: s.tick, plotId, requestId, reason: "Unknown plot" });
      return;
    }
    const zone = s.player.zoneId ? ctx.harbor.zones.find((z) => z.id === s.player.zoneId) : undefined;
    if (!zone || zone.kind !== "plot" || zone.id !== plot.zone) {
      ctx.emit({ type: "plot_build_rejected", tick: s.tick, plotId, requestId, reason: "Stand on the expansion marker" });
      return;
    }
    const eventCountBefore = ctx.events.length;
    UpgradeSystem.purchase(ctx, plot.grantsUpgrade, requestId);
    const newEvents = ctx.events.slice(eventCountBefore);
    const rejected = [...newEvents].reverse().find((e) => e.type === "purchase_rejected");
    if (rejected && rejected.type === "purchase_rejected") {
      ctx.emit({ type: "plot_build_rejected", tick: s.tick, plotId, requestId, reason: rejected.reason });
      return;
    }
    const purchased = [...newEvents].reverse().find((e) => e.type === "upgrade_purchased");
    if (purchased && purchased.type === "upgrade_purchased") {
      ctx.emit({
        type: "plot_built",
        tick: s.tick,
        plotId,
        upgradeId: plot.grantsUpgrade,
        receipt: purchased.receipt,
        replayed: purchased.replayed,
      });
    }
  },
};

/**
 * Finish 3.0 Phase 12 — ecology habitat pockets boost species catch weights
 * when the active harbor matches and the current day-part is favored.
 */
/** Finish 3.0 Phase 12 + Finish 4.0 Phase 11 + Finish 5.0 Phase 13 — habitat weight pockets (≥24). */
export const EcologySystem = {
  BASELINE_WEIGHT_PERMILLE: 1000,
  HABITAT_FLOOR_PHASE_12: 8,
  HABITAT_FLOOR_PHASE_11: 16,
  HABITAT_FLOOR_PHASE_13: 24,

  habitatWeightMultPermille(
    content: ContentPack,
    tick: number,
    harborId: string,
    speciesId: string,
  ): number {
    const partId = FishingSystem.dayPartAt(content, tick).id;
    let best = EcologySystem.BASELINE_WEIGHT_PERMILLE;
    for (const habitat of content.ecology.habitats ?? []) {
      if (!habitat.harbors.includes(harborId)) continue;
      if (!habitat.favoredDayParts.includes(partId)) continue;
      const mult = habitat.speciesWeightMultPermille?.[speciesId];
      if (mult == null) continue;
      if (mult > best) best = mult;
    }
    return best;
  },

  activeHabitats(content: ContentPack, tick: number, harborId: string): string[] {
    const partId = FishingSystem.dayPartAt(content, tick).id;
    return (content.ecology.habitats ?? [])
      .filter((h) => h.harbors.includes(harborId) && h.favoredDayParts.includes(partId))
      .map((h) => h.id);
  },

  coversSpecies(content: ContentPack, speciesIds: Iterable<string>): boolean {
    const weighted = new Set<string>();
    for (const habitat of content.ecology.habitats ?? []) {
      for (const id of Object.keys(habitat.speciesWeightMultPermille ?? {})) weighted.add(id);
    }
    for (const id of speciesIds) {
      if (!weighted.has(id)) return false;
    }
    return true;
  },

  habitatCount(content: ContentPack): number {
    return content.ecology.habitats?.length ?? 0;
  },

  meetsPhase11Floor(content: ContentPack): boolean {
    return EcologySystem.habitatCount(content) >= EcologySystem.HABITAT_FLOOR_PHASE_11;
  },

  meetsPhase13Floor(content: ContentPack): boolean {
    return EcologySystem.habitatCount(content) >= EcologySystem.HABITAT_FLOOR_PHASE_13;
  },
};

/**
 * Finish 3.0 Phase 14 / Finish 4.0 Phase 15 — single-player rival NPC markets.
 * Active rivals siphon demand when specialty shelves are empty, undercut sale
 * prices, and can be beaten by well-stocked specialty sales. Phase 15 adds AI
 * profiles (siphon/undercut/adaptive/roamer), adaptive revenge aggression, and
 * multi-rival pressure stacking.
 */

/**
 * Phase 24 / Finish 2.0 Phase 16 content-driven seasonal festival weekends.
 * Windows repeat on the sim clock (no live server). Active events boost catch
 * weights, stack crowd/price with weather, unlock banner cosmetics, and gate
 * festival-only customers/contracts.
 */
export const SeasonalEventSystem = {
  active(content: ContentPack, tick: number): SeasonalEventDef | null {
    if (tick <= 0) return null;
    for (const e of content.seasonalEvents.events) {
      const phase = tick % e.periodTicks;
      const end = e.startTick + e.durationTicks;
      if (phase >= e.startTick && phase < end) return e;
    }
    return null;
  },

  ticksRemaining(event: SeasonalEventDef, tick: number): number {
    const phase = tick % event.periodTicks;
    return Math.max(0, event.startTick + event.durationTicks - phase);
  },

  speciesWeightMultPermille(content: ContentPack, tick: number, speciesId: string): number {
    return SeasonalEventSystem.active(content, tick)?.speciesWeightMultPermille?.[speciesId] ?? 1000;
  },

  customerSpawnMultPermille(content: ContentPack, tick: number): number {
    return SeasonalEventSystem.active(content, tick)?.customerSpawnMultPermille ?? 1000;
  },

  priceMultPermille(content: ContentPack, tick: number): number {
    return SeasonalEventSystem.active(content, tick)?.priceMultPermille ?? 1000;
  },

  /** Scale a catch weight by seasonal + ecology habitat multipliers. */
  scaledWeight(
    base: number,
    content: ContentPack,
    tick: number,
    speciesId: string,
    harborId?: string | null,
  ): number {
    let mult = SeasonalEventSystem.speciesWeightMultPermille(content, tick, speciesId);
    if (harborId) {
      mult = Math.trunc((mult * EcologySystem.habitatWeightMultPermille(content, tick, harborId, speciesId)) / 1000);
    }
    return Math.max(1, Math.trunc((base * mult) / 1000));
  },

  step(ctx: StepContext): void {
    const s = ctx.state;
    const cur = SeasonalEventSystem.active(ctx.content, s.tick);
    const prev = s.tick <= 1 ? null : SeasonalEventSystem.active(ctx.content, s.tick - 1);
    if (prev?.id === cur?.id) return;
    if (prev) ctx.emit({ type: "seasonal_event_ended", tick: s.tick, eventId: prev.id, name: prev.name });
    if (cur) {
      if (cur.banner) s.unlockedCosmetics.add(cur.banner);
      ctx.emit({ type: "seasonal_event_started", tick: s.tick, eventId: cur.id, name: cur.name });
    }
    if (s.contractBoardRefreshAt > 0) s.contractBoardRefreshAt = s.tick;
  },
};

/** Cozy art pass 5 decor placement rules (shared contract with Kotlin DecorSystem). */
export const DECOR_PLACEMENT = {
  /** Positions snap to this grid. */
  GRID_MM: 250,
  /** Footprint radius of any placed decor item. */
  RADIUS_MM: 600,
  /** Extra clearance from zones and machine/counter footprints. */
  CLEARANCE_MM: 400,
  /** Keep this far inside the quay edge (the edge band holds scenery props). */
  EDGE_INSET_MM: 1300,
  /** Minimum centre-to-centre spacing between placed decor items. */
  SPACING_MM: 1300,
  /** Keep-out radius around the player spawn and customer entry. */
  KEEP_OUT_MM: 1600,
  /** Keep-out radius around each queue slot. */
  QUEUE_KEEP_OUT_MM: 1100,
} as const;

/**
 * Phase 23 shop decor: buy-once placable cosmetics that add a tiny customer
 * patience buff. Banner-gated pieces reuse prestige cosmetic IDs.
 * Cozy art pass 5: owned decor can be placed on open quay ground per harbor (cosmetic only).
 */
export const DecorSystem = {
  snap(mm: number): number {
    const g = DECOR_PLACEMENT.GRID_MM;
    return Math.round(mm / g) * g;
  },

  /** Why [decorId] cannot stand at (x, z) mm in the active harbor, or null if it can. */
  placementProblem(content: ContentPack, s: GameState, decorId: string, xMm: number, zMm: number): string | null {
    if (!content.decorById.has(decorId)) return "Unknown decor";
    if (!s.ownedDecor.has(decorId)) return "Buy it first";
    const h = content.harbor(s.harborId);
    const P = DECOR_PLACEMENT;
    const land = h.walkable.filter((w) => w.id.includes("land"));
    const inside = land.some((r) =>
      xMm >= r.minX + P.EDGE_INSET_MM && xMm <= r.maxX - P.EDGE_INSET_MM &&
      zMm >= r.minZ + P.EDGE_INSET_MM && zMm <= r.maxZ - P.EDGE_INSET_MM);
    if (!inside) return "Place it on open quay ground";
    const reach = P.RADIUS_MM + P.CLEARANCE_MM;
    const near = (r: { minX: number; minZ: number; maxX: number; maxZ: number }) => {
      const dx = Math.max(r.minX - xMm, 0, xMm - r.maxX);
      const dz = Math.max(r.minZ - zMm, 0, zMm - r.maxZ);
      return dx * dx + dz * dz < reach * reach;
    };
    if (h.obstacles.some(near)) return "Too close to a station";
    if (h.zones.some(near)) return "Too close to a work area";
    const far = (x: number, z: number, r: number) => (x - xMm) * (x - xMm) + (z - zMm) * (z - zMm) >= r * r;
    if (!far(h.playerSpawn.x, h.playerSpawn.z, P.KEEP_OUT_MM)) return "Keep the spawn point clear";
    if (!far(h.customerEntry.x, h.customerEntry.z, P.KEEP_OUT_MM)) return "Keep the entrance clear";
    for (const c of h.counters) {
      for (let i = 0; i < c.maxQueue; i++) {
        const q = queueSlot(c, i);
        if (!far(q.x, q.z, P.QUEUE_KEEP_OUT_MM)) return "Keep the queue clear";
      }
    }
    const placed = s.decorPlacements.get(s.harborId);
    if (placed) {
      for (const [id, p] of placed) {
        if (id !== decorId && !far(p.xMm, p.zMm, P.SPACING_MM)) return "Too close to other decor";
      }
    }
    return null;
  },

  place(ctx: StepContext, decorId: string, xMm: number, zMm: number, rotationQuarter: number): void {
    const s = ctx.state;
    const x = DecorSystem.snap(Math.trunc(xMm));
    const z = DecorSystem.snap(Math.trunc(zMm));
    const rot = ((Math.trunc(rotationQuarter) % 4) + 4) % 4;
    const problem = DecorSystem.placementProblem(ctx.content, s, decorId, x, z);
    if (problem) {
      ctx.emit({ type: "decor_place_rejected", tick: s.tick, decorId, reason: problem });
      return;
    }
    let placed = s.decorPlacements.get(s.harborId);
    if (!placed) {
      placed = new Map();
      s.decorPlacements.set(s.harborId, placed);
    }
    const moved = placed.has(decorId);
    placed.set(decorId, { xMm: x, zMm: z, rotationQuarter: rot });
    ctx.emit({ type: "decor_placed", tick: s.tick, decorId, harborId: s.harborId, xMm: x, zMm: z, rotationQuarter: rot, moved });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "decor" });
  },

  store(ctx: StepContext, decorId: string): void {
    const s = ctx.state;
    const placed = s.decorPlacements.get(s.harborId);
    if (!placed || !placed.delete(decorId)) {
      ctx.emit({ type: "decor_place_rejected", tick: s.tick, decorId, reason: "Not placed here" });
      return;
    }
    if (placed.size === 0) s.decorPlacements.delete(s.harborId);
    ctx.emit({ type: "decor_stored", tick: s.tick, decorId, harborId: s.harborId });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "decor" });
  },

  patienceBonusTicks(content: ContentPack, s: GameState): number {
    let sum = 0;
    for (const d of content.decor.items) {
      if (s.ownedDecor.has(d.id)) sum += d.patienceBonusTicks;
    }
    return sum;
  },

  missingRequirement(content: ContentPack, s: GameState, def: DecorDef): string | null {
    const cos = def.requiresCosmetic;
    if (!cos || s.unlockedCosmetics.has(cos)) return null;
    return content.prestige.milestones.find((m) => m.reward.cosmetic === cos)?.name ?? cos;
  },

  purchase(ctx: StepContext, decorId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({ type: "decor_purchased", tick: s.tick, decorId, receipt: prior, replayed: true });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "decor_purchase_rejected", tick: s.tick, decorId, requestId, reason });
    };
    const def = ctx.content.decorById.get(decorId);
    if (!def) return reject("Unknown decor");
    if (s.ownedDecor.has(def.id)) return reject("Already owned");
    const miss = DecorSystem.missingRequirement(ctx.content, s, def);
    if (miss) return reject(`Requires: ${miss}`);
    if (s.coins < def.cost) return reject(`Need ${def.cost - s.coins} more coins`);
    s.coins -= def.cost;
    s.ownedDecor.add(def.id);
    s.bumpStat(Stats.DECOR_BOUGHT);
    const receipt: Receipt = { id: s.newId("receipt"), type: "decor", coinDelta: -def.cost, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({ type: "decor_purchased", tick: s.tick, decorId: def.id, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },
};

/**
 * Finish 3.0 Phase 15 / schema 24 — endgame deepen board.
 * Tiers + challenges unlock after prestige; bonuses rebuild from unlockedEndgameTiers.
 */
export const EndgameSystem = {
  boardUnlocked(content: ContentPack, s: GameState): boolean {
    return s.completedPrestige.size >= content.endgame.requiresPrestigeCount;
  },

  missingBoardRequirement(content: ContentPack, s: GameState): string | null {
    if (EndgameSystem.boardUnlocked(content, s)) return null;
    const need = content.endgame.requiresPrestigeCount;
    return `Prestige milestones (${s.completedPrestige.size}/${need})`;
  },

  tierRequirementsMet(s: GameState, tier: EndgameTierDef): boolean {
    return (
      s.completedPrestige.size >= tier.requiresPrestigeCount &&
      s.beatenRivalIds.size >= tier.requiresRivalBeats &&
      s.completedEndgameChallenges.size >= tier.requiresChallenges &&
      s.endgameMarks.size >= (tier.requiresMarks ?? 0) &&
      s.endgameCrests.size >= (tier.requiresCrests ?? 0) &&
      s.endgameSigils.size >= (tier.requiresSigils ?? 0)
    );
  },

  step(ctx: StepContext): void {
    if (!EndgameSystem.boardUnlocked(ctx.content, ctx.state)) return;
    for (const ch of ctx.content.endgame.challenges) {
      if (ctx.state.completedEndgameChallenges.has(ch.id)) continue;
      if (ctx.state.stat(ch.stat) < ch.atLeast) continue;
      completeEndgameChallenge(ctx, ch);
    }
    for (const tier of ctx.content.endgame.tiers) {
      if (ctx.state.unlockedEndgameTiers.has(tier.id)) continue;
      if (!EndgameSystem.tierRequirementsMet(ctx.state, tier)) continue;
      unlockEndgameTier(ctx, tier);
    }
  },

  applyTierReward(s: GameState, tier: EndgameTierDef): void {
    if (tier.catchSpeedPermille > 0) {
      s.endgameCatchSpeedPermille = Math.max(s.endgameCatchSpeedPermille, tier.catchSpeedPermille);
    }
    if (tier.priceBonusPermille > 0) {
      s.endgamePriceBonusPermille = Math.max(s.endgamePriceBonusPermille, tier.priceBonusPermille);
    }
  },
};

function completeEndgameChallenge(ctx: StepContext, ch: EndgameChallengeDef): void {
  const s = ctx.state;
  s.completedEndgameChallenges.add(ch.id);
  s.bumpStat(Stats.ENDGAME_CHALLENGES_COMPLETED);
  const mark = ch.grantsMark ?? null;
  if (mark && !s.endgameMarks.has(mark)) {
    s.endgameMarks.add(mark);
    s.bumpStat(Stats.ENDGAME_MARKS_EARNED);
  }
  const crest = ch.grantsCrest ?? null;
  if (crest && !s.endgameCrests.has(crest)) {
    s.endgameCrests.add(crest);
    s.bumpStat(Stats.ENDGAME_CRESTS_EARNED);
  }
  const sigil = ch.grantsSigil ?? null;
  if (sigil && !s.endgameSigils.has(sigil)) {
    s.endgameSigils.add(sigil);
    s.bumpStat(Stats.ENDGAME_SIGILS_EARNED);
  }
  if (ch.rewardCoins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, ch.rewardCoins);
    const receipt: Receipt = {
      id: s.newId("endgame_challenge"),
      type: "endgame_challenge_reward",
      coinDelta: ch.rewardCoins,
      tick: s.tick,
      reference: ch.id,
    };
    s.record(receipt);
  }
  ctx.emit({
    type: "endgame_challenge_completed",
    tick: s.tick,
    challengeId: ch.id,
    coinsRewarded: ch.rewardCoins,
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "endgame_challenge" });
}

function unlockEndgameTier(ctx: StepContext, tier: EndgameTierDef): void {
  const s = ctx.state;
  s.unlockedEndgameTiers.add(tier.id);
  s.bumpStat(Stats.ENDGAME_TIERS_UNLOCKED);
  if (tier.coins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, tier.coins);
    const receipt: Receipt = {
      id: s.newId("endgame_tier"),
      type: "endgame_tier_reward",
      coinDelta: tier.coins,
      tick: s.tick,
      reference: tier.id,
    };
    s.record(receipt);
  }
  EndgameSystem.applyTierReward(s, tier);
  ctx.emit({
    type: "endgame_tier_unlocked",
    tick: s.tick,
    tierId: tier.id,
    coinsRewarded: tier.coins,
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "endgame_tier" });
}

/**
 * Prestige-lite (Phase 20): permanent milestone bonuses and cosmetics without wiping
 * the save. Effects are rebuilt from completedPrestige on load.
 */
export const PrestigeSystem = {
  boardUnlocked(content: ContentPack, s: GameState): boolean {
    return content.prestige.requires.every((it) =>
      s.ownedUpgrades.has(it) || s.completedQuests.has(it) || s.completedPrestige.has(it));
  },

  missingBoardRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.prestige.requires.find((it) =>
      !s.ownedUpgrades.has(it) && !s.completedQuests.has(it) && !s.completedPrestige.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? content.prestigeMilestonesById.get(missing)?.name
      ?? missing;
  },

  requirementsMet(s: GameState, m: PrestigeMilestoneDef): boolean {
    return m.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it) || s.completedPrestige.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState, m: PrestigeMilestoneDef): string | null {
    const missing = m.requires.find((it) =>
      !s.ownedUpgrades.has(it) && !s.completedQuests.has(it) && !s.completedPrestige.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? content.prestigeMilestonesById.get(missing)?.name
      ?? missing;
  },

  /** Harbor rating stars 0..5 from lifetime revenue vs content thresholds. */
  harborRating(content: ContentPack, s: GameState): number {
    const revenue = s.stat(Stats.REVENUE);
    let stars = 0;
    for (const threshold of content.prestige.ratingThresholds) {
      if (revenue >= threshold) stars++;
      else break;
    }
    return Math.max(0, Math.min(5, stars));
  },

  step(ctx: StepContext): void {
    if (!PrestigeSystem.boardUnlocked(ctx.content, ctx.state)) return;
    for (const m of ctx.content.prestige.milestones) {
      if (ctx.state.completedPrestige.has(m.id)) continue;
      if (!PrestigeSystem.requirementsMet(ctx.state, m)) continue;
      if (ctx.state.stat(m.goal.stat) < m.goal.atLeast) continue;
      completePrestige(ctx, m);
    }
  },

  applyReward(s: GameState, m: PrestigeMilestoneDef): void {
    const r = m.reward;
    if (r.catchSpeedPermille > 0) {
      s.prestigeCatchSpeedPermille = Math.max(s.prestigeCatchSpeedPermille, r.catchSpeedPermille);
    }
    if (r.priceBonusPermille > 0) {
      s.prestigePriceBonusPermille = Math.max(s.prestigePriceBonusPermille, r.priceBonusPermille);
    }
    if (r.cosmetic) s.unlockedCosmetics.add(r.cosmetic);
  },
};

function completePrestige(ctx: StepContext, m: PrestigeMilestoneDef): void {
  const s = ctx.state;
  s.completedPrestige.add(m.id);
  s.bumpStat(Stats.PRESTIGE_COMPLETED);
  const reward = m.reward;
  if (reward.coins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, reward.coins);
    const receipt: Receipt = { id: s.newId("prestige"), type: "prestige_reward", coinDelta: reward.coins, tick: s.tick, reference: m.id };
    s.record(receipt);
  }
  PrestigeSystem.applyReward(s, m);
  ctx.emit({
    type: "prestige_unlocked",
    tick: s.tick,
    prestigeId: m.id,
    coinsRewarded: reward.coins,
    cosmetic: reward.cosmetic ?? null,
    catchSpeedPermille: reward.catchSpeedPermille,
    priceBonusPermille: reward.priceBonusPermille,
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "prestige" });
}

/**
 * Finish 2.0 Phase 18 — local daily objectives + login streak (no network).
 * Wall clock is pushed via [syncClock]; day, streak, board, and claims live in stats (schema 23).
 */
export const DailyGoalsSystem = {
  WALL_MS: "stat.daily_goals_wall_ms",
  DAY_ID: "stat.daily_goals_day_id",
  STREAK: Stats.DAILY_LOGIN_STREAK,
  LAST_STREAK_DAY: "stat.daily_goals_last_streak_day",

  boardSlotKey(index: number): string {
    return `stat.daily_board_${index}`;
  },
  baselineKey(stat: string): string {
    return `stat.daily_baseline.${stat}`;
  },
  claimedDayKey(objectiveId: string): string {
    return `stat.daily_claimed_day.${objectiveId}`;
  },

  wallClockEpochMs(state: GameState): number {
    return state.stat(DailyGoalsSystem.WALL_MS);
  },

  dayId(content: ContentPack, epochMs: number): number {
    const len = Math.max(1, content.dailyGoals.dayLengthMs);
    return Math.trunc(Math.max(0, epochMs) / len);
  },

  currentDayId(content: ContentPack, state: GameState): number {
    const wall = DailyGoalsSystem.wallClockEpochMs(state);
    if (wall <= 0) return state.stat(DailyGoalsSystem.DAY_ID);
    return DailyGoalsSystem.dayId(content, wall);
  },

  streak(state: GameState): number {
    return Math.max(0, state.stat(DailyGoalsSystem.STREAK));
  },

  boardObjectives(content: ContentPack, state: GameState): DailyObjectiveDef[] {
    const out: DailyObjectiveDef[] = [];
    const slots = content.dailyGoals.boardSlots;
    for (let i = 0; i < slots; i++) {
      const idx = state.stat(DailyGoalsSystem.boardSlotKey(i)) - 1;
      if (idx >= 0 && idx < content.dailyGoals.objectives.length) {
        out.push(content.dailyGoals.objectives[idx]!);
      }
    }
    return out;
  },

  progress(content: ContentPack, state: GameState, objective: DailyObjectiveDef): number {
    const baseline = state.stat(DailyGoalsSystem.baselineKey(objective.goal.stat));
    return Math.max(0, state.stat(objective.goal.stat) - baseline);
  },

  isComplete(content: ContentPack, state: GameState, objective: DailyObjectiveDef): boolean {
    return DailyGoalsSystem.progress(content, state, objective) >= objective.goal.atLeast;
  },

  isClaimed(content: ContentPack, state: GameState, objective: DailyObjectiveDef): boolean {
    const day = DailyGoalsSystem.currentDayId(content, state);
    if (day <= 0) return false;
    return state.stat(DailyGoalsSystem.claimedDayKey(objective.id)) === day;
  },

  claimRewardCoins(content: ContentPack, state: GameState, objective: DailyObjectiveDef): number {
    const streakBonus = Math.min(DailyGoalsSystem.streak(state), content.dailyGoals.maxStreakBonusDays)
      * content.dailyGoals.streakBonusCoinsPerDay;
    return objective.rewardCoins + streakBonus;
  },

  syncClock(ctx: StepContext, epochMs: number): void {
    const s = ctx.state;
    s.stats.set(DailyGoalsSystem.WALL_MS, Math.max(0, epochMs));
    rolloverIfNeeded(ctx);
  },

  step(ctx: StepContext): void {
    if (DailyGoalsSystem.wallClockEpochMs(ctx.state) <= 0) return;
    rolloverIfNeeded(ctx);
  },

  claim(ctx: StepContext, objectiveId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "daily_goal_claimed",
        tick: s.tick,
        objectiveId,
        payout: existing.coinDelta,
        streak: DailyGoalsSystem.streak(s),
        receipt: existing,
        replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "daily_goal_rejected", tick: s.tick, objectiveId, requestId, reason });
    };
    if (DailyGoalsSystem.wallClockEpochMs(s) <= 0) {
      reject("Wall clock not synced");
      return;
    }
    rolloverIfNeeded(ctx);
    const objective = ctx.content.dailyObjectivesById.get(objectiveId);
    if (!objective) {
      reject("Unknown daily objective");
      return;
    }
    if (!DailyGoalsSystem.boardObjectives(ctx.content, s).some((o) => o.id === objectiveId)) {
      reject("Not on today's board");
      return;
    }
    if (DailyGoalsSystem.isClaimed(ctx.content, s, objective)) {
      reject("Already claimed today");
      return;
    }
    if (!DailyGoalsSystem.isComplete(ctx.content, s, objective)) {
      reject("Objective not complete");
      return;
    }
    const payout = DailyGoalsSystem.claimRewardCoins(ctx.content, s, objective);
    const day = DailyGoalsSystem.currentDayId(ctx.content, s);
    s.stats.set(DailyGoalsSystem.claimedDayKey(objectiveId), day);
    if (payout > 0) s.coins = SafeMath.creditCoins(s.coins, payout);
    s.bumpStat(Stats.DAILY_GOALS_CLAIMED);
    const receipt: Receipt = {
      id: s.newId("daily"),
      type: "daily_goal_reward",
      coinDelta: payout,
      tick: s.tick,
      reference: objectiveId,
    };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({
      type: "daily_goal_claimed",
      tick: s.tick,
      objectiveId,
      payout,
      streak: DailyGoalsSystem.streak(s),
      receipt,
      replayed: false,
    });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "daily_goal" });
  },

  journalLines(content: ContentPack, state: GameState, report: OfflineReport): string[] {
    const lines: string[] = [];
    if (report.capped) {
      lines.push(`Away time hit the ${content.offline.capHours}h catch-up cap.`);
    }
    if (report.fishCaught > 0) {
      lines.push(`Crew landed ${report.fishCaught} fish while you were out.`);
    }
    if (report.sales > 0) {
      lines.push(`Counters rang up ${report.sales} sales offline.`);
    }
    if (report.workerFishCaught > 0 || report.workerItemsMoved > 0) {
      lines.push(
        `Staff kept the harbor moving (catch ${report.workerFishCaught}, hauls ${report.workerItemsMoved}).`,
      );
    }
    if (report.coinsDelta > 0) {
      lines.push(`Harbor purse grew by ${report.coinsDelta} coins.`);
    } else if (report.coinsDelta < 0) {
      lines.push(`Away-time upkeep cost ${-report.coinsDelta} coins.`);
    }
    // Finish 4.0 Phase 21 — deeper offline journal categories.
    if ((report.contractsCompleted ?? 0) > 0) {
      const n = report.contractsCompleted!;
      lines.push(`Crew finished ${n} delivery contract${n === 1 ? "" : "s"} offline.`);
    }
    if ((report.maintenancePaid ?? 0) > 0) {
      lines.push(`Station upkeep took ${report.maintenancePaid} coins while away.`);
    }
    if ((report.itemsSpoiled ?? 0) > 0) {
      lines.push(`${report.itemsSpoiled} stock spoiled on the pads.`);
    }
    if ((report.rivalBeats ?? 0) > 0) {
      const n = report.rivalBeats!;
      lines.push(`Harbor beat rival pressure ${n} time${n === 1 ? "" : "s"}.`);
    }
    // Finish 5.0 Phase 22 — offline sim fidelity journal categories.
    if ((report.wagesPaid ?? 0) > 0) {
      lines.push(`Staff wages drew ${report.wagesPaid} coins while away.`);
    }
    if ((report.repairSpent ?? 0) > 0) {
      lines.push(`Machine repairs cost ${report.repairSpent} coins offline.`);
    }
    if ((report.loanInterestAccrued ?? 0) > 0) {
      lines.push(`Loan interest accrued ${report.loanInterestAccrued} coins.`);
    }
    if ((report.revenueDelta ?? 0) > 0) {
      lines.push(`Committed sales booked ${report.revenueDelta} coins offline.`);
    }
    // Finish 6.0 Phase 18 — nest journal fidelity categories.
    if ((report.loanRepaid ?? 0) > 0) {
      lines.push(`Nest treasury repaid ${report.loanRepaid} loan coins offline.`);
    }
    if ((report.contractRevenue ?? 0) > 0) {
      lines.push(`Delivery contracts booked ${report.contractRevenue} coins while away.`);
    }
    if ((report.rivalSalesStolen ?? 0) > 0) {
      lines.push(`Rivals siphoned ${report.rivalSalesStolen} coins from the nest.`);
    }
    if ((report.endgameSigilsEarned ?? 0) > 0) {
      const n = report.endgameSigilsEarned!;
      lines.push(`Nest earned ${n} endgame sigil${n === 1 ? "" : "s"} offline.`);
    }
    const streak = DailyGoalsSystem.streak(state);
    if (streak > 0) {
      lines.push(`Harbor streak: ${streak} day${streak === 1 ? "" : "s"}.`);
    }
    const board = DailyGoalsSystem.boardObjectives(content, state);
    const claimable = board.filter(
      (o) => DailyGoalsSystem.isComplete(content, state, o) && !DailyGoalsSystem.isClaimed(content, state, o),
    ).length;
    if (claimable > 0) {
      lines.push(`${claimable} daily objective${claimable === 1 ? "" : "s"} ready to claim.`);
    }
    if (board.length > 0) {
      lines.push(`Today's board has ${board.length} daily slot${board.length === 1 ? "" : "s"}.`);
    }
    if (lines.length === 0 && report.hadActivity) {
      lines.push("Harbor kept a quiet watch while you were away.");
    }
    return lines;
  },
};

function rolloverIfNeeded(ctx: StepContext): void {
  const s = ctx.state;
  const content = ctx.content;
  const wall = DailyGoalsSystem.wallClockEpochMs(s);
  if (wall <= 0) return;
  const newDay = DailyGoalsSystem.dayId(content, wall);
  const oldDay = s.stat(DailyGoalsSystem.DAY_ID);
  if (oldDay === newDay && DailyGoalsSystem.boardObjectives(content, s).length > 0) return;

  const previousStreakDay = s.stat(DailyGoalsSystem.LAST_STREAK_DAY);
  let nextStreak: number;
  if (previousStreakDay <= 0) nextStreak = 1;
  else if (previousStreakDay === newDay) nextStreak = Math.max(1, DailyGoalsSystem.streak(s));
  else if (previousStreakDay === newDay - 1) nextStreak = DailyGoalsSystem.streak(s) + 1;
  else nextStreak = 1;

  s.stats.set(DailyGoalsSystem.DAY_ID, newDay);
  s.stats.set(DailyGoalsSystem.STREAK, nextStreak);
  s.stats.set(DailyGoalsSystem.LAST_STREAK_DAY, newDay);

  for (const stat of [...new Set(content.dailyGoals.objectives.map((o) => o.goal.stat))]) {
    s.stats.set(DailyGoalsSystem.baselineKey(stat), s.stat(stat));
  }
  refreshDailyBoard(content, s, newDay);
  if (oldDay !== 0 && oldDay !== newDay) {
    ctx.emit({ type: "daily_goals_rolled", tick: s.tick, dayId: newDay, streak: nextStreak });
  }
}

function refreshDailyBoard(content: ContentPack, state: GameState, day: number): void {
  const def = content.dailyGoals;
  const pool = [...def.objectives];
  const rng = new Prng((day ^ 0x5a1eda11) | 0);
  const slots = Math.min(def.boardSlots, pool.length);
  for (let i = 0; i < def.boardSlots; i++) {
    state.stats.delete(DailyGoalsSystem.boardSlotKey(i));
  }
  for (let i = 0; i < slots; i++) {
    if (pool.length === 0) break;
    const idxInPool = rng.pickWeighted(pool.map((it) => it.weight));
    const picked = pool.splice(idxInPool, 1)[0]!;
    const contentIndex = def.objectives.findIndex((it) => it.id === picked.id);
    if (contentIndex >= 0) {
      state.stats.set(DailyGoalsSystem.boardSlotKey(i), contentIndex + 1);
    }
  }
}

/**
 * Finish 2.0 Phase 11 — content-driven achievements granted into
 * GameState.unlockedAchievements.
 */
export const AchievementSystem = {
  step(ctx: StepContext): void {
    for (const a of ctx.content.achievements.entries) {
      if (ctx.state.unlockedAchievements.has(a.id)) continue;
      if (ctx.state.stat(a.goal.stat) < a.goal.atLeast) continue;
      unlockAchievement(ctx, a);
    }
  },
};

function unlockAchievement(ctx: StepContext, a: AchievementDef): void {
  const s = ctx.state;
  s.unlockedAchievements.add(a.id);
  s.bumpStat(Stats.ACHIEVEMENTS_UNLOCKED);
  if (a.rewardCoins > 0) {
    s.coins = SafeMath.creditCoins(s.coins, a.rewardCoins);
    const receipt: Receipt = {
      id: s.newId("achieve"),
      type: "achievement_reward",
      coinDelta: a.rewardCoins,
      tick: s.tick,
      reference: a.id,
    };
    s.record(receipt);
  }
  ctx.emit({
    type: "achievement_unlocked",
    tick: s.tick,
    achievementId: a.id,
    coinsRewarded: a.rewardCoins,
  });
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "achievement" });
}

/**
 * Finish 2.0 Phase 14 — per-species fishing mastery XP, rod techniques, coaching hooks.
 */
export const MasterySystem = {
  xpOf(state: GameState, speciesId: string): number {
    return state.speciesMasteryXp.get(speciesId) ?? 0;
  },

  levelForXp(content: ContentPack, xp: number): number {
    const thresholds = content.fishingMastery.xpThresholds;
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (xp >= thresholds[i]!) level = i + 1;
      else break;
    }
    return Math.max(1, Math.min(level, content.fishingMastery.maxLevel));
  },

  levelOf(content: ContentPack, state: GameState, speciesId: string): number {
    return MasterySystem.levelForXp(content, MasterySystem.xpOf(state, speciesId));
  },

  xpToNext(content: ContentPack, xp: number): number | null {
    const thresholds = content.fishingMastery.xpThresholds;
    const level = MasterySystem.levelForXp(content, xp);
    if (level >= content.fishingMastery.maxLevel) return null;
    return thresholds[level]! - xp;
  },

  globalLevel(content: ContentPack, state: GameState): number {
    if (state.speciesMasteryXp.size === 0) return 0;
    let max = 0;
    for (const id of state.speciesMasteryXp.keys()) {
      max = Math.max(max, MasterySystem.levelOf(content, state, id));
    }
    return max;
  },

  isUnlocked(content: ContentPack, state: GameState, tech: { requiresMasteryLevel: number }): boolean {
    return MasterySystem.globalLevel(content, state) >= tech.requiresMasteryLevel;
  },

  technique(content: ContentPack, state: GameState) {
    const active = state.activeTechniqueId;
    if (active) {
      const tech = content.techniquesById.get(active);
      if (tech && MasterySystem.isUnlocked(content, state, tech)) return tech;
    }
    return content.fishingMastery.techniques.find((t) => MasterySystem.isUnlocked(content, state, t))!;
  },

  select(state: GameState, content: ContentPack, techniqueId: string | null): void {
    if (techniqueId == null) {
      state.activeTechniqueId = null;
      return;
    }
    const tech = content.techniquesById.get(techniqueId);
    if (!tech || !MasterySystem.isUnlocked(content, state, tech)) return;
    state.activeTechniqueId = techniqueId;
  },

  catchSpeedMultPermille(content: ContentPack, state: GameState, speciesId: string | null): number {
    const tech = MasterySystem.technique(content, state);
    let mult = tech.catchSpeedMultPermille;
    if (speciesId) {
      const level = MasterySystem.levelOf(content, state, speciesId);
      const per = content.fishingMastery.catchSpeedPermillePerLevel;
      mult = idiv(mult * (1000 + per * (level - 1)), 1000);
    }
    return Math.max(1, mult);
  },

  rareChanceBonusPermille(content: ContentPack, state: GameState, speciesId: string | null): number {
    const tech = MasterySystem.technique(content, state);
    let bonus = tech.rareChanceBonusPermille;
    if (speciesId) {
      const level = MasterySystem.levelOf(content, state, speciesId);
      bonus += content.fishingMastery.rareChanceBonusPermillePerLevel * (level - 1);
    }
    return Math.max(0, Math.min(1000, bonus));
  },

  timingWindows(content: ContentPack, state: GameState): {
    goodStart: number; goodEnd: number; perfectStart: number; perfectEnd: number;
  } {
    const p = state.player;
    const tech = MasterySystem.technique(content, state);
    let goodStart = Math.max(0, Math.min(999, p.timingWindowStartPermille + tech.windowStartDeltaPermille));
    let goodEnd = Math.max(1, Math.min(1000, p.timingWindowEndPermille + tech.windowEndDeltaPermille));
    if (goodStart >= goodEnd) {
      goodStart = p.timingWindowStartPermille;
      goodEnd = p.timingWindowEndPermille;
    }
    let perfectStart = Math.max(0, Math.min(999, p.timingPerfectStartPermille + tech.perfectStartDeltaPermille));
    let perfectEnd = Math.max(1, Math.min(1000, p.timingPerfectEndPermille + tech.perfectEndDeltaPermille));
    if (perfectStart >= perfectEnd) {
      perfectStart = p.timingPerfectStartPermille;
      perfectEnd = p.timingPerfectEndPermille;
    }
    perfectStart = Math.max(perfectStart, goodStart);
    perfectEnd = Math.min(perfectEnd, goodEnd);
    if (perfectStart >= perfectEnd) {
      perfectStart = p.timingPerfectStartPermille;
      perfectEnd = p.timingPerfectEndPermille;
    }
    return { goodStart, goodEnd, perfectStart, perfectEnd };
  },

  timingBonusPermille(content: ContentPack, state: GameState, tier: TimingTier): number {
    const base = FishingSystem.timingBonusPermille(content, tier);
    if (tier !== "perfect") return base;
    return base + MasterySystem.technique(content, state).perfectBonusPermille;
  },

  grantCatchXp(
    ctx: StepContext,
    speciesId: string,
    timingTier: TimingTier,
    rare: boolean,
    xpMultPermille = 1000,
  ): void {
    const s = ctx.state;
    const m = ctx.content.fishingMastery;
    let gain = m.xpCatch;
    if (timingTier === "perfect") gain += m.xpPerfectReel;
    else if (timingTier === "good") gain += m.xpGoodReel;
    if (rare) gain += m.xpRareCatch;
    gain = Math.max(0, idiv(gain * Math.max(1, xpMultPermille), 1000));
    if (gain <= 0) return;
    const before = MasterySystem.xpOf(s, speciesId);
    const beforeLevel = MasterySystem.levelForXp(ctx.content, before);
    const after = before + gain;
    s.speciesMasteryXp.set(speciesId, after);
    s.bumpStat(Stats.MASTERY_XP, gain);
    const afterLevel = MasterySystem.levelForXp(ctx.content, after);
    ctx.emit({
      type: "mastery_xp_gained", tick: s.tick, speciesId, xpGained: gain, totalXp: after, level: afterLevel,
    });
    if (afterLevel > beforeLevel) {
      s.bumpStat(Stats.MASTERY_LEVEL_UPS);
      ctx.emit({ type: "mastery_level_up", tick: s.tick, speciesId, level: afterLevel });
    }
  },

  coachingTip(content: ContentPack, state: GameState): string | null {
    const global = MasterySystem.globalLevel(content, state);
    let maxSpecies = 0;
    for (const id of state.speciesMasteryXp.keys()) {
      maxSpecies = Math.max(maxSpecies, MasterySystem.levelOf(content, state, id));
    }
    const tip = content.fishingMastery.coachingTips.find(
      (t) => global >= t.minGlobalLevel && global <= t.maxGlobalLevel && maxSpecies >= t.minSpeciesLevel,
    );
    return tip?.text ?? null;
  },
};

/**
 * Finish 2.0 Phase 13 — deterministic weather cycle + tide phases.
 */
export const WeatherSystem = {
  weatherAt(content: ContentPack, tick: number): WeatherPatternDef {
    const patterns = content.weather.patterns;
    const total = Math.max(1, patterns.reduce((sum, p) => sum + p.durationTicks, 0));
    let t = ((tick % total) + total) % total;
    for (const p of patterns) {
      if (t < p.durationTicks) return p;
      t -= p.durationTicks;
    }
    return patterns[patterns.length - 1]!;
  },

  tidePhaseAt(content: ContentPack, tick: number): TidePhaseDef {
    const tide = content.weather.tide;
    const phase = idiv((tick % tide.periodTicks) * 1000, tide.periodTicks);
    return tide.phases.find((p) => phase < p.endPermille)!;
  },

  ticksUntilWeatherChange(content: ContentPack, tick: number): number {
    const patterns = content.weather.patterns;
    const total = Math.max(1, patterns.reduce((sum, p) => sum + p.durationTicks, 0));
    let t = ((tick % total) + total) % total;
    for (const p of patterns) {
      if (t < p.durationTicks) return Math.max(1, p.durationTicks - t);
      t -= p.durationTicks;
    }
    return patterns[patterns.length - 1]!.durationTicks;
  },

  ticksUntilTideChange(content: ContentPack, tick: number): number {
    const tide = content.weather.tide;
    const period = tide.periodTicks;
    const phasePermille = idiv((tick % period) * 1000, period);
    const current = tide.phases.find((p) => phasePermille < p.endPermille)!;
    const endTickInPeriod = idiv(current.endPermille * period, 1000);
    const pos = tick % period;
    return Math.max(1, endTickInPeriod - pos);
  },

  catchSpeedMultPermille(content: ContentPack, state: GameState): number {
    const weather = WeatherSystem.weatherAt(content, state.tick);
    const tide = WeatherSystem.tideCatchMultPermille(content, state);
    return Math.max(1, idiv(weather.catchSpeedMultPermille * tide, 1000));
  },

  regenMultPermille(content: ContentPack, state: GameState): number {
    const weather = WeatherSystem.weatherAt(content, state.tick);
    let tide = WeatherSystem.tidePhaseAt(content, state.tick).regenMultPermille;
    if (FishingSystem.hasTideChart(state) && tide > 1000) {
      const ease = content.weather.tide.chartRegenEasePermille;
      tide = 1000 + idiv((tide - 1000) * (1000 - ease), 1000);
    }
    return Math.max(1, idiv(weather.regenMultPermille * tide, 1000));
  },

  customerSpawnMultPermille(content: ContentPack, state: GameState): number {
    const weather = WeatherSystem.weatherAt(content, state.tick);
    let tide = WeatherSystem.tidePhaseAt(content, state.tick).customerSpawnMultPermille;
    if (FishingSystem.hasTideChart(state)) {
      tide += content.weather.tide.chartCrowdBonusPermille;
    }
    return Math.max(1, idiv(weather.customerSpawnMultPermille * tide, 1000));
  },

  rareChanceBonusPermille(content: ContentPack, tick: number): number {
    return WeatherSystem.weatherAt(content, tick).rareChanceBonusPermille;
  },

  tideCatchMultPermille(content: ContentPack, state: GameState): number {
    let mult = WeatherSystem.tidePhaseAt(content, state.tick).catchSpeedMultPermille;
    if (FishingSystem.hasTideChart(state)) {
      mult += content.weather.tide.chartCatchBonusPermille;
    }
    return Math.max(1, mult);
  },

  step(ctx: StepContext): void {
    const tick = ctx.state.tick;
    if (tick <= 0) return;
    const prevWeather = WeatherSystem.weatherAt(ctx.content, tick - 1);
    const curWeather = WeatherSystem.weatherAt(ctx.content, tick);
    if (prevWeather.id !== curWeather.id) {
      ctx.emit({ type: "weather_changed", tick, weatherId: curWeather.id, name: curWeather.name });
    }
    const prevTide = WeatherSystem.tidePhaseAt(ctx.content, tick - 1);
    const curTide = WeatherSystem.tidePhaseAt(ctx.content, tick);
    if (prevTide.id !== curTide.id) {
      ctx.emit({ type: "tide_changed", tick, tidePhaseId: curTide.id, name: curTide.name });
    }
  },
};

// ---------------------------------------------------------------- economy/Economy.kt

/**
 * Soft economy sinks (Phase 19): station upkeep and counter/bag spoilage after
 * economy.requires are met. Phase 25 adds gated machine wear with coin repairs.
 * Accrual is ephemeral (not persisted), like wages.
 */

// ---------------------------------------------------------------- world/HarborTravel.kt

/**
 * Harbor map travel. Unlocks via HarborDef.requires; each visit stashes the
 * left-behind layout so machines, stock, customers, and staff resume on return.
 */
export const FullUnlockSystem = {
  ENTITLEMENT_ID: "entitlement.full_harbor_unlock",
  FREE_HARBOR_ID: "harbor.sunrise_pier",
  SKU: "fish.full_harbor_unlock",
  /** Web checkout product id; mirrors shared/billing/entitlements.json webProductId. */
  WEB_PRODUCT_ID: "fish.full_harbor_unlock",
  /** Play Console product id (Android parity). */
  ANDROID_PRODUCT_ID: "fish_full_harbor_unlock",

  requestIdForPurchaseToken(purchaseToken: string): string {
    return `full-unlock:${purchaseToken}`;
  },

  grant(ctx: StepContext, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({ type: "full_harbor_unlock_granted", tick: s.tick, receipt: prior, replayed: true });
      return;
    }
    if (s.fullHarborUnlock) {
      const receipt: Receipt = {
        id: s.newId("unlock"), type: "full_harbor_unlock", coinDelta: 0, tick: s.tick,
        reference: FullUnlockSystem.ENTITLEMENT_ID,
      };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "full_harbor_unlock_granted", tick: s.tick, receipt, replayed: true });
      return;
    }
    s.fullHarborUnlock = true;
    const receipt: Receipt = {
      id: s.newId("unlock"), type: "full_harbor_unlock", coinDelta: 0, tick: s.tick,
      reference: FullUnlockSystem.ENTITLEMENT_ID,
    };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "full_harbor_unlock_granted", tick: s.tick, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "full_unlock" });
  },
};

/**
 * Phase 24 — optional paid cosmetics (power-neutral banners).
 * Catalog mirrors shared/billing/entitlements.json; none gate patience-buffing decor.
 */
export const CosmeticsIapSystem = {
  CATALOG: [
    {
      id: "entitlement.cosmetic.sunset_bunting",
      sku: "fish.cosmetic.sunset_bunting",
      webProductId: "fish.cosmetic.sunset_bunting",
      androidProductId: "fish_cosmetic_sunset_bunting",
      grantsCosmetic: "banner.iap_sunset_bunting",
      title: "Sunset bunting",
      description: "Warm dusk bunting for the pier. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.pearl_string",
      sku: "fish.cosmetic.pearl_string",
      webProductId: "fish.cosmetic.pearl_string",
      androidProductId: "fish_cosmetic_pearl_string",
      grantsCosmetic: "banner.iap_pearl_string",
      title: "Pearl string lights",
      description: "Pearl-white string lights. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.captain_crest",
      sku: "fish.cosmetic.captain_crest",
      webProductId: "fish.cosmetic.captain_crest",
      androidProductId: "fish_cosmetic_captain_crest",
      grantsCosmetic: "banner.iap_captain_crest",
      title: "Captain's crest",
      description: "A harbor crest plaque. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.harbor_lantern",
      sku: "fish.cosmetic.harbor_lantern",
      webProductId: "fish.cosmetic.harbor_lantern",
      androidProductId: "fish_cosmetic_harbor_lantern",
      grantsCosmetic: "banner.iap_harbor_lantern",
      title: "Harbor lantern",
      description: "Soft pier lantern glow. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.tide_ribbon",
      sku: "fish.cosmetic.tide_ribbon",
      webProductId: "fish.cosmetic.tide_ribbon",
      androidProductId: "fish_cosmetic_tide_ribbon",
      grantsCosmetic: "banner.iap_tide_ribbon",
      title: "Tide ribbon",
      description: "Tide-blue ribbon streamers. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.fog_pennant",
      sku: "fish.cosmetic.fog_pennant",
      webProductId: "fish.cosmetic.fog_pennant",
      androidProductId: "fish_cosmetic_fog_pennant",
      grantsCosmetic: "banner.iap_fog_pennant",
      title: "Fog pennant",
      description: "Mist-grey fog pennant. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.coral_streamer",
      sku: "fish.cosmetic.coral_streamer",
      webProductId: "fish.cosmetic.coral_streamer",
      androidProductId: "fish_cosmetic_coral_streamer",
      grantsCosmetic: "banner.iap_coral_streamer",
      title: "Coral streamer",
      description: "Coral carnival streamers. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.storm_flag",
      sku: "fish.cosmetic.storm_flag",
      webProductId: "fish.cosmetic.storm_flag",
      androidProductId: "fish_cosmetic_storm_flag",
      grantsCosmetic: "banner.iap_storm_flag",
      title: "Storm flag",
      description: "Storm Quay weather flag. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.ember_pennant",
      sku: "fish.cosmetic.ember_pennant",
      webProductId: "fish.cosmetic.ember_pennant",
      androidProductId: "fish_cosmetic_ember_pennant",
      grantsCosmetic: "banner.iap_ember_pennant",
      title: "Ember pennant",
      description: "Ember Wharf heat pennant. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.northlight_banner",
      sku: "fish.cosmetic.northlight_banner",
      webProductId: "fish.cosmetic.northlight_banner",
      androidProductId: "fish_cosmetic_northlight_banner",
      grantsCosmetic: "banner.iap_northlight_banner",
      title: "Northlight banner",
      description: "Aurora-thread northlight banner. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.marina_pennant",
      sku: "fish.cosmetic.marina_pennant",
      webProductId: "fish.cosmetic.marina_pennant",
      androidProductId: "fish_cosmetic_marina_pennant",
      grantsCosmetic: "banner.iap_marina_pennant",
      title: "Marina pennant",
      description: "Grand Marina dress pennant. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.moonlit_bunting",
      sku: "fish.cosmetic.moonlit_bunting",
      webProductId: "fish.cosmetic.moonlit_bunting",
      androidProductId: "fish_cosmetic_moonlit_bunting",
      grantsCosmetic: "banner.iap_moonlit_bunting",
      title: "Moonlit bunting",
      description: "Moon Cove silver bunting. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.mist_bunting",
      sku: "fish.cosmetic.mist_bunting",
      webProductId: "fish.cosmetic.mist_bunting",
      androidProductId: "fish_cosmetic_mist_bunting",
      grantsCosmetic: "banner.iap_mist_bunting",
      title: "Mist bunting",
      description: "Mist Cove lantern bunting. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.prism_pennant",
      sku: "fish.cosmetic.prism_pennant",
      webProductId: "fish.cosmetic.prism_pennant",
      androidProductId: "fish_cosmetic_prism_pennant",
      grantsCosmetic: "banner.iap_prism_pennant",
      title: "Prism pennant",
      description: "Prism Shelf light pennant. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.plaza_flag",
      sku: "fish.cosmetic.plaza_flag",
      webProductId: "fish.cosmetic.plaza_flag",
      androidProductId: "fish_cosmetic_plaza_flag",
      grantsCosmetic: "banner.iap_plaza_flag",
      title: "Plaza flag",
      description: "Plaza market day flag. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.rime_streamer",
      sku: "fish.cosmetic.rime_streamer",
      webProductId: "fish.cosmetic.rime_streamer",
      androidProductId: "fish_cosmetic_rime_streamer",
      grantsCosmetic: "banner.iap_rime_streamer",
      title: "Rime streamer",
      description: "Rime Harbor ice streamers. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.brine_ribbon",
      sku: "fish.cosmetic.brine_ribbon",
      webProductId: "fish.cosmetic.brine_ribbon",
      androidProductId: "fish_cosmetic_brine_ribbon",
      grantsCosmetic: "banner.iap_brine_ribbon",
      title: "Brine ribbon",
      description: "Brine shelf salt ribbon. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.aurora_crest",
      sku: "fish.cosmetic.aurora_crest",
      webProductId: "fish.cosmetic.aurora_crest",
      androidProductId: "fish_cosmetic_aurora_crest",
      grantsCosmetic: "banner.iap_aurora_crest",
      title: "Aurora crest",
      description: "Aurora vigil crest plaque. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.aurora_bunting",
      sku: "fish.cosmetic.aurora_bunting",
      webProductId: "fish.cosmetic.aurora_bunting",
      androidProductId: "fish_cosmetic_aurora_bunting",
      grantsCosmetic: "banner.iap_aurora_bunting",
      title: "Aurora bunting",
      description: "Aurora Inlet light bunting. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.tideglass_pennant",
      sku: "fish.cosmetic.tideglass_pennant",
      webProductId: "fish.cosmetic.tideglass_pennant",
      androidProductId: "fish_cosmetic_tideglass_pennant",
      grantsCosmetic: "banner.iap_tideglass_pennant",
      title: "Tideglass pennant",
      description: "Tideglass Bay mirror pennant. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.inlet_flag",
      sku: "fish.cosmetic.inlet_flag",
      webProductId: "fish.cosmetic.inlet_flag",
      androidProductId: "fish_cosmetic_inlet_flag",
      grantsCosmetic: "banner.iap_inlet_flag",
      title: "Inlet flag",
      description: "Northern inlet harbor flag. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.bay_streamer",
      sku: "fish.cosmetic.bay_streamer",
      webProductId: "fish.cosmetic.bay_streamer",
      androidProductId: "fish_cosmetic_bay_streamer",
      grantsCosmetic: "banner.iap_bay_streamer",
      title: "Bay streamer",
      description: "Tideglass ferry streamers. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.poach_ribbon",
      sku: "fish.cosmetic.poach_ribbon",
      webProductId: "fish.cosmetic.poach_ribbon",
      androidProductId: "fish_cosmetic_poach_ribbon",
      grantsCosmetic: "banner.iap_poach_ribbon",
      title: "Poach ribbon",
      description: "Poach pantry ribbon. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.can_crest",
      sku: "fish.cosmetic.can_crest",
      webProductId: "fish.cosmetic.can_crest",
      androidProductId: "fish_cosmetic_can_crest",
      grantsCosmetic: "banner.iap_can_crest",
      title: "Can crest",
      description: "Can circuit crest plaque. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.saffron_bunting",
      sku: "fish.cosmetic.saffron_bunting",
      webProductId: "fish.cosmetic.saffron_bunting",
      androidProductId: "fish_cosmetic_saffron_bunting",
      grantsCosmetic: "banner.iap_saffron_bunting",
      title: "Saffron bunting",
      description: "Saffron Quay ember bunting. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.cobalt_pennant",
      sku: "fish.cosmetic.cobalt_pennant",
      webProductId: "fish.cosmetic.cobalt_pennant",
      androidProductId: "fish_cosmetic_cobalt_pennant",
      grantsCosmetic: "banner.iap_cobalt_pennant",
      title: "Cobalt pennant",
      description: "Cobalt Sound rime pennant. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.quay_flag",
      sku: "fish.cosmetic.quay_flag",
      webProductId: "fish.cosmetic.quay_flag",
      androidProductId: "fish_cosmetic_quay_flag",
      grantsCosmetic: "banner.iap_quay_flag",
      title: "Quay flag",
      description: "Saffron quay harbor flag. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.sound_streamer",
      sku: "fish.cosmetic.sound_streamer",
      webProductId: "fish.cosmetic.sound_streamer",
      androidProductId: "fish_cosmetic_sound_streamer",
      grantsCosmetic: "banner.iap_sound_streamer",
      title: "Sound streamer",
      description: "Cobalt ferry streamers. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.roast_ribbon",
      sku: "fish.cosmetic.roast_ribbon",
      webProductId: "fish.cosmetic.roast_ribbon",
      androidProductId: "fish_cosmetic_roast_ribbon",
      grantsCosmetic: "banner.iap_roast_ribbon",
      title: "Roast ribbon",
      description: "Roast nest ribbon. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.ferment_crest",
      sku: "fish.cosmetic.ferment_crest",
      webProductId: "fish.cosmetic.ferment_crest",
      androidProductId: "fish_cosmetic_ferment_crest",
      grantsCosmetic: "banner.iap_ferment_crest",
      title: "Ferment crest",
      description: "Ferment covenant crest plaque. Visual only — never changes rates, wages, or sale prices.",
    },
  ] as const,

  BY_SKU: new Map<string, {
    id: string;
    sku: string;
    webProductId: string;
    androidProductId: string;
    grantsCosmetic: string;
    title: string;
    description: string;
  }>(),
  BY_COSMETIC: new Map<string, {
    id: string;
    sku: string;
    webProductId: string;
    androidProductId: string;
    grantsCosmetic: string;
    title: string;
    description: string;
  }>(),
  GRANTED_COSMETICS: new Set<string>(),

  requestIdForPurchaseToken(sku: string, purchaseToken: string): string {
    return `iap-cosmetic:${sku}:${purchaseToken}`;
  },

  grant(ctx: StepContext, cosmeticId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({ type: "iap_cosmetic_granted", tick: s.tick, cosmeticId, receipt: prior, replayed: true });
      return;
    }
    const sku = CosmeticsIapSystem.BY_COSMETIC.get(cosmeticId);
    if (!sku) {
      ctx.emit({
        type: "iap_cosmetic_rejected", tick: s.tick, cosmeticId, requestId, reason: "Unknown cosmetic SKU",
      });
      return;
    }
    if (s.unlockedCosmetics.has(cosmeticId)) {
      const receipt: Receipt = {
        id: s.newId("cosmetic"), type: "iap_cosmetic", coinDelta: 0, tick: s.tick, reference: cosmeticId,
      };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "iap_cosmetic_granted", tick: s.tick, cosmeticId, receipt, replayed: true });
      return;
    }
    s.unlockedCosmetics.add(cosmeticId);
    const receipt: Receipt = {
      id: s.newId("cosmetic"), type: "iap_cosmetic", coinDelta: 0, tick: s.tick, reference: cosmeticId,
    };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "iap_cosmetic_granted", tick: s.tick, cosmeticId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "iap_cosmetic" });
  },
};

for (const sku of CosmeticsIapSystem.CATALOG) {
  CosmeticsIapSystem.BY_SKU.set(sku.sku, sku);
  CosmeticsIapSystem.BY_COSMETIC.set(sku.grantsCosmetic, sku);
  CosmeticsIapSystem.GRANTED_COSMETICS.add(sku.grantsCosmetic);
}

export const HarborTravelSystem = {
  unlocked(content: ContentPack, s: GameState, def: HarborDef): boolean {
    // Phase 23: one-time IAP unlocks every harbor (Sunrise Pier is free via empty requires).
    if (s.fullHarborUnlock) return true;
    return def.requires.every(
      (it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it) || s.completedPrestige.has(it),
    );
  },

  missingRequirement(content: ContentPack, s: GameState, def: HarborDef): string | null {
    if (s.fullHarborUnlock) return null;
    const missing = def.requires.find(
      (it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it) && !s.completedPrestige.has(it),
    );
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? content.prestigeMilestonesById.get(missing)?.name
      ?? missing;
  },

  travel(ctx: StepContext, harborId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "harbor_traveled", tick: s.tick, fromHarborId: existing.reference, toHarborId: harborId,
        receipt: existing, replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "travel_rejected", tick: s.tick, harborId, requestId, reason });
    };
    if (!ctx.content.harborsById.has(harborId)) {
      reject("Unknown harbor");
      return;
    }
    if (harborId === s.harborId) {
      reject("Already here");
      return;
    }
    const target = ctx.content.harbor(harborId);
    if (!HarborTravelSystem.unlocked(ctx.content, s, target)) {
      reject(`Requires: ${HarborTravelSystem.missingRequirement(ctx.content, s, target)}`);
      return;
    }

    const fromId = s.harborId;
    s.harborStashes.set(fromId, HarborTravelSystem.capture(s));
    const parked = s.harborStashes.get(harborId) ?? null;
    if (parked) s.harborStashes.delete(harborId);
    s.harborId = harborId;
    if (parked) HarborTravelSystem.restore(s, parked);
    else HarborTravelSystem.installFresh(ctx.content, s, target);
    clearTransientPlayer(s);

    const receipt: Receipt = { id: s.newId("travel"), type: "harbor_travel", coinDelta: 0, tick: s.tick, reference: harborId };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    s.bumpStat(Stats.HARBORS_TRAVELED);
    ctx.emit({ type: "harbor_traveled", tick: s.tick, fromHarborId: fromId, toHarborId: harborId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "travel" });
  },

  capture(s: GameState): HarborWorldStash {
    return {
      fishingSpots: s.fishingSpots,
      machines: s.machines,
      counters: s.counters,
      customers: s.customers.slice(),
      workers: s.workers.slice(),
      customerSpawnProgress: s.customerSpawnProgress,
      playerX: s.player.x,
      playerZ: s.player.z,
      playerFacingX: s.player.facingX,
      playerFacingZ: s.player.facingZ,
      playerZoneId: s.player.zoneId,
    };
  },

  restore(s: GameState, stash: HarborWorldStash): void {
    s.fishingSpots = stash.fishingSpots;
    s.machines = stash.machines;
    s.counters = stash.counters;
    s.customers.length = 0;
    s.customers.push(...stash.customers);
    s.workers.length = 0;
    s.workers.push(...stash.workers);
    s.customerSpawnProgress = stash.customerSpawnProgress;
    s.player.x = stash.playerX;
    s.player.z = stash.playerZ;
    s.player.facingX = stash.playerFacingX;
    s.player.facingZ = stash.playerFacingZ;
    s.player.zoneId = stash.playerZoneId;
  },

  installFresh(content: ContentPack, s: GameState, harbor: HarborDef): void {
    const units = content.carryUnits;
    s.fishingSpots = harbor.fishingSpots.map((f) => new FishingSpotState(f.zone, f.stockMax));
    s.machines = harbor.stations.map((st) => {
      const def = content.machinesById.get(st.machine)!;
      return new MachineState(
        st.id, st.machine,
        new Inventory(`inv.${st.id}.input`, def.inputCapacityUnits, units),
        new Inventory(`inv.${st.id}.output`, def.outputCapacityUnits, units),
      );
    });
    s.counters = harbor.counters.map((c) => new CounterState(c.id, new Inventory(`inv.${c.id}`, c.capacityUnits, units)));
    s.customers.length = 0;
    s.workers.length = 0;
    s.customerSpawnProgress = 0;
    s.player.x = harbor.playerSpawn.x;
    s.player.z = harbor.playerSpawn.z;
    s.player.zoneId = null;
  },
};

function clearTransientPlayer(s: GameState): void {
  const p = s.player;
  p.inputX = 0;
  p.inputZ = 0;
  p.transferCooldown = 0;
  p.fishingSpecies = null;
  p.fishingProgress = 0;
  p.fishingCatchTicks = 0;
  p.reelAttemptedThisCast = false;
  p.reelRequested = false;
}



// ---------------------------------------------------------------- inventory/InvariantChecker.kt

export function invariantProblems(content: ContentPack, s: GameState): string[] {
  const p: string[] = [];
  const inventories = [
    s.player.bag,
    ...s.machines.flatMap((m) => [m.input, m.output]),
    ...s.counters.map((c) => c.stock),
    ...s.workers.map((w) => w.bag),
  ];
  for (const inv of inventories) {
    p.push(...inv.invariantProblems());
    for (const [item] of inv.contents()) if (!content.isKnownItem(item)) p.push(`${inv.id}: unknown item ${item}`);
  }
  if (s.coins < 0) p.push(`Negative coins ${s.coins}`);
  if (!Number.isSafeInteger(s.coins)) p.push("Coins outside safe range");
  for (const c of s.counters) {
    const claimedByItem = new Map<string, number>();
    for (const cust of s.customers.filter((x) => x.counterId === c.counterId)) {
      for (const [item, qty] of cust.reservedItems) {
        claimedByItem.set(item, (claimedByItem.get(item) ?? 0) + qty);
      }
    }
    for (const [item, qty] of c.stock.reservations()) {
      if (claimedByItem.get(item) !== qty) {
        p.push(`${c.counterId}: ${qty} reserved ${item} but customers claim ${claimedByItem.get(item) ?? 0}`);
      }
    }
    for (const [item, qty] of claimedByItem) {
      if (c.stock.reservedQuantity(item) !== qty) {
        p.push(`${c.counterId}: customers claim ${qty} ${item} but stock has ${c.stock.reservedQuantity(item)} reserved`);
      }
    }
  }
  for (const m of s.machines) {
    const claimedByItem = new Map<string, number>();
    for (const w of s.workers) {
      if (w.taskSourceInvId !== m.output.id) continue;
      const item = w.taskItemId;
      if (item === null) continue;
      if (w.phase !== "WALK_TO_WORK" && w.phase !== "PICKUP") continue;
      claimedByItem.set(item, (claimedByItem.get(item) ?? 0) + Math.max(1, w.taskQuantity));
    }
    for (const [item, qty] of m.output.reservations()) {
      if (claimedByItem.get(item) !== qty) {
        p.push(`${m.stationId}.output: ${qty} reserved ${item} but workers claim ${claimedByItem.get(item) ?? 0}`);
      }
    }
  }
  for (const m of s.machines) {
    const b = m.activeBatch;
    if (b && !content.recipesById.has(b.recipeId)) p.push(`${m.stationId}: batch with unknown recipe ${b.recipeId}`);
    if (b && b.remainingTicks < 0) p.push(`${m.stationId}: negative remaining ticks`);
  }
  for (const u of s.ownedUpgrades) if (!content.upgradesById.has(u)) p.push(`Unknown owned upgrade ${u}`);
  return p;
}

/** Finish 4.0 Phase 2–3 — bind extracted module cross-deps. */
bindSystemsBridge({
  weatherCatchSpeedMultPermille: (content, state) => WeatherSystem.catchSpeedMultPermille(content, state),
  weatherRegenMultPermille: (content, state) => WeatherSystem.regenMultPermille(content, state),
  weatherRareChanceBonusPermille: (content, tick) => WeatherSystem.rareChanceBonusPermille(content, tick),
  weatherCustomerSpawnMultPermille: (content, state) => WeatherSystem.customerSpawnMultPermille(content, state),
  masteryCatchSpeedMultPermille: (content, state, speciesId) =>
    MasterySystem.catchSpeedMultPermille(content, state, speciesId),
  masteryTimingWindows: (content, state) => MasterySystem.timingWindows(content, state),
  masteryTimingBonusPermille: (content, state, tier) =>
    MasterySystem.timingBonusPermille(content, state, tier),
  masteryRareChanceBonusPermille: (content, state, speciesId) =>
    MasterySystem.rareChanceBonusPermille(content, state, speciesId),
  masteryGrantCatchXp: (ctx, speciesId, timingTier, rare, xpMultPermille) =>
    MasterySystem.grantCatchXp(ctx, speciesId, timingTier, rare, xpMultPermille ?? 1000),
  seasonalScaledWeight: (base, content, tick, speciesId, harborId) =>
    SeasonalEventSystem.scaledWeight(base, content, tick, speciesId, harborId),
  seasonalActive: (content, tick) => SeasonalEventSystem.active(content, tick),
  seasonalPriceMultPermille: (content, tick) => SeasonalEventSystem.priceMultPermille(content, tick),
  seasonalCustomerSpawnMultPermille: (content, tick) =>
    SeasonalEventSystem.customerSpawnMultPermille(content, tick),
  smokerSpecialistOnDuty: (content, state, harbor) =>
    WorkerSystem.smokerSpecialistOnDuty(content, state, harbor),
  workerGreeterOnDuty: (content, state) => WorkerSystem.greeterOnDuty(content, state),
  workerGrantXp: (ctx, worker, amount) => WorkerSystem.grantXp(ctx, worker, amount),
  workerSetShift: (ctx, workerId, onShift) => WorkerSystem.setShift(ctx, workerId, onShift),
  economyIsSlowed: (m, tick) => EconomySystem.isSlowed(m, tick),
  customerIsUnlocked: (def, state) => CustomerSystem.isUnlocked(def, state),
  productionIsUnlocked: (def, state) => ProductionSystem.isUnlocked(def, state),
  decorPatienceBonusTicks: (content, state) => DecorSystem.patienceBonusTicks(content, state),
  prestigeHarborRating: (content, state) => PrestigeSystem.harborRating(content, state),
  rivalNoteSaleOutcome: (ctx, items) => RivalMarketSystem.noteSaleOutcome(ctx, items),
  rivalSalePriceMultPermille: (content, state, harborId, def, counter) =>
    RivalMarketSystem.salePriceMultPermille(content, state, harborId, def, counter),
  rivalCustomerSpawnMultPermille: (content, state, harborId) =>
    RivalMarketSystem.customerSpawnMultPermille(content, state, harborId),
  plotStandingOnUpgradePlot: (harbor, state, upgradeId) =>
    PlotSystem.standingOnUpgradePlot(harbor, state, upgradeId),
});
