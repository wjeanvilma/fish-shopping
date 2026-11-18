/**
 * Per-tick systems. Each function mirrors the Kotlin object of the same name in game-core;
 * keep them line-for-line comparable so fixture mismatches are easy to trace.
 *
 * Finish 4.0 Phase 2–3: fishing/production/movement + customers/contracts/progression live under ./systems/.
 */
import type { AchievementDef, BaitDef, ContentPack, ContractTemplateDef, CounterDef, DailyObjectiveDef, DayPartDef, DecorDef, EndgameChallengeDef, EndgameTierDef, FishingSpotDef, HarborDef, ItemQuantity, PlotDef, PointMm, PrestigeMilestoneDef, QuestDef, RecipeDef, RivalMarketDef, RushWindowDef, SeasonalEventDef, SpeciesDef, TidePhaseDef, UpgradeDef, UpgradeEffect, WeatherPatternDef, WorkerDef } from "./content";
import { bankProductById, bankProductRepayAmount, bankRepayAmount } from "./content";
import type { TimingTier, TrophyRecord } from "./state";
import { counterAccepts, freeSlot, queueSlot, rectCenterX, rectCenterZ, rectContains } from "./content";
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

import { ProductionSystem } from "./systems/production";
import { FishingSystem, BaitSystem, TrophySystem } from "./systems/fishing";
import { MovementSystem, TransferSystem } from "./systems/movement";
import { StepContext } from "./systems/context";
import { bindSystemsBridge } from "./systems/bridge";
import { WorkerDecisionHooks } from "./systems/workerDecisionHooks";
import { CustomerSystem } from "./systems/customers";
import { UpgradeSystem, ProgressionSystem, ReputationSystem } from "./systems/progression";
import { ContractSystem } from "./systems/contracts";

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
/** Finish 3.0 Phase 12 + Finish 4.0 Phase 11 — habitat weight pockets (≥16). */
export const EcologySystem = {
  BASELINE_WEIGHT_PERMILLE: 1000,
  HABITAT_FLOOR_PHASE_12: 8,
  HABITAT_FLOOR_PHASE_11: 16,

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
};

/**
 * Finish 3.0 Phase 14 / Finish 4.0 Phase 15 — single-player rival NPC markets.
 * Active rivals siphon demand when specialty shelves are empty, undercut sale
 * prices, and can be beaten by well-stocked specialty sales. Phase 15 adds AI
 * profiles (siphon/undercut/adaptive/roamer), adaptive revenge aggression, and
 * multi-rival pressure stacking.
 */
export const RivalMarketSystem = {
  /** Keep the scripted tutorial free of rival siphon / undercut RNG. */
  tutorialClear(content: ContentPack, state: GameState): boolean {
    return state.tutorialIndex >= content.tutorial.length;
  },

  activeRivals(content: ContentPack, state: GameState, harborId: string): RivalMarketDef[] {
    if (!RivalMarketSystem.tutorialClear(content, state)) return [];
    const partId = FishingSystem.dayPartAt(content, state.tick).id;
    return content.rivalMarkets.rivals.filter(
      (r) => r.harbors.includes(harborId) && r.activeDayParts.includes(partId),
    );
  },

  specialtyStockUnits(state: GameState, specialtyProducts: string[]): number {
    let units = 0;
    for (const counter of state.counters) {
      for (const productId of specialtyProducts) {
        // Count reserved lines too — shelves still hold the SKU while checkout runs.
        units += counter.stock.quantity(productId);
      }
    }
    return units;
  },

  /** Finish 4.0 Phase 15 — effective aggression after AI profile / revenge boosts. */
  effectiveAggressionPermille(
    content: ContentPack,
    state: GameState,
    rival: RivalMarketDef,
  ): number {
    const cat = content.rivalMarkets;
    const boost = cat.adaptiveAggressionBoostPermille ?? 0;
    const profile = rival.aiProfile ?? "siphon";
    let aggression = rival.aggressionPermille;
    const beaten = state.beatenRivalIds.has(rival.id);
    if (profile === "adaptive" || (profile === "roamer" && beaten)) {
      aggression = Math.min(1000, aggression + boost);
    }
    if (beaten && (profile === "adaptive" || profile === "undercut")) {
      aggression = Math.min(1000, aggression + boost);
    }
    if (profile === "siphon") {
      aggression = Math.min(1000, aggression + idiv(boost, 2));
    }
    return aggression;
  },

  pressuringRivals(content: ContentPack, state: GameState, harborId: string): RivalMarketDef[] {
    const active = RivalMarketSystem.activeRivals(content, state, harborId);
    if (active.length === 0) return [];
    if (ReputationSystem.band(content, state) >= content.rivalMarkets.minReputationBandToResist) {
      return [];
    }
    return active.filter(
      (rival) =>
        RivalMarketSystem.specialtyStockUnits(state, rival.specialtyProducts) <
        content.rivalMarkets.wellStockedUnits,
    );
  },

  isPressuring(content: ContentPack, state: GameState, harborId: string): boolean {
    return RivalMarketSystem.pressuringRivals(content, state, harborId).length > 0;
  },

  customerSpawnMultPermille(content: ContentPack, state: GameState, harborId: string): number {
    const pressuring = RivalMarketSystem.pressuringRivals(content, state, harborId);
    if (pressuring.length === 0) return 1000;
    let mult = content.rivalMarkets.pressureSpawnMultPermille;
    if (pressuring.length >= 2) {
      const extra = content.rivalMarkets.multiRivalPressureExtraMultPermille ?? 1000;
      mult = idiv(mult * extra, 1000);
    }
    return Math.max(1, Math.min(1000, mult));
  },

  salePriceMultPermille(
    content: ContentPack,
    state: GameState,
    harborId: string,
    def: CounterDef,
    _counter: CounterState,
  ): number {
    const active = RivalMarketSystem.activeRivals(content, state, harborId);
    if (active.length === 0) return 1000;
    let best = 1000;
    for (const rival of active) {
      const specialtyOnPad = rival.specialtyProducts.some((p) => def.products.includes(p));
      if (!specialtyOnPad) continue;
      const stocked = RivalMarketSystem.specialtyStockUnits(state, rival.specialtyProducts);
      if (stocked >= content.rivalMarkets.wellStockedUnits) continue;
      let undercut = rival.undercutPriceMultPermille;
      const profile = rival.aiProfile ?? "siphon";
      if (
        (profile === "undercut" || profile === "adaptive") &&
        state.beatenRivalIds.has(rival.id)
      ) {
        // Revenge undercut — shave another 10% off the already-discounted price.
        undercut = Math.max(1, idiv(undercut * 900, 1000));
      } else if (profile === "undercut") {
        undercut = Math.max(1, idiv(undercut * 950, 1000));
      }
      if (undercut < best) best = undercut;
    }
    return best;
  },

  noteSaleOutcome(ctx: StepContext, items: { item: string; quantity: number }[]): void {
    const active = RivalMarketSystem.activeRivals(ctx.content, ctx.state, ctx.state.harborId);
    if (active.length === 0) return;
    for (const rival of active) {
      const hit = items.find((line) => rival.specialtyProducts.includes(line.item));
      if (!hit) continue;
      const stocked = RivalMarketSystem.specialtyStockUnits(ctx.state, rival.specialtyProducts);
      if (stocked >= ctx.content.rivalMarkets.wellStockedUnits) {
        ctx.state.bumpStat(Stats.RIVAL_BEATS);
        ctx.state.beatenRivalIds.add(rival.id);
        ctx.emit({
          type: "rival_beaten",
          tick: ctx.state.tick,
          rivalId: rival.id,
          productId: hit.item,
        });
      } else {
        ctx.state.bumpStat(Stats.RIVAL_UNDERCUTS);
      }
      return;
    }
  },

  announceTransitions(ctx: StepContext): void {
    const s = ctx.state;
    if (!RivalMarketSystem.tutorialClear(ctx.content, s)) return;
    const prevPart = FishingSystem.dayPartAt(ctx.content, Math.max(0, s.tick - 1)).id;
    const curPart = FishingSystem.dayPartAt(ctx.content, s.tick).id;
    if (prevPart === curPart && s.tick > 1) return;
    const prevActive = ctx.content.rivalMarkets.rivals.filter(
      (r) => r.harbors.includes(s.harborId) && r.activeDayParts.includes(prevPart),
    );
    const curActive = RivalMarketSystem.activeRivals(ctx.content, s, s.harborId);
    for (const r of prevActive) {
      if (!curActive.some((c) => c.id === r.id)) {
        ctx.emit({ type: "rival_market_closed", tick: s.tick, rivalId: r.id, name: r.name });
      }
    }
    for (const r of curActive) {
      if (!prevActive.some((p) => p.id === r.id)) {
        ctx.emit({ type: "rival_market_opened", tick: s.tick, rivalId: r.id, name: r.name });
      }
    }
  },

  step(ctx: StepContext): void {
    RivalMarketSystem.announceTransitions(ctx);
    const s = ctx.state;
    const cat = ctx.content.rivalMarkets;
    if (cat.tickInterval < 1 || s.tick % cat.tickInterval !== 0) return;
    const active = RivalMarketSystem.activeRivals(ctx.content, s, s.harborId);
    if (active.length === 0) return;
    if (ReputationSystem.band(ctx.content, s) >= cat.minReputationBandToResist) return;
    for (const rival of active) {
      const stocked = RivalMarketSystem.specialtyStockUnits(s, rival.specialtyProducts);
      if (stocked >= cat.wellStockedUnits) continue;
      const profile = rival.aiProfile ?? "siphon";
      // Undercut specialists skip siphon rolls; they pressure via price instead.
      if (profile === "undercut" && stocked > 0) continue;
      let chance = cat.emptyStockSiphonChancePermille;
      const aggression = RivalMarketSystem.effectiveAggressionPermille(ctx.content, s, rival);
      chance = Math.min(1000, chance + idiv(aggression * cat.lowRepSiphonBonusPermille, 1000));
      if (profile === "siphon") {
        chance = Math.min(1000, chance + 40);
      }
      if (s.rng.nextInRange(0, 999) >= chance) continue;
      const productId =
        rival.specialtyProducts[s.rng.nextInRange(0, rival.specialtyProducts.length - 1)]!;
      s.bumpStat(Stats.RIVAL_SALES_STOLEN);
      ctx.emit({
        type: "rival_sale_stolen",
        tick: s.tick,
        rivalId: rival.id,
        productId,
      });
    }
  },
};

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

/**
 * Phase 23 shop decor: buy-once placable cosmetics that add a tiny customer
 * patience buff. Banner-gated pieces reuse prestige cosmetic IDs.
 */
