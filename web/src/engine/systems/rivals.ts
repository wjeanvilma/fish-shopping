/**
 * Extracted Finish 6.0 Phase 4 — rival markets.
 */
import type { ContentPack, CounterDef, RivalMarketDef } from "../content";
import { idiv } from "../foundations";
import { CounterState, GameState, Stats } from "../state";
import { StepContext } from "./context";
import { FishingSystem } from "./fishing";
import { ReputationSystem } from "./progression";

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