export const DecorSystem = {
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
      s.endgameMarks.size >= (tier.requiresMarks ?? 0)
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

  grantCatchXp(ctx: StepContext, speciesId: string, timingTier: TimingTier, rare: boolean): void {
    const s = ctx.state;
    const m = ctx.content.fishingMastery;
    let gain = m.xpCatch;
    if (timingTier === "perfect") gain += m.xpPerfectReel;
    else if (timingTier === "good") gain += m.xpGoodReel;
    if (rare) gain += m.xpRareCatch;
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
export const EconomySystem = {
  unlocked(content: ContentPack, s: GameState): boolean {
    return content.economy.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.economy.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  wearUnlocked(content: ContentPack, s: GameState): boolean {
    return content.economy.wear.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  wearMissingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.economy.wear.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  maintenanceCoinsPerStation(content: ContentPack, s: GameState, harbor: HarborDef): number {
    const harborDisc = harbor.specialization?.maintenanceDiscountPerStation ?? 0;
    return Math.max(
      0,
      content.economy.maintenanceCoinsPerStation - s.maintenanceDiscountPerStation - harborDisc,
    );
  },

  bagFishSpoilPeriodTicks(content: ContentPack, s: GameState): number {
    const base = content.economy.bagFishSpoilPeriodTicks;
    const scaled = idiv(SafeMath.multiply(base, s.bagSpoilPeriodMultPermille), 1000);
    return Math.max(1, scaled);
  },

  counterSpoilPeriodTicks(content: ContentPack, s: GameState): number {
    const base = content.economy.counterSpoilPeriodTicks;
    const scaled = idiv(SafeMath.multiply(base, s.counterSpoilPeriodMultPermille), 1000);
    return Math.max(1, scaled);
  },

  spoilTier(content: ContentPack, itemId: string): number {
    return content.productsById.get(itemId)?.spoilTier
      ?? content.speciesById.get(itemId)?.spoilTier
      ?? 2;
  },

  isSlowed(m: MachineState, tick: number): boolean {
    return !m.broken && m.slowUntilTick > tick;
  },

  repairCost(content: ContentPack): number {
    return content.economy.wear.repairCoins;
  },

  needsRepair(m: MachineState, tick: number): boolean {
    return m.broken || EconomySystem.isSlowed(m, tick);
  },

  step(ctx: StepContext): void {
    if (!EconomySystem.unlocked(ctx.content, ctx.state)) return;
    accrueMaintenance(ctx);
    accrueCounterSpoil(ctx);
    accrueBagFishSpoil(ctx);
    accrueWear(ctx);
  },

  repair(ctx: StepContext, stationId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      const machineId = s.machines.find((m) => m.stationId === stationId)?.machineId ?? "";
      ctx.emit({ type: "machine_repaired", tick: s.tick, stationId, machineId, receipt: prior, replayed: true });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "machine_repair_rejected", tick: s.tick, stationId, requestId, reason });
    };
    const m = s.machines.find((x) => x.stationId === stationId);
    if (!m) return reject("Unknown station");
    if (!EconomySystem.needsRepair(m, s.tick)) return reject("Nothing to repair");
    const cost = EconomySystem.repairCost(ctx.content);
    if (s.coins < cost) return reject(`Need ${cost - s.coins} more coins`);
    s.coins -= cost;
    m.broken = false;
    m.slowUntilTick = 0;
    s.bumpStat(Stats.MACHINES_REPAIRED);
    if (cost > 0) s.bumpStat(Stats.REPAIR_SPENT, cost);
    const receipt: Receipt = { id: s.newId("receipt"), type: "repair", coinDelta: -cost, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({ type: "machine_repaired", tick: s.tick, stationId: m.stationId, machineId: m.machineId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },
};

function accrueMaintenance(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  const rate = EconomySystem.maintenanceCoinsPerStation(ctx.content, s, ctx.harbor);
  if (rate <= 0 || eco.maintenancePeriodTicks <= 0) return;
  s.maintenanceAccrualTicks++;
  if (s.maintenanceAccrualTicks < eco.maintenancePeriodTicks) return;
  s.maintenanceAccrualTicks = 0;
  const stations = ctx.harbor.stations.filter((st) => ProductionSystem.isUnlocked(st, s)).length;
  if (stations <= 0) return;
  const cost = rate * stations;
  const paid = Math.min(cost, s.coins);
  if (paid <= 0) return;
  s.coins -= paid;
  s.bumpStat(Stats.MAINTENANCE_PAID, paid);
  const receipt: Receipt = { id: s.newId("maint"), type: "maintenance", coinDelta: -paid, tick: s.tick, reference: `stations:${stations}` };
  s.record(receipt);
  ctx.emit({ type: "maintenance_paid", tick: s.tick, stations, coins: paid });
}

function accrueCounterSpoil(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  if (eco.counterSpoilUnits <= 0) return;
  s.counterSpoilAccrualTicks++;
  const period = EconomySystem.counterSpoilPeriodTicks(ctx.content, s);
  if (s.counterSpoilAccrualTicks < period) return;
  s.counterSpoilAccrualTicks = 0;
  const lost: ItemQuantity[] = [];
  let remaining = eco.counterSpoilUnits;
  const counters = [...s.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const counter of counters) {
    if (remaining <= 0) break;
    remaining = removeSpoilUnits(counter.stock, remaining, true, ctx.content, lost);
  }
  if (lost.length === 0) return;
  const total = lost.reduce((sum, it) => sum + it.quantity, 0);
  s.bumpStat(Stats.ITEMS_SPOILED, total);
  ctx.emit({ type: "items_spoiled", tick: s.tick, location: "counter", items: [...lost] });
}

function accrueBagFishSpoil(ctx: StepContext): void {
  const s = ctx.state;
  const eco = ctx.content.economy;
  if (eco.bagFishSpoilUnits <= 0) return;
  s.bagSpoilAccrualTicks++;
  const period = EconomySystem.bagFishSpoilPeriodTicks(ctx.content, s);
  if (s.bagSpoilAccrualTicks < period) return;
  s.bagSpoilAccrualTicks = 0;
  const lost: ItemQuantity[] = [];
  removeSpoilUnits(s.player.bag, eco.bagFishSpoilUnits, false, ctx.content, lost);
  if (lost.length === 0) return;
  const total = lost.reduce((sum, it) => sum + it.quantity, 0);
  s.bumpStat(Stats.ITEMS_SPOILED, total);
  ctx.emit({ type: "items_spoiled", tick: s.tick, location: "bag", items: [...lost] });
}

function accrueWear(ctx: StepContext): void {
  if (!EconomySystem.wearUnlocked(ctx.content, ctx.state)) return;
  const s = ctx.state;
  const wear = ctx.content.economy.wear;
  if (wear.chancePermille <= 0) return;
  s.wearAccrualTicks++;
  if (s.wearAccrualTicks < wear.checkPeriodTicks) return;
  s.wearAccrualTicks = 0;
  const candidates = s.machines
    .filter((m) => {
      const st = ctx.harbor.stations.find((x) => x.id === m.stationId);
      if (!st) return false;
      return ProductionSystem.isUnlocked(st, s) && !m.broken && !EconomySystem.isSlowed(m, s.tick);
    })
    .sort((a, b) => compareStrings(a.stationId, b.stationId));
  if (candidates.length === 0) return;
  for (const m of candidates) {
    if (s.rng.nextBelow(1000) >= wear.chancePermille) continue;
    if (s.rng.nextBelow(1000) < wear.breakChancePermille) {
      m.broken = true;
      m.slowUntilTick = 0;
      s.bumpStat(Stats.MACHINES_BROKEN);
      ctx.emit({ type: "machine_broke", tick: s.tick, stationId: m.stationId, machineId: m.machineId });
    } else {
      m.slowUntilTick = s.tick + wear.slowDurationTicks;
      s.bumpStat(Stats.MACHINES_SLOWED);
      ctx.emit({
        type: "machine_slowed",
        tick: s.tick,
        stationId: m.stationId,
        machineId: m.machineId,
        untilTick: m.slowUntilTick,
      });
    }
  }
}

/**
 * Phase 26 pier bank: one short-term loan (interest baked into repay amount) and
 * player-set coin goals. Overdue loans auto-collect on a content period.
 */
export const BankSystem = {
  unlocked(content: ContentPack, s: GameState): boolean {
    return content.bank.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.bank.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? missing;
  },

  hasLoan(s: GameState): boolean {
    return s.loanOwed > 0;
  },

  overdue(s: GameState): boolean {
    return BankSystem.hasLoan(s) && s.tick >= s.loanDueTick;
  },

  ticksRemaining(s: GameState): number {
    if (!BankSystem.hasLoan(s)) return 0;
    return Math.max(0, Math.trunc(s.loanDueTick - s.tick));
  },

  repayAmount(content: ContentPack): number {
    return bankRepayAmount(content.bank);
  },

  productUnlocked(
    content: ContentPack,
    s: GameState,
    product: { requires?: string[] },
  ): boolean {
    return (product.requires ?? []).every(
      (it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it),
    );
  },

  productMissingRequirement(
    content: ContentPack,
    s: GameState,
    product: { requires?: string[] },
  ): string | null {
    const missing = (product.requires ?? []).find(
      (it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it),
    );
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name
      ?? content.questsById.get(missing)?.name
      ?? missing;
  },

  step(ctx: StepContext): void {
    BankSystem.checkCoinGoal(ctx);
    BankSystem.collectOverdue(ctx);
  },

  takeLoan(ctx: StepContext, requestId: string, productId: string | null = null): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({
        type: "loan_taken",
        tick: s.tick,
        principal: prior.coinDelta,
        owed: s.loanOwed,
        dueTick: s.loanDueTick,
        receipt: prior,
        replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "loan_rejected", tick: s.tick, requestId, reason });
    };
    if (!BankSystem.unlocked(ctx.content, s)) {
      reject(`Requires: ${BankSystem.missingRequirement(ctx.content, s)}`);
      return;
    }
    if (BankSystem.hasLoan(s)) {
      reject("Loan already outstanding");
      return;
    }
    const product = bankProductById(ctx.content.bank, productId);
    if (!product) {
      reject("Unknown loan product");
      return;
    }
    if (!BankSystem.productUnlocked(ctx.content, s, product)) {
      reject(`Requires: ${BankSystem.productMissingRequirement(ctx.content, s, product)}`);
      return;
    }
    const principal = product.principal;
    const owed = bankProductRepayAmount(product);
    s.coins = SafeMath.add(s.coins, principal);
    s.loanOwed = owed;
    s.loanDueTick = s.tick + product.termTicks;
    s.loanCollectionAccrualTicks = 0;
    s.bumpStat(Stats.LOANS_TAKEN);
    const interest = owed - principal;
    if (interest > 0) s.bumpStat(Stats.LOAN_INTEREST_ACCRUED, interest);
    const receipt: Receipt = { id: s.newId("receipt"), type: "loan", coinDelta: principal, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({
      type: "loan_taken",
      tick: s.tick,
      principal,
      owed,
      dueTick: s.loanDueTick,
      receipt,
      replayed: false,
    });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },

  repayLoan(ctx: StepContext, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({
        type: "loan_repaid",
        tick: s.tick,
        paid: -prior.coinDelta,
        remaining: s.loanOwed,
        receipt: prior,
        replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "loan_rejected", tick: s.tick, requestId, reason });
    };
    if (!BankSystem.hasLoan(s)) {
      reject("No loan to repay");
      return;
    }
    if (s.coins <= 0) {
      reject("Need coins to repay");
      return;
    }
    const paid = Math.min(s.loanOwed, s.coins);
    s.coins -= paid;
    s.loanOwed -= paid;
    if (s.loanOwed <= 0) {
      s.loanOwed = 0;
      s.loanDueTick = 0;
      s.loanCollectionAccrualTicks = 0;
    }
    s.bumpStat(Stats.LOAN_REPAID, paid);
    const receipt: Receipt = { id: s.newId("receipt"), type: "loan_repay", coinDelta: -paid, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({
      type: "loan_repaid",
      tick: s.tick,
      paid,
      remaining: s.loanOwed,
      receipt,
      replayed: false,
    });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "purchase" });
  },

  setCoinGoal(ctx: StepContext, amount: number): void {
    const s = ctx.state;
    if (amount < 0) return;
    if (amount !== 0 && !ctx.content.bank.goalPresets.includes(amount)) return;
    const target = amount;
    s.coinGoal = target;
    const alreadyMet = target > 0 && s.coins >= target;
    s.coinGoalCelebrated = alreadyMet;
    ctx.emit({ type: "coin_goal_set", tick: s.tick, amount: target });
    if (alreadyMet) {
      s.bumpStat(Stats.COIN_GOALS_REACHED);
      ctx.emit({ type: "coin_goal_reached", tick: s.tick, amount: target, coins: s.coins });
    }
  },

  checkCoinGoal(ctx: StepContext): void {
    const s = ctx.state;
    if (s.coinGoal <= 0 || s.coinGoalCelebrated) return;
    if (s.coins < s.coinGoal) return;
    s.coinGoalCelebrated = true;
    s.bumpStat(Stats.COIN_GOALS_REACHED);
    ctx.emit({ type: "coin_goal_reached", tick: s.tick, amount: s.coinGoal, coins: s.coins });
  },

  collectOverdue(ctx: StepContext): void {
    const s = ctx.state;
    if (!BankSystem.overdue(s)) {
      s.loanCollectionAccrualTicks = 0;
      return;
    }
    const period = ctx.content.bank.collectionPeriodTicks;
    s.loanCollectionAccrualTicks++;
    if (s.loanCollectionAccrualTicks < period) return;
    s.loanCollectionAccrualTicks = 0;
    if (s.coins <= 0 || s.loanOwed <= 0) return;
    const seized = Math.min(s.loanOwed, s.coins);
    s.coins -= seized;
    s.loanOwed -= seized;
    s.bumpStat(Stats.LOAN_COLLECTED, seized);
    if (s.loanOwed <= 0) {
      s.loanOwed = 0;
      s.loanDueTick = 0;
    }
    const receipt: Receipt = { id: s.newId("receipt"), type: "loan_collect", coinDelta: -seized, tick: s.tick, reference: "overdue" };
    s.record(receipt);
    ctx.emit({ type: "loan_collected", tick: s.tick, seized, remaining: s.loanOwed });
  },
};

/**
 * Removes up to [units] from [inv]. When [preferProducts] is true, only products;
 * otherwise only species (raw fish). Higher spoil tiers first, then sorted ids.
 */
function removeSpoilUnits(
  inv: Inventory,
  units: number,
  preferProducts: boolean,
  content: ContentPack,
  into: ItemQuantity[],
): number {
  let left = units;
  // Higher spoilTier first (fragile), then stable id order for parity.
  const ids = inv.contents()
    .map(([id]) => id)
    .filter((id) => (preferProducts ? content.productsById.has(id) : content.speciesById.has(id)))
    .sort((a, b) => {
      const tierCmp = EconomySystem.spoilTier(content, b) - EconomySystem.spoilTier(content, a);
      return tierCmp !== 0 ? tierCmp : compareStrings(a, b);
    });
  for (const id of ids) {
    if (left <= 0) break;
    const have = inv.available(id);
    if (have <= 0) continue;
    const take = Math.min(have, left);
    inv.remove(id, take);
    into.push({ item: id, quantity: take });
    left -= take;
  }
  return left;
}

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

// ---------------------------------------------------------------- workers/StaffTreesSystem.kt

/** Finish 2.0 Phase 15 — staff specialization branches + automation schedules. */
export const StaffTreesSystem = {
  branchOf(content: ContentPack, w: WorkerState) {
    return w.activeBranchId ? content.staffBranchesById.get(w.activeBranchId) ?? null : null;
  },

  scheduleOf(content: ContentPack, w: WorkerState) {
    return w.scheduleId ? content.staffSchedulesById.get(w.scheduleId) ?? null : null;
  },

  roleWire(content: ContentPack, w: WorkerState): string {
    return content.workersById.get(w.roleId)?.role ?? "";
  },

  canTrain(content: ContentPack, state: GameState, w: WorkerState, branchId: string): string | null {
    const branch = content.staffBranchesById.get(branchId);
    if (!branch) return "Unknown branch";
    if (branch.role !== StaffTreesSystem.roleWire(content, w)) return "Wrong role for this branch";
    if (w.unlockedBranchIds.includes(branch.id)) return "Already unlocked";
    if (w.level < branch.requiresWorkerLevel) return `Needs staff level ${branch.requiresWorkerLevel}`;
    const parent = branch.parentId;
    if (parent !== null && !w.unlockedBranchIds.includes(parent)) return "Unlock parent branch first";
    if (state.coins < branch.trainingCostCoins) return `Need ${branch.trainingCostCoins - state.coins} more coins`;
    return null;
  },

  train(ctx: StepContext, workerId: string, branchId: string, requestId: string): void {
    const s = ctx.state;
    if (s.purchaseReceipts.has(requestId)) {
      const prior = s.purchaseReceipts.get(requestId)!;
      ctx.emit({
        type: "worker_branch_trained", tick: s.tick, workerId, branchId, receipt: prior, replayed: true,
      });
      return;
    }
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) {
      ctx.emit({
        type: "worker_branch_train_rejected", tick: s.tick, workerId, branchId, requestId, reason: "Unknown worker",
      });
      return;
    }
    const reason = StaffTreesSystem.canTrain(ctx.content, s, w, branchId);
    if (reason !== null) {
      ctx.emit({
        type: "worker_branch_train_rejected", tick: s.tick, workerId, branchId, requestId, reason,
      });
      return;
    }
    const branch = ctx.content.staffBranchesById.get(branchId)!;
    const cost = branch.trainingCostCoins;
    s.coins -= cost;
    w.branchTrainingXp.set(branchId, branch.trainingXpRequired);
    if (!w.unlockedBranchIds.includes(branchId)) w.unlockedBranchIds.push(branchId);
    w.branchTrainingXp.delete(branchId);
    const receipt: Receipt = { id: s.newId("train"), type: "staff_branch_train", coinDelta: -cost, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    s.bumpStat(Stats.STAFF_BRANCH_TRAINING);
    s.bumpStat(Stats.STAFF_BRANCHES_UNLOCKED);
    ctx.emit({
      type: "worker_branch_trained", tick: s.tick, workerId, branchId, receipt, replayed: false,
    });
    ctx.emit({ type: "worker_branch_unlocked", tick: s.tick, workerId, branchId });
    if (w.activeBranchId === null) {
      w.activeBranchId = branchId;
      ctx.emit({ type: "worker_branch_selected", tick: s.tick, workerId, branchId });
    }
  },

  selectBranch(ctx: StepContext, workerId: string, branchId: string | null): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) return;
    if (branchId === null) {
      w.activeBranchId = null;
      ctx.emit({ type: "worker_branch_selected", tick: s.tick, workerId, branchId: null });
      return;
    }
    if (!w.unlockedBranchIds.includes(branchId)) return;
    const branch = ctx.content.staffBranchesById.get(branchId);
    if (!branch || branch.role !== StaffTreesSystem.roleWire(ctx.content, w)) return;
    w.activeBranchId = branchId;
    ctx.emit({ type: "worker_branch_selected", tick: s.tick, workerId, branchId });
  },

  setSchedule(ctx: StepContext, workerId: string, scheduleId: string | null): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) return;
    if (scheduleId === null) {
      w.scheduleId = null;
      ctx.emit({ type: "worker_schedule_changed", tick: s.tick, workerId, scheduleId: null });
      return;
    }
    if (!ctx.content.staffSchedulesById.has(scheduleId)) return;
    w.scheduleId = scheduleId;
    ctx.emit({ type: "worker_schedule_changed", tick: s.tick, workerId, scheduleId });
    StaffTreesSystem.applySchedule(ctx, w);
  },

  applySchedule(ctx: StepContext, w: WorkerState): void {
    const schedule = StaffTreesSystem.scheduleOf(ctx.content, w);
    if (!schedule || !schedule.autoOnShift) return;
    const part = FishingSystem.dayPartAt(ctx.content, ctx.state.tick);
    const wantOn = schedule.dayParts.includes(part.id);
    if (w.onShift !== wantOn) WorkerSystem.setShift(ctx, w.id, wantOn);
  },

  step(ctx: StepContext): void {
    for (const w of ctx.state.workers) StaffTreesSystem.applySchedule(ctx, w);
  },

  catchSpeedMultPermille(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.catchSpeedMultPermille ?? 1000;
  },

  moveSpeedMultPermille(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.moveSpeedMultPermille ?? 1000;
  },

  carryBonus(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.carryBonus ?? 0;
  },

  transferIntervalMultPermille(content: ContentPack, w: WorkerState): number {
    return StaffTreesSystem.branchOf(content, w)?.transferIntervalMultPermille ?? 1000;
  },

  wageMultPermille(content: ContentPack, w: WorkerState): number {
    let mult = StaffTreesSystem.branchOf(content, w)?.wageMultPermille ?? 1000;
    const schedule = StaffTreesSystem.scheduleOf(content, w);
    if (schedule !== null) {
      mult = Math.trunc((mult * schedule.wageMultPermille) / 1000);
    }
    return Math.max(1, mult);
  },

  trainingProgress(w: WorkerState, branchId: string): number {
    return w.branchTrainingXp.get(branchId) ?? 0;
  },
};

// ---------------------------------------------------------------- workers/Workers.kt

export type WorkerHireAvailability =
  | { kind: "purchasable" }
  | { kind: "maxed" }
  | { kind: "too_expensive"; missing: number }
  | { kind: "locked"; reason: string };

/**
 * Finish 3.0 Phase 10 — every content-defined worker role is hireable.
 * The old `"Coming soon"` allowlist lock is retired; requirements/cost/caps remain.
 */
const HIREABLE_ROLES = new Set([
  "fisher", "porter", "operator", "cashier", "supervisor",
  "ice_runner", "smoker_specialist", "greeter",
]);

export const WorkerSystem = {
  step(ctx: StepContext): void {
    accrueWages(ctx);
    for (const w of ctx.state.workers) {
      if (!w.onShift) continue;
      advanceWalk(w);
      if (w.transferCooldown > 0) w.transferCooldown--;
    }
    expireLeases(ctx);
    const ordered = [...ctx.state.workers].sort((a, b) => compareStrings(a.id, b.id));
    for (const w of ordered) {
      if (!w.onShift || w.busyWalking) continue;
      const def = ctx.content.workersById.get(w.roleId);
      if (!def) continue;
      if (def.role === "fisher") stepFisher(ctx, w, def);
      else if (def.role === "porter") stepPorter(ctx, w, def);
      else if (def.role === "operator") stepOperator(ctx, w, def);
      else if (def.role === "cashier") stepCashier(ctx, w, def);
      else if (def.role === "supervisor") stepSupervisor(ctx, w, def);
      else if (def.role === "ice_runner") stepIceRunner(ctx, w, def);
      else if (def.role === "smoker_specialist") stepSmokerSpecialist(ctx, w, def);
      else if (def.role === "greeter") stepGreeter(ctx, w, def);
    }
  },

  /** True when a supervisor has arrived at their post (on shift, not walking). */
  supervisorOnDuty(content: ContentPack, s: GameState): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      return role === "supervisor" && w.onShift && !w.busyWalking && w.phase === "WORK";
    });
  },

  greeterOnDuty(content: ContentPack, s: GameState): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      return role === "greeter" && w.onShift && !w.busyWalking && w.phase === "WORK";
    });
  },

  smokerSpecialistOnDuty(content: ContentPack, s: GameState, harbor: HarborDef): boolean {
    return s.workers.some((w) => {
      const role = content.workersById.get(w.roleId)?.role;
      if (role !== "smoker_specialist" || !w.onShift || w.busyWalking || w.phase !== "WORK") return false;
      const zoneId = w.taskZoneId;
      if (!zoneId) return false;
      return harbor.stations.some((st) =>
        st.machine.includes("smoker") && (st.inputZone === zoneId || st.outputZone === zoneId));
    });
  },

  /** Free standard-wage on-shift slots (base + supervisor bonus when posted). */
  freeOnShiftSlots(content: ContentPack, s: GameState): number {
    const shifts = content.staffProgression.shifts;
    let slots = shifts.baseOnShiftSlots;
    if (WorkerSystem.supervisorOnDuty(content, s)) slots += shifts.supervisorExtraSlots;
    return slots;
  },

  setShift(ctx: StepContext, workerId: string, onShift: boolean): void {
    const w = ctx.state.workers.find((x) => x.id === workerId);
    if (!w || w.onShift === onShift) return;
    w.onShift = onShift;
    if (!onShift) {
      abortHaul(ctx, w);
      w.walkTicksLeft = 0;
      w.walkTicksTotal = 0;
    }
    ctx.emit({ type: "worker_shift_changed", tick: ctx.state.tick, workerId: w.id, roleId: w.roleId, onShift });
  },

  /** Slot id for an assignable staff-gear upgrade, or null if not a loadout piece. */
  loadoutSlotFor(content: ContentPack, upgradeId: string): string | null {
    return content.staffProgression.loadouts.slots.find((s) => s.upgradeIds.includes(upgradeId))?.id ?? null;
  },

  assignableUpgradeIds(content: ContentPack): Set<string> {
    return new Set(content.staffProgression.loadouts.slots.flatMap((s) => s.upgradeIds));
  },

  /** Equip upgradeId onto workerId; moves it off any other worker first. */
  assignGear(ctx: StepContext, workerId: string, upgradeId: string): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w || !s.ownedUpgrades.has(upgradeId)) return;
    const slotId = WorkerSystem.loadoutSlotFor(ctx.content, upgradeId);
    if (!slotId) return;
    if (w.equipment[slotId] === upgradeId) return;
    for (const other of s.workers) {
      let changed = false;
      for (const [key, uid] of Object.entries(other.equipment)) {
        if (uid === upgradeId) {
          delete other.equipment[key];
          changed = true;
        }
      }
      if (other.id === w.id) {
        const prev = other.equipment[slotId];
        if (prev && prev !== upgradeId) {
          delete other.equipment[slotId];
          changed = true;
        }
      }
      if (changed && other.id !== w.id) refreshWorkerCarry(ctx.content, s, other);
    }
    w.equipment[slotId] = upgradeId;
    refreshWorkerCarry(ctx.content, s, w);
    ctx.emit({ type: "worker_gear_assigned", tick: s.tick, workerId: w.id, upgradeId, slotId });
  },

  unequipGear(ctx: StepContext, workerId: string, slotId: string): void {
    const s = ctx.state;
    const w = s.workers.find((x) => x.id === workerId);
    if (!w) return;
    const upgradeId = w.equipment[slotId];
    if (!upgradeId) return;
    delete w.equipment[slotId];
    refreshWorkerCarry(ctx.content, s, w);
    ctx.emit({ type: "worker_gear_unequipped", tick: s.tick, workerId: w.id, upgradeId, slotId });
  },

  /**
   * Legacy saves applied staff boots/satchel/tackle as global floors. Phase 19 moves those
   * into per-worker equipment — auto-equip owned gear onto the first workers that can take it.
   */
  migrateLegacyGlobalGear(content: ContentPack, s: GameState): void {
    const assignable = WorkerSystem.assignableUpgradeIds(content);
    for (const upgradeId of content.upgrades.map((u) => u.id).filter((id) => assignable.has(id) && s.ownedUpgrades.has(id))) {
      if (s.workers.some((w) => Object.values(w.equipment).includes(upgradeId))) continue;
      const slotId = WorkerSystem.loadoutSlotFor(content, upgradeId);
      if (!slotId) continue;
      const target = s.workers.find((w) => !(slotId in w.equipment));
      if (!target) continue;
      target.equipment[slotId] = upgradeId;
    }
    s.workerMoveSpeedPermille = 1000;
    s.workerCatchSpeedPermille = 0;
    s.workerCarryCapacityFloor = 0;
  },

  gearBonuses(content: ContentPack, w: WorkerState): [number, number, number] {
    let move = 1000;
    let catchFloor = 0;
    let carryFloor = 0;
    for (const upgradeId of Object.values(w.equipment)) {
      const effect = content.upgradesById.get(upgradeId)?.effect;
      if (!effect) continue;
      if (effect.kind === "worker_move_speed") move = Math.trunc((move * effect.speedPermille) / 1000);
      else if (effect.kind === "worker_catch_speed") catchFloor = Math.max(catchFloor, effect.speedPermille);
      else if (effect.kind === "worker_carry") carryFloor = Math.max(carryFloor, effect.capacityUnits);
    }
    return [Math.max(1, move), catchFloor, carryFloor];
  },

  hire(ctx: StepContext, roleId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({ type: "worker_hired", tick: s.tick, roleId, receipt: existing, replayed: true });
      return;
    }
    const def = ctx.content.workersById.get(roleId);
    const reject = (reason: string) => ctx.emit({ type: "hire_rejected", tick: s.tick, roleId, requestId, reason });
    if (!def) return reject("Unknown worker");
    if (!HIREABLE_ROLES.has(def.role)) return reject("Role not hireable yet");
    const missing = missingRequirement(ctx.content, s, def);
    if (missing) return reject(`Requires: ${missing}`);
    const hired = s.workers.filter((w) => w.roleId === roleId).length;
    if (hired >= def.maxHired) return reject(`Max ${def.name}s hired`);
    if (s.coins < def.hireCost) return reject(`Need ${def.hireCost - s.coins} more coins`);
    s.coins -= def.hireCost;
    const spawn = ctx.harbor.customerEntry;
    const id = s.newId("worker");
    const w = new WorkerState(
      id, def.id, spawn.x, spawn.z,
      new Inventory(`inv.${id}.bag`, def.carryCapacityUnits, ctx.content.carryUnits),
    );
    WorkerSystem.rollTraits(ctx, w);
    w.bag.capacityUnits = WorkerSystem.carryCapacity(ctx.content, s, def, w);
    s.workers.push(w);
    s.bumpStat(Stats.WORKERS_HIRED);
    const receipt: Receipt = { id: s.newId("hire"), type: "hire", coinDelta: -def.hireCost, tick: s.tick, reference: w.id };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "worker_hired", tick: s.tick, roleId, receipt, replayed: false });
  },

  /** Deterministic weighted trait picks without replacement. */
  rollTraits(ctx: StepContext, w: WorkerState): void {
    const prog = ctx.content.staffProgression;
    const pool = [...prog.traits];
    const n = Math.min(prog.traitsOnHire, pool.length);
    for (let i = 0; i < n; i++) {
      if (pool.length === 0) return;
      const pick = pool[ctx.state.rng.pickWeighted(pool.map((t) => t.weight))]!;
      w.traits.push(pick.id);
      for (let j = pool.length - 1; j >= 0; j--) {
        if (pool[j]!.id === pick.id) pool.splice(j, 1);
      }
    }
  },

  levelForXp(content: ContentPack, xp: number): number {
    const thresholds = content.staffProgression.xpThresholds;
    let level = 1;
    for (let i = 1; i < thresholds.length; i++) {
      if (xp >= thresholds[i]!) level = i + 1;
      else break;
    }
    return Math.min(Math.max(level, 1), content.staffProgression.maxLevel);
  },

  grantXp(ctx: StepContext, w: WorkerState, amount: number): void {
    if (amount <= 0) return;
    w.xp += amount;
    ctx.state.bumpStat(Stats.WORKER_XP, amount);
    const next = WorkerSystem.levelForXp(ctx.content, w.xp);
    if (next <= w.level) return;
    w.level = next;
    const def = ctx.content.workersById.get(w.roleId);
    if (!def) return;
    w.bag.capacityUnits = WorkerSystem.carryCapacity(ctx.content, ctx.state, def, w);
    ctx.state.bumpStat(Stats.WORKER_LEVEL_UPS);
    ctx.emit({ type: "worker_leveled_up", tick: ctx.state.tick, workerId: w.id, roleId: w.roleId, level: w.level });
  },

  /**
   * Why an on-shift worker is stuck idle (Phase 20). Null while walking, casting, or actively tasked.
   */
  blockedReason(content: ContentPack, s: GameState, harbor: HarborDef, w: WorkerState): string | null {
    if (!w.onShift) return "Off shift";
    if (w.busyWalking) return null;
    const def = content.workersById.get(w.roleId);
    if (!def) return null;
    if (w.phase !== "NONE" && w.phase !== "WORK") return null;
    if (w.phase === "WORK" && def.role !== "fisher") return null;
    if (def.role === "fisher" && w.fishingSpecies !== null) return null;
    if (def.role === "fisher") return fisherBlocked(content, s, harbor, w);
    if (def.role === "porter" || def.role === "ice_runner") return haulBlocked(content, s, harbor, true);
    if (def.role === "operator" || def.role === "smoker_specialist") return haulBlocked(content, s, harbor, false);
    return null;
  },

  availability(content: ContentPack, s: GameState, def: WorkerDef): WorkerHireAvailability {
    if (!HIREABLE_ROLES.has(def.role)) return { kind: "locked", reason: "Coming soon" };
    const missing = missingRequirement(content, s, def);
    if (missing) return { kind: "locked", reason: `Requires: ${missing}` };
    const hired = s.workers.filter((w) => w.roleId === def.id).length;
    if (hired >= def.maxHired) return { kind: "maxed" };
    if (s.coins < def.hireCost) return { kind: "too_expensive", missing: def.hireCost - s.coins };
    return { kind: "purchasable" };
  },

  /** Finish 3.0 Phase 10 — count hire rows still showing the retired Coming soon lock. */
  countComingSoonReasons(content: ContentPack, s: GameState): number {
    return content.workers.reduce((n, def) => {
      const a = WorkerSystem.availability(content, s, def);
      return n + (a.kind === "locked" && a.reason === "Coming soon" ? 1 : 0);
    }, 0);
  },

  moveSpeed(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelMult = 1000 + prog.moveSpeedPermillePerLevel * Math.max(w.level - 1, 0);
    const [traitMove] = traitBonus(content, w);
    const [gearMove] = WorkerSystem.gearBonuses(content, w);
    let speed = def.moveSpeedMmPerTick;
    speed = Math.trunc((speed * gearMove) / 1000);
    speed = Math.trunc((speed * levelMult) / 1000);
    speed = Math.trunc((speed * traitMove) / 1000);
    speed = Math.trunc((speed * StaffTreesSystem.moveSpeedMultPermille(content, w)) / 1000);
    return Math.max(1, speed);
  },

  catchSpeed(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelMult = 1000 + prog.catchSpeedPermillePerLevel * Math.max(w.level - 1, 0);
    const [, traitCatch] = traitBonus(content, w);
    const [, gearCatch] = WorkerSystem.gearBonuses(content, w);
    let speed = Math.max(def.catchSpeedPermille, gearCatch);
    speed = Math.trunc((speed * levelMult) / 1000);
    speed = Math.trunc((speed * traitCatch) / 1000);
    speed = Math.trunc((speed * StaffTreesSystem.catchSpeedMultPermille(content, w)) / 1000);
    return Math.max(1, speed);
  },

  carryCapacity(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelBonus = prog.carryBonusEveryLevels <= 0
      ? 0
      : Math.trunc(Math.max(w.level - 1, 0) / prog.carryBonusEveryLevels);
    const [, , traitCarry] = traitBonus(content, w);
    const [, , gearCarry] = WorkerSystem.gearBonuses(content, w);
    return Math.max(def.carryCapacityUnits, gearCarry) + levelBonus + traitCarry
      + StaffTreesSystem.carryBonus(content, w);
  },

  transferInterval(content: ContentPack, def: WorkerDef, w: WorkerState): number {
    const mult = transferIntervalMult(content, w);
    return Math.max(1, Math.trunc((def.transferIntervalTicks * mult) / 1000));
  },

  walkTicks(fromX: number, fromZ: number, toX: number, toZ: number, mmPerTick: number): number {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    if (dist === 0) return 0;
    return idiv(dist + mmPerTick - 1, mmPerTick);
  },
};

function traitBonus(content: ContentPack, w: WorkerState): [number, number, number] {
  let move = 1000;
  let catchSp = 1000;
  let carry = 0;
  for (const tid of w.traits) {
    const t = content.workerTraitsById.get(tid);
    if (!t) continue;
    move = Math.trunc((move * (t.moveSpeedPermille ?? 1000)) / 1000);
    catchSp = Math.trunc((catchSp * (t.catchSpeedPermille ?? 1000)) / 1000);
    carry += t.carryBonus ?? 0;
  }
  return [Math.max(1, move), Math.max(1, catchSp), carry];
}

function transferIntervalMult(content: ContentPack, w: WorkerState): number {
  let mult = 1000;
  for (const tid of w.traits) {
    const t = content.workerTraitsById.get(tid);
    if (!t) continue;
    mult = Math.trunc((mult * (t.transferIntervalMultPermille ?? 1000)) / 1000);
  }
  mult = Math.trunc((mult * StaffTreesSystem.transferIntervalMultPermille(content, w)) / 1000);
  return Math.max(1, mult);
}

function refreshWorkerCarry(content: ContentPack, s: GameState, w: WorkerState): void {
  const def = content.workersById.get(w.roleId);
  if (!def) return;
  w.bag.capacityUnits = WorkerSystem.carryCapacity(content, s, def, w);
}

function fisherBlocked(content: ContentPack, s: GameState, harbor: HarborDef, w: WorkerState): string | null {
  if (!w.bag.isEmpty()) {
    const canDrop = s.machines.some((m) => {
      const st = harbor.stations.find((x) => x.id === m.stationId);
      if (!st || !ProductionSystem.isUnlocked(st, s) || m.paused) return false;
      return [...w.bag.contents()].some(([item, qty]) => qty > 0 && m.input.roomFor(item) >= 1);
    });
    if (!canDrop) return "No path";
  }
  const unlocked = harbor.fishingSpots.filter((sp) => FishingSystem.isUnlocked(sp, s));
  if (unlocked.length === 0) return "No fishing spots";
  const stocked = unlocked.some((spot) => (s.fishingSpots.find((f) => f.zoneId === spot.zone)?.stock ?? 0) > 0);
  if (!stocked) return "Spots empty";
  if (w.bag.freeUnits() === 0) return "No path";
  return null;
}

function haulBlocked(content: ContentPack, s: GameState, harbor: HarborDef, counterHaul: boolean): string | null {
  const unlocked = s.machines.filter((m) => {
    const st = harbor.stations.find((x) => x.id === m.stationId);
    return !!st && ProductionSystem.isUnlocked(st, s) && !m.paused;
  });
  if (unlocked.some((m) => m.status === "OUTPUT_FULL")) return "Output full";
  const hasOutput = unlocked.some((m) => !m.output.isEmpty());
  if (counterHaul) {
    const counterRoom = s.counters.some((c) =>
      unlocked.some((m) => [...m.output.contents()].some(([item, qty]) => qty > 0 && c.stock.roomFor(item) >= 1)),
    );
    if (hasOutput && !counterRoom) return "No path";
    if (!hasOutput && unlocked.some((m) => m.status === "WAITING_FOR_INPUT")) return "No input";
    return null;
  }
  if (hasOutput) {
    const canFeed = unlocked.some((src) =>
      [...src.output.contents()].some(([item, qty]) =>
        qty > 0 && unlocked.some((dest) => dest.stationId !== src.stationId && dest.input.roomFor(item) >= 1),
      ),
    );
    if (!canFeed) return "No path";
  }
  if (!hasOutput && unlocked.some((m) => m.status === "WAITING_FOR_INPUT")) return "No input";
  return null;
}

/** Phase 20: rush idle ticker alerts for stations stuck waiting for input / output full. */
export const AutomationSystem = {
  step(ctx: StepContext): void {
    const rush = CustomerSystem.activeRush(ctx.harbor, ctx.state.tick);
    const alerts = ctx.content.automationAlerts;
    for (const m of ctx.state.machines) {
      const stDef = ctx.harbor.stations.find((x) => x.id === m.stationId);
      if (!stDef || !ProductionSystem.isUnlocked(stDef, ctx.state)) {
        m.idleTicks = 0;
        continue;
      }
      const idle = !m.paused && (m.status === "WAITING_FOR_INPUT" || m.status === "OUTPUT_FULL");
      if (!rush || !idle) {
        m.idleTicks = 0;
        continue;
      }
      m.idleTicks++;
      if (m.idleTicks < alerts.machineIdleTicksDuringRush) continue;
      const since = ctx.state.tick - m.lastIdleAlertTick;
      if (m.lastIdleAlertTick > 0 && since < alerts.alertCooldownTicks) continue;
      m.lastIdleAlertTick = ctx.state.tick;
      m.idleTicks = 0;
      const reason = m.status === "OUTPUT_FULL" ? "Output full" : "No input";
      ctx.emit({
        type: "machine_idle_alert",
        tick: ctx.state.tick,
        stationId: m.stationId,
        machineId: m.machineId,
        reason,
      });
    }
  },
};

function missingRequirement(content: ContentPack, s: GameState, def: WorkerDef): string | null {
  const missing = def.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
  if (!missing) return null;
  return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
}

function accrueWages(ctx: StepContext): void {
  const s = ctx.state;
  const rate = s.workerWagePerWorkerPerHour;
  const onShift = s.workers.filter((w) => w.onShift);
  if (rate <= 0 || onShift.length === 0) return;
  s.workerWageAccrualTicks++;
  const hourTicks = 3600 * TICKS_PER_SECOND;
  if (s.workerWageAccrualTicks < hourTicks) return;
  s.workerWageAccrualTicks = 0;
  const n = onShift.length;
  const free = WorkerSystem.freeOnShiftSlots(ctx.content, s);
  const otMult = ctx.content.staffProgression.shifts.overtimeWagePermille;
  let standard = 0;
  let overtime = 0;
  onShift.forEach((w, index) => {
    const base = Math.trunc((rate * StaffTreesSystem.wageMultPermille(ctx.content, w)) / 1000);
    if (index < free) standard += base;
    else overtime += Math.trunc((base * otMult) / 1000);
  });
  const cost = standard + overtime;
  const paid = Math.min(cost, s.coins);
  if (paid <= 0) return;
  s.coins -= paid;
  s.bumpStat(Stats.WAGES_PAID, paid);
  const overtimePaid = Math.min(overtime, paid);
  if (overtimePaid > 0) s.bumpStat(Stats.OVERTIME_WAGES, overtimePaid);
  const receipt: Receipt = { id: s.newId("wage"), type: "wage", coinDelta: -paid, tick: s.tick, reference: `workers:${n}` };
  s.record(receipt);
  ctx.emit({ type: "wages_paid", tick: s.tick, workers: n, coins: paid });
}

function stepFisher(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignFisher(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      clearCast(w);
      break;
    case "WORK":
      fish(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropToMachine(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

/** Finish 4.0 Phase 19 — trophy_cast treats rarityWeight ≤ this as rare. */
const TROPHY_CAST_RARE_WEIGHT_MAX = 20;

function assignFisher(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findMachineInputForBag(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const spot = findFishableSpot(ctx, w);
  if (!spot) return;
  const zone = zonePoint(ctx.harbor, spot.zoneId);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = spot.zoneId;
  w.taskId = ctx.state.newId("task");
}

function fish(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const zoneId = w.taskZoneId;
  if (zoneId === null) { clearTask(w); return; }
  const spotDef = ctx.harbor.fishingSpots.find((f) => f.zone === zoneId);
  if (!spotDef) { clearTask(w); return; }
  const spot = ctx.state.fishingSpots.find((f) => f.zoneId === zoneId)!;
  if (!FishingSystem.isUnlocked(spotDef, ctx.state) || spot.stock <= 0 || w.bag.freeUnits() === 0) {
    clearCast(w);
    if (!w.bag.isEmpty()) {
      const dest = findMachineInputForBag(ctx, w);
      if (dest) {
        startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
        w.phase = "WALK_TO_DROP";
        w.taskDestInvId = dest.machine.input.id;
        w.taskZoneId = dest.zoneId;
        return;
      }
    }
    clearTask(w);
    return;
  }

  if (w.fishingSpecies === null) {
    const candidates = spotDef.species.map((id) => ctx.content.speciesById.get(id)!)
      .filter((sp) => w.bag.roomFor(sp.id) >= 1);
    if (candidates.length === 0) {
      clearTask(w);
      return;
    }
    // Finish 4.0 Phase 19 — trophy_cast biases weighted pick toward rare species.
    const trophyCast = StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.fisher.trophy_cast";
    const pick = candidates[ctx.state.rng.pickWeighted(
      candidates.map((c) => {
        const base = SeasonalEventSystem.scaledWeight(
          c.rarityWeight, ctx.content, ctx.state.tick, c.id, ctx.state.harborId,
        );
        return trophyCast ? Math.max(1, 120 - Math.min(119, base)) : base;
      }),
    )]!;
    w.fishingSpecies = pick.id;
    w.fishingProgress = 0;
    w.fishingCatchTicks = FishingSystem.catchTicksFor(WorkerSystem.catchSpeed(ctx.content, ctx.state, def, w), pick.catchTicks);
  }

  const species = ctx.content.speciesById.get(w.fishingSpecies!)!;
  const duration = Math.max(1, w.fishingCatchTicks);
  w.fishingProgress++;
  if (w.fishingProgress < duration) return;

  if (w.bag.roomFor(species.id) >= 1 && spot.stock > 0) {
    w.bag.add(species.id, 1);
    spot.stock--;
    ctx.state.bumpStat(Stats.FISH_CAUGHT);
    ctx.state.bumpStat(Stats.WORKER_FISH_CAUGHT);
    ctx.state.recordSpeciesCatch(species.id);
    WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpFishCaught);
    // Finish 4.0 Phase 19 — trophy_cast rare landings.
    if (
      StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.fisher.trophy_cast" &&
      species.rarityWeight <= TROPHY_CAST_RARE_WEIGHT_MAX
    ) {
      ctx.state.bumpStat(Stats.FISHER_TROPHY_CASTS);
    }
    const { sizePermille, valueCoins, personalBest } = TrophySystem.record(ctx, species.id);
    ctx.emit({
      type: "fish_caught", tick: ctx.state.tick, speciesId: species.id, zoneId,
      timingBonus: false, rareUpgrade: false, sizePermille, valueCoins, personalBest,
    });
    if (spot.stock === 0) ctx.emit({ type: "fishing_spot_depleted", tick: ctx.state.tick, zoneId });
  }
  clearCast(w);
  if (w.bag.freeUnits() === 0 || spot.stock <= 0) {
    const dest = findMachineInputForBag(ctx, w);
    if (dest) {
      startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
      w.phase = "WALK_TO_DROP";
      w.taskDestInvId = dest.machine.input.id;
      w.taskZoneId = dest.zoneId;
    } else {
      clearTask(w);
    }
  }
}

function dropToMachine(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const destId = w.taskDestInvId;
  if (destId === null) { clearTask(w); return; }
  const machine = ctx.state.machines.find((m) => m.input.id === destId);
  if (!machine) { clearTask(w); return; }
  const accepted = acceptedInputs(ctx, machine.machineId);
  const moved = Transfers.moveFirstAccepted(w.bag, machine.input, (it) => accepted.has(it));
  if (moved !== null) {
    ctx.state.bumpStat(Stats.MACHINE_INPUTS);
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
    WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved);
    ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: w.bag.id, to: machine.input.id, itemId: moved, count: 1 });
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  }
  if (w.bag.isEmpty() || moved === null) clearTask(w);
}

function stepPorter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignPorter(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "PICKUP";
      break;
    case "PICKUP":
      pickupHaul(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropHaul(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignPorter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findCounterDrop(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.counter.stock.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findHaul(ctx, w);
  if (!haul) return;
  if (!haul.source.reserve(haul.itemId, 1)) return;
  w.taskId = ctx.state.newId("task");
  w.phase = "WALK_TO_WORK";
  w.taskSourceInvId = haul.source.id;
  w.taskDestInvId = haul.dest.id;
  w.taskItemId = haul.itemId;
  w.taskQuantity = 1;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
  w.taskZoneId = haul.sourceZoneId;
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
}

function pickupHaul(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId === null || itemId === null) { abortHaul(ctx, w); return; }
  const source = findInventory(ctx, sourceId);
  if (!source || source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
    abortHaul(ctx, w);
    return;
  }
  source.takeReserved(itemId, 1);
  w.bag.add(itemId, 1);
  w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });

  // Finish 4.0 Phase 19 — dock_relay chains another haul before dropping.
  if (StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.porter.dock_relay") {
    const next = findHaul(ctx, w);
    if (next && w.bag.roomFor(next.itemId) >= 1 && next.source.reserve(next.itemId, 1)) {
      w.phase = "WALK_TO_WORK";
      w.taskSourceInvId = next.source.id;
      w.taskDestInvId = next.dest.id;
      w.taskItemId = next.itemId;
      w.taskQuantity = 1;
      w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
      w.taskZoneId = next.sourceZoneId;
      startWalk(w, next.sourceX, next.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
      ctx.state.bumpStat(Stats.PORTER_RELAY_PICKUPS);
      return;
    }
  }

  const dest = findCounterDrop(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_DROP";
  w.taskDestInvId = dest.counter.stock.id;
  w.taskZoneId = dest.zoneId;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
}

function dropHaul(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const destId = w.taskDestInvId;
  if (destId === null) { clearTask(w); return; }
  const counter = ctx.state.counters.find((c) => c.stock.id === destId);
  if (!counter) { clearTask(w); return; }
  const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
  const moved = Transfers.moveFirstAccepted(w.bag, counter.stock, (it) => counterAccepts(cdef, it));
  if (moved !== null) {
    ctx.state.bumpStat(Stats.COUNTER_STOCKED);
    ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
    WorkerSystem.grantXp(ctx, w, ctx.content.staffProgression.xpItemMoved);
    ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: w.bag.id, to: counter.stock.id, itemId: moved, count: 1 });
    w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  }
  if (w.bag.isEmpty() || moved === null) clearTask(w);
}

function stepOperator(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignOperator(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "PICKUP";
      break;
    case "PICKUP":
      pickupMachineHaul(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropToMachine(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignOperator(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findMachineInputForBag(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findMachineHaul(ctx, w);
  if (!haul) return;
  if (!haul.source.reserve(haul.itemId, 1)) return;
  w.taskId = ctx.state.newId("task");
  w.phase = "WALK_TO_WORK";
  w.taskSourceInvId = haul.source.id;
  w.taskDestInvId = haul.dest.id;
  w.taskItemId = haul.itemId;
  w.taskQuantity = 1;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
  w.taskZoneId = haul.sourceZoneId;
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
}

function pickupMachineHaul(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId === null || itemId === null) { abortHaul(ctx, w); return; }
  const source = findInventory(ctx, sourceId);
  if (!source || source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
    abortHaul(ctx, w);
    return;
  }
  source.takeReserved(itemId, 1);
  w.bag.add(itemId, 1);
  w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });
  const dest = findMachineInputForBag(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_DROP";
  w.taskDestInvId = dest.machine.input.id;
  w.taskZoneId = dest.zoneId;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
}

function stepCashier(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignCashier(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      break;
    case "WORK": {
      // Re-route when another unlocked pad scores meaningfully higher (Phase 15).
      const best = bestCashierPost(ctx, w);
      if (best && best.zone !== w.taskZoneId) {
        const zone = zonePoint(ctx.harbor, best.zone);
        startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
        w.phase = "WALK_TO_WORK";
        w.taskZoneId = best.zone;
        w.taskId = ctx.state.newId("task");
      }
      break;
    }
    default:
      clearTask(w);
      break;
  }
}

function assignCashier(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const cdef = bestCashierPost(ctx, w);
  if (!cdef) return;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = cdef.zone;
  w.taskId = ctx.state.newId("task");
  // Finish 4.0 Phase 19 — quick_till posts to the longest/impatient queue.
  if (StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.cashier.quick_till") {
    ctx.state.bumpStat(Stats.CASHIER_QUICK_TILLS);
  }
}

/** Score unlocked counters with routing weights; prefer uncovered busy pads (Phase 15). */
function bestCashierPost(ctx: StepContext, w: WorkerState): CounterDef | undefined {
  const covered = new Set(
    ctx.state.workers
      .filter((other) =>
        other.id !== w.id &&
        ctx.content.workersById.get(other.roleId)?.role === "cashier" &&
        (other.phase === "WORK" || other.phase === "WALK_TO_WORK"))
      .map((other) => other.taskZoneId)
      .filter((z): z is string => z !== null),
  );
  const quickTill = StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.cashier.quick_till";
  let best: CounterDef | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  let considered = 0;
  for (const cdef of [...ctx.harbor.counters].sort((a, b) => compareStrings(a.id, b.id))) {
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
    const counter = ctx.state.counters.find((c) => c.counterId === cdef.id)!;
    const zone = zonePoint(ctx.harbor, cdef.zone);
    const queued = ctx.state.customers.filter((c) => c.counterId === cdef.id && c.arrived);
    const waiting = queued.length;
    const impatient = queued.filter((c) => c.patienceLeft > 0 && c.patienceLeft <= 40).length;
    const urgency = waiting * 25 + (counter.stock.usedUnits() === 0 ? 0 : 10);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const distance = Math.max(0, 200 - distTicks);
    const demand = waiting * 20 + (counter.stock.usedUnits() === 0 ? 40 : 0);
    let score = scorePost(ctx, urgency, distance, demand);
    // Finish 4.0 Phase 19 — quick_till_queue prefers longest / impatient lines.
    if (quickTill) score += waiting * 40 + impatient * 25;
    if (covered.has(cdef.zone)) score -= 10_000;
    considered++;
    if (!best || score > bestScore || (score === bestScore && compareStrings(cdef.id, best.id) < 0)) {
      best = cdef;
      bestScore = score;
    }
  }
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: "cashier",
    kind: "post",
    reason: !best ? "none_available" : quickTill ? "quick_till_queue" : "best_score",
    score: best ? bestScore : null,
    candidatesConsidered: considered,
    tick: ctx.state.tick,
  });
  return best;
}

function scorePost(ctx: StepContext, urgency: number, distance: number, demand: number): number {
  const routing = ctx.content.routing;
  let demW = routing.demandWeight;
  if (WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)) {
    demW = Math.trunc((demW * routing.supervisorDemandBoostPermille) / 1000);
  }
  return routing.urgencyWeight * urgency + routing.distanceWeight * distance + demW * demand;
}

function stepSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignSupervisor(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      break;
    case "WORK":
      supervisorPatrol(ctx, w, def);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const post = bestSupervisorPost(ctx, w);
  if (!post) return;
  startWalk(w, post.x, post.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = post.zoneId;
  w.taskId = ctx.state.newId("task");
}

/** Finish 3.0 Phase 11 — re-post toward busiest counter / distressed station. */
function supervisorPatrol(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const branch = StaffTreesSystem.branchOf(ctx.content, w);
  const floorLead = branch?.id === "branch.supervisor.floor_lead";
  const interval = floorLead ? 60 : 90;
  if (ctx.state.tick % interval !== 0) return;
  const post = bestSupervisorPost(ctx, w);
  if (!post || post.zoneId === w.taskZoneId) return;
  startWalk(w, post.x, post.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = post.zoneId;
  w.taskId = ctx.state.newId("task");
  ctx.state.bumpStat(Stats.SUPERVISOR_PATROLS);
}

function bestSupervisorPost(ctx: StepContext, w: WorkerState): { x: number; z: number; zoneId: string } | null {
  const branch = StaffTreesSystem.branchOf(ctx.content, w);
  if (branch?.id === "branch.supervisor.floor_lead") {
    let best: { x: number; z: number; zoneId: string; score: number } | null = null;
    for (const m of ctx.state.machines) {
      const station = ctx.harbor.stations.find((s) => s.id === m.stationId);
      if (!station || !ProductionSystem.isUnlocked(station, ctx.state) || m.paused) continue;
      let score = 0;
      if (m.status === "OUTPUT_FULL") score += 80;
      if (m.status === "WAITING_FOR_INPUT") score += 60;
      if (m.broken) score += 40;
      if (score <= 0) continue;
      const zone = zonePoint(ctx.harbor, station.outputZone);
      const dist = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
      score += Math.max(0, 40 - Math.trunc(dist / 5));
      if (!best || score > best.score || (score === best.score && compareStrings(station.outputZone, best.zoneId) < 0)) {
        best = { x: zone.x, z: zone.z, zoneId: station.outputZone, score };
      }
    }
    if (best) return { x: best.x, z: best.z, zoneId: best.zoneId };
  }
  const cdef = bestCashierPost(ctx, w);
  if (!cdef) return null;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  return { x: zone.x, z: zone.z, zoneId: cdef.zone };
}

function stepIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE": assignIceRunner(ctx, w, def); break;
    case "WALK_TO_WORK": w.phase = "PICKUP"; break;
    case "PICKUP": pickupIceRunner(ctx, w, def); break;
    case "WALK_TO_DROP": w.phase = "DROP"; break;
    case "DROP": dropHaul(ctx, w, def); break;
    default: clearTask(w); break;
  }
}

/** Finish 3.0 Phase 11 — chill_haul chains fragile pickups before dropping. */
function pickupIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (w.transferCooldown > 0) return;
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId === null || itemId === null) { abortHaul(ctx, w); return; }
  const source = findInventory(ctx, sourceId);
  if (!source || source.reservedQuantity(itemId) < 1 || w.bag.roomFor(itemId) < 1) {
    abortHaul(ctx, w);
    return;
  }
  source.takeReserved(itemId, 1);
  w.bag.add(itemId, 1);
  w.transferCooldown = WorkerSystem.transferInterval(ctx.content, def, w) - 1;
  ctx.state.bumpStat(Stats.OUTPUTS_COLLECTED);
  ctx.state.bumpStat(Stats.WORKER_ITEMS_MOVED);
  ctx.emit({ type: "items_transferred", tick: ctx.state.tick, from: source.id, to: w.bag.id, itemId, count: 1 });

  const branch = StaffTreesSystem.branchOf(ctx.content, w);
  if (branch?.id === "branch.ice_runner.chill_haul") {
    const next = findIceHaul(ctx, w);
    if (next && w.bag.roomFor(next.itemId) >= 1 && next.source.reserve(next.itemId, 1)) {
      w.phase = "WALK_TO_WORK";
      w.taskSourceInvId = next.source.id;
      w.taskDestInvId = next.dest.id;
      w.taskItemId = next.itemId;
      w.taskQuantity = 1;
      w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
      w.taskZoneId = next.sourceZoneId;
      startWalk(w, next.sourceX, next.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
      ctx.state.bumpStat(Stats.ICE_RUNNER_MULTI_PICKUPS);
      return;
    }
  }

  const dest = findCounterDrop(ctx, w);
  if (!dest) {
    w.phase = "NONE";
    w.taskSourceInvId = null;
    w.taskItemId = null;
    w.leaseExpiresAt = 0;
    return;
  }
  startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_DROP";
  w.taskDestInvId = dest.counter.stock.id;
  w.taskZoneId = dest.zoneId;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
}

function assignIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  if (!w.bag.isEmpty()) {
    const dest = findCounterDrop(ctx, w);
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.counter.stock.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findIceHaul(ctx, w);
  if (!haul) return;
  if (!haul.source.reserve(haul.itemId, 1)) return;
  w.taskId = ctx.state.newId("task");
  w.phase = "WALK_TO_WORK";
  w.taskSourceInvId = haul.source.id;
  w.taskDestInvId = haul.dest.id;
  w.taskItemId = haul.itemId;
  w.taskQuantity = 1;
  w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
  w.taskZoneId = haul.sourceZoneId;
  startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
}

function stepSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignSmokerSpecialist(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = w.taskSourceInvId !== null ? "PICKUP" : "WORK";
      break;
    case "PICKUP":
      pickupMachineHaul(ctx, w, def);
      break;
    case "WALK_TO_DROP":
      w.phase = "DROP";
      break;
    case "DROP":
      dropToMachine(ctx, w, def);
      break;
    case "WORK":
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignSmokerSpecialist(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const kilnFocus = StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.smoker_specialist.kiln_focus";
  if (!w.bag.isEmpty()) {
    const dest = findSmokerInputDrop(ctx, w) ?? (kilnFocus ? null : findMachineInputForBag(ctx, w));
    if (!dest) return;
    startWalk(w, dest.x, dest.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    w.phase = "WALK_TO_DROP";
    w.taskDestInvId = dest.machine.input.id;
    w.taskZoneId = dest.zoneId;
    w.taskId = ctx.state.newId("task");
    return;
  }
  const haul = findSmokerHaul(ctx, w);
  if (haul) {
    if (!haul.source.reserve(haul.itemId, 1)) return;
    w.taskId = ctx.state.newId("task");
    w.phase = "WALK_TO_WORK";
    w.taskSourceInvId = haul.source.id;
    w.taskDestInvId = haul.dest.id;
    w.taskItemId = haul.itemId;
    w.taskQuantity = 1;
    w.leaseExpiresAt = ctx.state.tick + def.leaseTicks;
    w.taskZoneId = haul.sourceZoneId;
    startWalk(w, haul.sourceX, haul.sourceZ, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
    return;
  }
  const post = smokerPost(ctx);
  if (!post) return;
  startWalk(w, post.x, post.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = post.zoneId;
  w.taskId = ctx.state.newId("task");
  w.taskSourceInvId = null;
  w.taskDestInvId = null;
  w.taskItemId = null;
}

function stepGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE":
      assignGreeter(ctx, w, def);
      break;
    case "WALK_TO_WORK":
      w.phase = "WORK";
      break;
    case "WORK":
      greeterWelcomePulse(ctx, w);
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignGreeter(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const entry = ctx.harbor.customerEntry;
  startWalk(w, entry.x, entry.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = "greeter.entry";
  w.taskId = ctx.state.newId("task");
}

/** Finish 3.0 Phase 11 — top up low-patience queued customers while posted. */
function greeterWelcomePulse(ctx: StepContext, _w: WorkerState): void {
  const branch = StaffTreesSystem.branchOf(ctx.content, _w);
  const desk = branch?.id === "branch.greeter.welcome_desk";
  const interval = desk ? 75 : 120;
  if (ctx.state.tick % interval !== 0) return;
  const boost = desk ? 55 : 35;
  const threshold = desk ? 110 : 90;
  let welcomed = 0;
  for (const c of ctx.state.customers) {
    if (!c.arrived || c.patienceLeft <= 0 || c.patienceLeft >= threshold) continue;
    c.patienceLeft += boost;
    welcomed++;
  }
  if (welcomed > 0) ctx.state.bumpStat(Stats.GREETER_WELCOMES, welcomed);
}

function expireLeases(ctx: StepContext): void {
  for (const w of ctx.state.workers) {
    if (w.leaseExpiresAt <= 0 || ctx.state.tick < w.leaseExpiresAt) continue;
    if (w.phase === "WALK_TO_WORK" || w.phase === "PICKUP") {
      const sourceId = w.taskSourceInvId;
      const itemId = w.taskItemId;
      if (sourceId !== null && itemId !== null) {
        const inv = findInventory(ctx, sourceId);
        if (inv && inv.reservedQuantity(itemId) > 0) inv.releaseReservation(itemId, 1);
      }
      ctx.state.bumpStat(Stats.LEASES_EXPIRED);
      ctx.emit({ type: "lease_expired", tick: ctx.state.tick, workerId: w.id, itemId, sourceInvId: sourceId });
      clearTask(w);
    } else {
      w.leaseExpiresAt = 0;
    }
  }
}

interface HaulOffer {
  source: Inventory;
  dest: Inventory;
  itemId: string;
  sourceX: number;
  sourceZ: number;
  sourceZoneId: string;
  score: number;
}

function findHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  const supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state);
  const cargoSprint = StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.porter.cargo_sprint";
  let considered = 0;
  let best: HaulOffer | null = null;
  let bestFull = false;
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const counter of counters) {
    const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
    for (const m of machinesByStation(ctx)) {
      const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
      if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
      const zone = zonePoint(ctx.harbor, station.outputZone);
      for (const [itemId] of m.output.contents()) {
        if (!counterAccepts(cdef, itemId)) continue;
        if (m.output.available(itemId) < 1) continue;
        if (w.bag.roomFor(itemId) < 1) continue;
        if (!destHasRoom(ctx, counter.stock, itemId, w.id)) continue;
        if (!porterMayHaul(ctx, itemId, supervisor)) continue;
        const demand = counterDemand(ctx, counter, itemId);
        const outputFull = m.status === "OUTPUT_FULL";
        let urgency = outputFull ? 50 : 0;
        // Finish 4.0 Phase 19 — cargo_sprint_urgency clears jammed outputs first.
        if (cargoSprint && outputFull) urgency += 45;
        const score = scoreHaul(ctx, w, m.output, zone.x, zone.z, urgency, demand);
        considered++;
        const offer: HaulOffer = {
          source: m.output, dest: counter.stock, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: station.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) {
          best = offer;
          bestFull = outputFull;
        }
      }
    }
  }
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: "porter",
    kind: "haul",
    reason: !best
      ? "none_available"
      : cargoSprint && bestFull
        ? "cargo_sprint_urgency"
        : StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.porter.dock_relay"
          ? "dock_relay"
          : "best_score",
    score: best ? best.score : null,
    candidatesConsidered: considered,
    tick: ctx.state.tick,
  });
  return best;
}

function findIceHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  const supervisor = WorkerSystem.supervisorOnDuty(ctx.content, ctx.state);
  const buffs = ctx.content.staffProgression.roleBuffs;
  let best: HaulOffer | null = null;
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  for (const counter of counters) {
    const cdef = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
    for (const m of machinesByStation(ctx)) {
      const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
      if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
      const zone = zonePoint(ctx.harbor, station.outputZone);
      for (const [itemId] of m.output.contents()) {
        if (!counterAccepts(cdef, itemId)) continue;
        if (m.output.available(itemId) < 1) continue;
        if (w.bag.roomFor(itemId) < 1) continue;
        if (!destHasRoom(ctx, counter.stock, itemId, w.id)) continue;
        if (!porterMayHaul(ctx, itemId, supervisor)) continue;
        const demand = counterDemand(ctx, counter, itemId);
        let score = scoreHaul(ctx, w, m.output, zone.x, zone.z, m.status === "OUTPUT_FULL" ? 50 : 0, demand);
        score += icePreferBonus(ctx, itemId, buffs);
        const offer: HaulOffer = {
          source: m.output, dest: counter.stock, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: station.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) best = offer;
      }
    }
  }
  return best;
}

function icePreferBonus(
  ctx: StepContext,
  itemId: string,
  buffs: { iceRunnerFragileSpoilTierMin: number; iceRunnerSpoilScoreBonus: number },
): number {
  if (itemId === "product.ice_packed_crate") return buffs.iceRunnerSpoilScoreBonus;
  const tier = ctx.content.productsById.get(itemId)?.spoilTier
    ?? ctx.content.speciesById.get(itemId)?.spoilTier;
  if (tier === undefined) return 0;
  return tier >= buffs.iceRunnerFragileSpoilTierMin ? buffs.iceRunnerSpoilScoreBonus : 0;
}

/** Intermediate haul: machine output → another machine's input (e.g. fillet → smoker). */
function findMachineHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  let best: HaulOffer | null = null;
  for (const src of machinesByStation(ctx)) {
    const srcStation = ctx.harbor.stations.find((s) => s.id === src.stationId)!;
    if (!ProductionSystem.isUnlocked(srcStation, ctx.state)) continue;
    const zone = zonePoint(ctx.harbor, srcStation.outputZone);
    for (const [itemId] of src.output.contents()) {
      if (src.output.available(itemId) < 1) continue;
      if (w.bag.roomFor(itemId) < 1) continue;
      for (const dst of machinesByStation(ctx)) {
        if (dst.stationId === src.stationId) continue;
        const dstStation = ctx.harbor.stations.find((s) => s.id === dst.stationId)!;
        if (!ProductionSystem.isUnlocked(dstStation, ctx.state)) continue;
        const accepted = acceptedInputs(ctx, dst.machineId);
        if (!accepted.has(itemId)) continue;
        if (!destHasRoom(ctx, dst.input, itemId, w.id)) continue;
        const demand = machineDemand(dst);
        let score = scoreHaul(ctx, w, src.output, zone.x, zone.z, src.status === "OUTPUT_FULL" ? 50 : 0, demand);
        // Finish 3.0 Phase 11 — pad_link prioritizes starving machine inputs.
        if (
          StaffTreesSystem.branchOf(ctx.content, w)?.id === "branch.operator.pad_link" &&
          dst.status === "WAITING_FOR_INPUT"
        ) {
          score += 35;
        }
        const offer: HaulOffer = {
          source: src.output, dest: dst.input, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: srcStation.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) best = offer;
      }
    }
  }
  return best;
}

function findFishableSpot(ctx: StepContext, w: WorkerState) {
  const branchId = StaffTreesSystem.branchOf(ctx.content, w)?.id;
  const trophyCast = branchId === "branch.fisher.trophy_cast";
  const linePro = branchId === "branch.fisher.line_pro";
  let best: (typeof ctx.state.fishingSpots)[number] | null = null;
  let bestScore = -1;
  let bestZone = "";
  let considered = 0;
  for (const spot of ctx.state.fishingSpots) {
    const def = ctx.harbor.fishingSpots.find((f) => f.zone === spot.zoneId)!;
    if (!FishingSystem.isUnlocked(def, ctx.state) || spot.stock <= 0) continue;
    if (!def.species.some((id) => w.bag.roomFor(id) >= 1)) continue;
    const zone = zonePoint(ctx.harbor, spot.zoneId);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const demand = def.species.filter((id) => w.bag.roomFor(id) >= 1 && machineHungryFor(ctx, id)).length;
    let score = spot.stock * 10 + demand * 40 + Math.max(0, 200 - distTicks);
    // Finish 4.0 Phase 19 — line_pro_stock / trophy_cast_bias spot scoring.
    if (linePro) score += spot.stock * 15;
    if (trophyCast) {
      const rareBias = def.species.filter((id) => {
        if (w.bag.roomFor(id) < 1) return false;
        return (ctx.content.speciesById.get(id)?.rarityWeight ?? 100) <= TROPHY_CAST_RARE_WEIGHT_MAX;
      }).length;
      score += rareBias * 55;
    }
    considered++;
    if (
      !best ||
      score > bestScore ||
      (score === bestScore && compareStrings(spot.zoneId, bestZone) > 0)
    ) {
      best = spot;
      bestScore = score;
      bestZone = spot.zoneId;
    }
  }
  WorkerDecisionHooks.record({
    workerId: w.id,
    role: "fisher",
    kind: "spot",
    reason: !best
      ? "none_available"
      : trophyCast
        ? "trophy_cast_bias"
        : linePro
          ? "line_pro_stock"
          : "best_score",
    score: best ? bestScore : null,
    candidatesConsidered: considered,
    tick: ctx.state.tick,
  });
  return best;
}

function porterMayHaul(ctx: StepContext, itemId: string, supervisor: boolean): boolean {
  const machineWants = ctx.state.machines.some((m) => {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    return ProductionSystem.isUnlocked(station, ctx.state) &&
      acceptedInputs(ctx, m.machineId).has(itemId) && destHasRoom(ctx, m.input, itemId, "");
  });
  if (!machineWants) return true;
  if (!supervisor) return false;
  return counterDemandForItem(ctx, itemId) > 0;
}

function destHasRoom(ctx: StepContext, dest: Inventory, itemId: string, exceptWorkerId: string): boolean {
  return dest.roomFor(itemId) - pendingDestClaims(ctx, dest.id, itemId, exceptWorkerId) >= 1;
}

function pendingDestClaims(ctx: StepContext, destId: string, itemId: string, exceptWorkerId: string): number {
  let n = 0;
  for (const o of ctx.state.workers) {
    if (o.id === exceptWorkerId) continue;
    if (o.taskDestInvId !== destId) continue;
    if (o.phase === "WALK_TO_WORK" || o.phase === "PICKUP") {
      if (o.taskItemId === itemId) n += Math.max(1, o.taskQuantity);
    } else if (o.phase === "WALK_TO_DROP" || o.phase === "DROP" || o.phase === "NONE") {
      n += o.bag.quantity(itemId);
    }
  }
  return n;
}

function scoreHaul(
  ctx: StepContext,
  w: WorkerState,
  source: Inventory,
  sourceX: number,
  sourceZ: number,
  urgencyBonus: number,
  demand: number,
): number {
  const routing = ctx.content.routing;
  const fill = source.capacityUnits <= 0 ? 0
    : Math.min(100, Math.max(0, Math.trunc((source.usedUnits() * 100) / source.capacityUnits)));
  const urgency = fill + urgencyBonus;
  const distTicks = WorkerSystem.walkTicks(w.x, w.z, sourceX, sourceZ, 160);
  const distance = Math.max(0, 200 - distTicks);
  let demW = routing.demandWeight;
  if (WorkerSystem.supervisorOnDuty(ctx.content, ctx.state)) {
    demW = Math.trunc((demW * routing.supervisorDemandBoostPermille) / 1000);
  }
  return routing.urgencyWeight * urgency + routing.distanceWeight * distance + demW * demand;
}

function betterHaul(a: HaulOffer, b: HaulOffer): boolean {
  if (a.score !== b.score) return a.score > b.score;
  const srcCmp = compareStrings(a.source.id, b.source.id);
  if (srcCmp !== 0) return srcCmp < 0;
  const destCmp = compareStrings(a.dest.id, b.dest.id);
  if (destCmp !== 0) return destCmp < 0;
  return compareStrings(a.itemId, b.itemId) < 0;
}

function counterDemand(ctx: StepContext, counter: CounterState, itemId: string): number {
  let d = 0;
  const waiting = ctx.state.customers.filter((c) => c.counterId === counter.counterId && c.arrived).length;
  d += waiting * 20;
  if (counter.stock.available(itemId) === 0) d += 40;
  d += ctx.state.customers.filter((c) =>
    c.counterId === counter.counterId && c.arrived && c.preferredProductId === itemId && !c.preferenceMet(),
  ).length * 30;
  return d;
}

function counterDemandForItem(ctx: StepContext, itemId: string): number {
  let best = 0;
  for (const c of ctx.state.counters) {
    const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
    if (!CustomerSystem.isUnlocked(def, ctx.state)) continue;
    best = Math.max(best, counterDemand(ctx, c, itemId));
  }
  return best;
}

function machineDemand(m: MachineState): number {
  let d = 0;
  if (m.status === "WAITING_FOR_INPUT") d += 40;
  if (m.input.isEmpty()) d += 20;
  return d;
}

function machineHungryFor(ctx: StepContext, itemId: string): boolean {
  return ctx.state.machines.some((m) => {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    return ProductionSystem.isUnlocked(station, ctx.state) &&
      acceptedInputs(ctx, m.machineId).has(itemId) && m.input.roomFor(itemId) >= 1;
  });
}

interface MachineDrop { machine: MachineState; x: number; z: number; zoneId: string }
interface CounterDrop { counter: CounterState; x: number; z: number; zoneId: string }

function findMachineInputForBag(ctx: StepContext, w: WorkerState): MachineDrop | null {
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const accepted = acceptedInputs(ctx, m.machineId);
    const has = w.bag.contents().some(([item]) => accepted.has(item) && destHasRoom(ctx, m.input, item, w.id));
    if (!has) continue;
    const zone = zonePoint(ctx.harbor, station.inputZone);
    return { machine: m, x: zone.x, z: zone.z, zoneId: station.inputZone };
  }
  return null;
}

function findSmokerInputDrop(ctx: StepContext, w: WorkerState): MachineDrop | null {
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!station.machine.includes("smoker")) continue;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const accepted = acceptedInputs(ctx, m.machineId);
    const has = w.bag.contents().some(([item]) => accepted.has(item) && destHasRoom(ctx, m.input, item, w.id));
    if (!has) continue;
    const zone = zonePoint(ctx.harbor, station.inputZone);
    return { machine: m, x: zone.x, z: zone.z, zoneId: station.inputZone };
  }
  return null;
}

function findSmokerHaul(ctx: StepContext, w: WorkerState): HaulOffer | null {
  let best: HaulOffer | null = null;
  for (const src of machinesByStation(ctx)) {
    const srcStation = ctx.harbor.stations.find((s) => s.id === src.stationId)!;
    if (!ProductionSystem.isUnlocked(srcStation, ctx.state)) continue;
    const zone = zonePoint(ctx.harbor, srcStation.outputZone);
    for (const [itemId] of src.output.contents()) {
      if (src.output.available(itemId) < 1) continue;
      if (w.bag.roomFor(itemId) < 1) continue;
      for (const dst of machinesByStation(ctx)) {
        if (dst.stationId === src.stationId) continue;
        const dstStation = ctx.harbor.stations.find((s) => s.id === dst.stationId)!;
        if (!ProductionSystem.isUnlocked(dstStation, ctx.state)) continue;
        const involvesSmoker = srcStation.machine.includes("smoker") || dstStation.machine.includes("smoker");
        if (!involvesSmoker) continue;
        const accepted = acceptedInputs(ctx, dst.machineId);
        if (!accepted.has(itemId)) continue;
        if (!destHasRoom(ctx, dst.input, itemId, w.id)) continue;
        const demand = machineDemand(dst);
        const score = scoreHaul(ctx, w, src.output, zone.x, zone.z, src.status === "OUTPUT_FULL" ? 50 : 0, demand) + 60;
        const offer: HaulOffer = {
          source: src.output, dest: dst.input, itemId,
          sourceX: zone.x, sourceZ: zone.z, sourceZoneId: srcStation.outputZone, score,
        };
        if (!best || betterHaul(offer, best)) best = offer;
      }
    }
  }
  return best;
}

function smokerPost(ctx: StepContext): MachineDrop | null {
  for (const m of machinesByStation(ctx)) {
    const station = ctx.harbor.stations.find((s) => s.id === m.stationId)!;
    if (!station.machine.includes("smoker")) continue;
    if (!ProductionSystem.isUnlocked(station, ctx.state)) continue;
    const zone = zonePoint(ctx.harbor, station.inputZone);
    return { machine: m, x: zone.x, z: zone.z, zoneId: station.inputZone };
  }
  return null;
}

function findCounterDrop(ctx: StepContext, w: WorkerState): CounterDrop | null {
  const counters = [...ctx.state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId));
  let best: CounterDrop | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const c of counters) {
    const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
    if (!CustomerSystem.isUnlocked(def, ctx.state)) continue;
    const item = w.bag.contents()
      .map(([id]) => id)
      .filter((id) => counterAccepts(def, id) && destHasRoom(ctx, c.stock, id, w.id))
      .sort(compareStrings)[0];
    if (!item) continue;
    const zone = zonePoint(ctx.harbor, def.zone);
    const demand = counterDemand(ctx, c, item);
    if (!best || demand > bestScore || (demand === bestScore && compareStrings(c.counterId, best.counter.counterId) < 0)) {
      best = { counter: c, x: zone.x, z: zone.z, zoneId: def.zone };
      bestScore = demand;
    }
  }
  return best;
}

function findInventory(ctx: StepContext, id: string): Inventory | null {
  for (const m of ctx.state.machines) {
    if (m.input.id === id) return m.input;
    if (m.output.id === id) return m.output;
  }
  for (const c of ctx.state.counters) if (c.stock.id === id) return c.stock;
  for (const w of ctx.state.workers) if (w.bag.id === id) return w.bag;
  if (ctx.state.player.bag.id === id) return ctx.state.player.bag;
  return null;
}

function abortHaul(ctx: StepContext, w: WorkerState): void {
  const sourceId = w.taskSourceInvId;
  const itemId = w.taskItemId;
  if (sourceId !== null && itemId !== null) {
    const inv = findInventory(ctx, sourceId);
    if (inv && inv.reservedQuantity(itemId) > 0) {
      inv.releaseReservation(itemId, Math.min(1, inv.reservedQuantity(itemId)));
    }
  }
  clearTask(w);
}

function clearTask(w: WorkerState): void {
  w.phase = "NONE";
  w.taskId = null;
  w.taskZoneId = null;
  w.taskSourceInvId = null;
  w.taskDestInvId = null;
  w.taskItemId = null;
  w.taskQuantity = 0;
  w.leaseExpiresAt = 0;
  clearCast(w);
}

function clearCast(w: WorkerState): void {
  w.fishingSpecies = null;
  w.fishingProgress = 0;
  w.fishingCatchTicks = 0;
}

function startWalk(w: WorkerState, toX: number, toZ: number, mmPerTick: number): void {
  w.walkFromX = w.x;
  w.walkFromZ = w.z;
  w.walkToX = toX;
  w.walkToZ = toZ;
  const ticks = WorkerSystem.walkTicks(w.x, w.z, toX, toZ, mmPerTick);
  w.walkTicksTotal = ticks;
  w.walkTicksLeft = ticks;
  if (ticks === 0) {
    w.x = toX;
    w.z = toZ;
  }
}

function advanceWalk(w: WorkerState): void {
  if (w.walkTicksLeft <= 0) return;
  w.walkTicksLeft--;
  const total = Math.max(1, w.walkTicksTotal);
  const elapsed = total - w.walkTicksLeft;
  w.x = w.walkFromX + idiv((w.walkToX - w.walkFromX) * elapsed, total);
  w.z = w.walkFromZ + idiv((w.walkToZ - w.walkFromZ) * elapsed, total);
  if (w.walkTicksLeft === 0) {
    w.x = w.walkToX;
    w.z = w.walkToZ;
  }
}

function machinesByStation(ctx: StepContext): MachineState[] {
  return [...ctx.state.machines].sort((a, b) => compareStrings(a.stationId, b.stationId));
}

function acceptedInputs(ctx: StepContext, machineId: string): Set<string> {
  const set = new Set<string>();
  const def = ctx.content.machinesById.get(machineId)!;
  for (const rid of def.recipes) {
    for (const iq of ctx.content.recipesById.get(rid)!.inputs) set.add(iq.item);
  }
  return set;
}

function zonePoint(harbor: HarborDef, zoneId: string): { x: number; z: number } {
  const zone = harbor.zones.find((z) => z.id === zoneId);
  if (!zone) throw new Error(`Unknown zone ${zoneId}`);
  return { x: rectCenterX(zone), z: rectCenterZ(zone) };
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
  masteryGrantCatchXp: (ctx, speciesId, timingTier, rare) =>
    MasterySystem.grantCatchXp(ctx, speciesId, timingTier, rare),
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
