/**
 * Per-tick systems. Each function mirrors the Kotlin object of the same name in game-core;
 * keep them line-for-line comparable so fixture mismatches are easy to trace.
 */
import type { BaitDef, ContentPack, ContractTemplateDef, CounterDef, DayPartDef, DecorDef, FishingSpotDef, HarborDef, ItemQuantity, PlotDef, PointMm, PrestigeMilestoneDef, QuestDef, RecipeDef, RushWindowDef, SeasonalEventDef, SpeciesDef, UpgradeDef, UpgradeEffect, WorkerDef } from "./content";
import { bankRepayAmount } from "./content";
import type { TimingTier, TrophyRecord } from "./state";
import { counterAccepts, queueSlot, rectCenterX, rectCenterZ, rectContains } from "./content";
import { INPUT_SCALE, SafeMath, TICKS_PER_SECOND, compareStrings, idiv } from "./foundations";
import { Inventory, Transfers } from "./inventory";
import { ContractState, CounterState, CustomerState, FishingSpotState, GameState, MachineState, PlayerState, Receipt, Stats, WorkerState, type ContractOffer, type GameEvent, type HarborWorldStash } from "./state";

export class StepContext {
  readonly events: GameEvent[] = [];
  constructor(readonly content: ContentPack, readonly state: GameState) {}
  /** Resolved each access so travel_to_harbor takes effect mid-tick. */
  get harbor(): HarborDef { return this.content.harbor(this.state.harborId); }
  emit(e: GameEvent): void { this.events.push(e); }
}

// ---------------------------------------------------------------- world/World.kt

export const PLAYER_RADIUS_MM = 300;

export function isOpen(h: HarborDef, x: number, z: number): boolean {
  return h.walkable.some((w) => rectContains(w, x, z)) &&
    !h.obstacles.some((o) =>
      x >= o.minX - PLAYER_RADIUS_MM && x < o.maxX + PLAYER_RADIUS_MM &&
      z >= o.minZ - PLAYER_RADIUS_MM && z < o.maxZ + PLAYER_RADIUS_MM);
}

export const MovementSystem = {
  step(ctx: StepContext): void {
    const p = ctx.state.player;
    let ix = p.inputX;
    let iz = p.inputZ;
    const len = SafeMath.isqrt(ix * ix + iz * iz);
    if (len === 0) return;
    if (len > INPUT_SCALE) {
      ix = idiv(ix * INPUT_SCALE, len);
      iz = idiv(iz * INPUT_SCALE, len);
    }
    const speed = ctx.content.player.moveSpeedMmPerTick;
    const dx = idiv(ix * speed, INPUT_SCALE);
    const dz = idiv(iz * speed, INPUT_SCALE);
    p.facingX = ix;
    p.facingZ = iz;
    const h = ctx.harbor;
    if (isOpen(h, p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
    else if (isOpen(h, p.x + dx, p.z)) p.x += dx;
    else if (isOpen(h, p.x, p.z + dz)) p.z += dz;
  },

  updateZone(ctx: StepContext): void {
    const p = ctx.state.player;
    const zone = ctx.harbor.zones.find((z) => rectContains(z, p.x, p.z))?.id ?? null;
    if (zone !== p.zoneId) {
      p.zoneId = zone;
      p.transferCooldown = 0;
      ctx.emit({ type: "zone_entered", tick: ctx.state.tick, zoneId: zone });
    }
  },
};

export const TransferSystem = {
  step(ctx: StepContext): void {
    const s = ctx.state;
    const p = s.player;
    if (p.transferCooldown > 0) {
      p.transferCooldown--;
      return;
    }
    const zone = p.zoneId ? ctx.harbor.zones.find((z) => z.id === p.zoneId) : undefined;
    if (!zone) return;
    let moved = false;
    const transferred = (from: Inventory, to: Inventory, item: string | null, stat: string) => {
      if (item === null) return;
      s.bumpStat(stat);
      ctx.emit({ type: "items_transferred", tick: s.tick, from: from.id, to: to.id, itemId: item, count: 1 });
      moved = true;
    };
    switch (zone.kind) {
      case "machine_input": {
        const station = ctx.harbor.stations.find((st) => st.inputZone === zone.id)!;
        if (!ProductionSystem.isUnlocked(station, s)) break;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        const accepted = new Set(ctx.content.machinesById.get(m.machineId)!.recipes
          .flatMap((rid) => ctx.content.recipesById.get(rid)!.inputs.map((iq) => iq.item)));
        transferred(p.bag, m.input, Transfers.moveFirstAccepted(p.bag, m.input, (it) => accepted.has(it)), Stats.MACHINE_INPUTS);
        break;
      }
      case "machine_output": {
        const station = ctx.harbor.stations.find((st) => st.outputZone === zone.id)!;
        if (!ProductionSystem.isUnlocked(station, s)) break;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        transferred(m.output, p.bag, Transfers.moveFirstAccepted(m.output, p.bag, () => true), Stats.OUTPUTS_COLLECTED);
        break;
      }
      case "counter": {
        const counter = s.counters.find((c) => ctx.harbor.counters.find((d) => d.id === c.counterId)!.zone === zone.id)!;
        const def = ctx.harbor.counters.find((d) => d.id === counter.counterId)!;
        if (!CustomerSystem.isUnlocked(def, s)) break;
        transferred(p.bag, counter.stock, Transfers.moveFirstAccepted(p.bag, counter.stock, (it) => def.products.includes(it)), Stats.COUNTER_STOCKED);
        break;
      }
      case "fishing":
      case "kiosk":
      case "plot":
        break;
    }
    if (moved) p.transferCooldown = ctx.content.player.transferIntervalTicks - 1;
  },
};

// ---------------------------------------------------------------- fishing/FishingSystem.kt

export const FishingSystem = {
  step(ctx: StepContext): void {
    FishingSystem.regenerate(ctx);
    const s = ctx.state;
    const p = s.player;
    const zone = p.zoneId ? ctx.harbor.zones.find((z) => z.id === p.zoneId) : undefined;
    if (!zone || zone.kind !== "fishing") {
      FishingSystem.clearCast(p);
      p.reelRequested = false;
      return;
    }
    const spotDef = ctx.harbor.fishingSpots.find((f) => f.zone === zone.id)!;
    const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;

    if (!FishingSystem.isUnlocked(spotDef, s)) {
      FishingSystem.clearCast(p);
      p.reelRequested = false;
      return;
    }

    if (p.fishingSpecies === null) {
      if (spot.stock <= 0) { p.reelRequested = false; return; }
      const candidates = spotDef.species.map((id) => ctx.content.speciesById.get(id)!)
        .filter((sp) => p.bag.roomFor(sp.id) >= 1);
      if (candidates.length === 0) { p.reelRequested = false; return; }
      const bait = BaitSystem.resolveForCast(ctx.content, s);
      p.activeBaitId = bait?.id ?? null;
      const weights = candidates.map((sp) =>
        SeasonalEventSystem.scaledWeight(BaitSystem.effectiveWeight(sp, bait), ctx.content, s.tick, sp.id),
      );
      const pick = candidates[s.rng.pickWeighted(weights)]!;
      p.fishingSpecies = pick.id;
      p.fishingProgress = 0;
      p.fishingCatchTicks = FishingSystem.catchTicksFor(
        FishingSystem.effectiveCatchSpeed(ctx.content, s), pick.catchTicks,
      );
      p.reelAttemptedThisCast = false;
    }

    const species = ctx.content.speciesById.get(p.fishingSpecies)!;
    const duration = p.fishingCatchTicks > 0
      ? p.fishingCatchTicks
      : FishingSystem.catchTicksFor(FishingSystem.effectiveCatchSpeed(ctx.content, s), species.catchTicks);
    p.fishingCatchTicks = duration;

    let reelTier: TimingTier = "miss";
    if (p.reelRequested) {
      p.reelRequested = false;
      if (!p.reelAttemptedThisCast) {
        p.reelAttemptedThisCast = true;
        reelTier = FishingSystem.timingTierAt(p, p.fishingProgress, duration);
        if (reelTier !== "miss") {
          p.fishingProgress = duration;
        }
      }
    }

    if (reelTier === "miss") p.fishingProgress++;
    if (p.fishingProgress < duration) return;

    FishingSystem.commitCatch(ctx, zone.id, spot.zoneId, species.id, reelTier);
    FishingSystem.clearCast(p);
  },

  TIDE_CHART_UPGRADE: "upgrade.tide_chart",

  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  hasTideChart(state: GameState): boolean {
    return state.ownedUpgrades.has(FishingSystem.TIDE_CHART_UPGRADE) || state.player.fishRegenPermille > 1000;
  },

  dayPartAt(content: ContentPack, tick: number): DayPartDef {
    const eco = content.ecology;
    const phase = idiv((tick % eco.dayLengthTicks) * 1000, eco.dayLengthTicks);
    return eco.parts.find((p) => phase < p.endPermille)!;
  },

  effectiveDayPartRegenMult(
    content: ContentPack,
    state: GameState,
    def: FishingSpotDef,
    part: DayPartDef,
  ): number {
    let mult = def.dayPartRegenMultPermille?.[part.id] ?? part.regenMultPermille;
    if (FishingSystem.hasTideChart(state) && mult > 1000) {
      mult = 1000 + idiv(mult - 1000, 2);
    }
    return Math.max(1, mult);
  },

  /** Player upgrades, prestige floors, and (with tide chart) day-part catch bonuses. */
  effectiveCatchSpeed(content: ContentPack, state: GameState): number {
    const base = Math.max(state.player.catchSpeedPermille, state.prestigeCatchSpeedPermille);
    if (!FishingSystem.hasTideChart(state)) return base;
    const part = FishingSystem.dayPartAt(content, state.tick);
    return Math.max(1, idiv(base * part.catchSpeedMultPermille, 1000));
  },

  catchTicksFor(catchSpeedPermille: number, baseCatchTicks: number): number {
    return Math.max(1, idiv(baseCatchTicks * 1000, catchSpeedPermille));
  },

  inTimingWindow(progress: number, duration: number, startPermille: number, endPermille: number): boolean {
    if (duration <= 0) return false;
    const permille = idiv(progress * 1000, duration);
    return permille >= startPermille && permille < endPermille;
  },

  timingTierAt(player: PlayerState, progress: number, duration: number): TimingTier {
    if (duration <= 0) return "miss";
    if (FishingSystem.inTimingWindow(
      progress, duration, player.timingPerfectStartPermille, player.timingPerfectEndPermille,
    )) return "perfect";
    if (FishingSystem.inTimingWindow(
      progress, duration, player.timingWindowStartPermille, player.timingWindowEndPermille,
    )) return "good";
    return "miss";
  },

  timingBonusPermille(content: ContentPack, tier: TimingTier): number {
    if (tier === "perfect") return content.player.timingPerfectBonusPermille;
    if (tier === "good") return content.player.timingGoodBonusPermille;
    return 0;
  },

  curveMultPermille(curve: readonly number[], stock: number, stockMax: number): number {
    if (curve.length < 2) throw new Error("regenCurvePermille needs >= 2 entries");
    if (stockMax <= 0) return curve[0]!;
    const stockC = Math.max(0, Math.min(stock, stockMax));
    const t = idiv(stockC * 1000, stockMax);
    const last = curve.length - 1;
    const scaled = t * last;
    const i0 = Math.max(0, Math.min(idiv(scaled, 1000), last - 1));
    const frac = scaled % 1000;
    const a = curve[i0]!;
    const b = curve[i0 + 1]!;
    return a + idiv((b - a) * frac, 1000);
  },

  regenTicksFor(
    def: { stockMax: number; regenTicks: number; regenCurvePermille: readonly number[] },
    stock: number,
    fishRegenPermille: number,
    dayPartRegenMultPermille = 1000,
  ): number {
    const mult = FishingSystem.curveMultPermille(def.regenCurvePermille, stock, def.stockMax);
    const base = idiv(def.regenTicks * mult, 1000);
    const withDay = idiv(base * dayPartRegenMultPermille, 1000);
    return Math.max(1, idiv(withDay * 1000, fishRegenPermille));
  },

  regenTicksForState(content: ContentPack, state: GameState, def: FishingSpotDef, stock: number): number {
    const part = FishingSystem.dayPartAt(content, state.tick);
    const dayMult = FishingSystem.effectiveDayPartRegenMult(content, state, def, part);
    return FishingSystem.regenTicksFor(def, stock, state.player.fishRegenPermille, dayMult);
  },

  commitCatch(ctx: StepContext, zoneId: string, spotZoneId: string, rolledSpeciesId: string, timingTier: TimingTier): void {
    const s = ctx.state;
    const p = s.player;
    const spot = s.fishingSpots.find((f) => f.zoneId === spotZoneId)!;
    const rolled = ctx.content.speciesById.get(rolledSpeciesId)!;
    const activeBait = p.activeBaitId
      ? ctx.content.baitById.get(p.activeBaitId)
      : undefined;
    const bait = activeBait && p.bag.quantity(activeBait.id) >= 1 ? activeBait : undefined;
    let finalId = rolledSpeciesId;
    let rare = false;
    const ru = rolled.rareUpgrade;
    if (ru) {
      const harborBonus = ctx.harbor.specialization?.rareChanceBonusPermille ?? 0;
      const chance = BaitSystem.rareChancePermille(ru.chancePermille, bait, harborBonus);
      if (s.rng.nextBelow(1000) < chance) {
        finalId = ru.to;
        rare = true;
      }
    }
    const finalSpecies = ctx.content.speciesById.get(finalId)!;
    if (p.bag.roomFor(finalSpecies.id) >= 1 && spot.stock > 0) {
      p.bag.add(finalSpecies.id, 1);
      spot.stock--;
      s.bumpStat(Stats.FISH_CAUGHT);
      s.recordSpeciesCatch(finalSpecies.id);
      if (rare) s.bumpStat(Stats.RARE_CATCHES);
      if (bait) {
        p.bag.remove(bait.id, 1);
        s.bumpStat(Stats.BAIT_USED);
      }
      const bonusMult = FishingSystem.timingBonusPermille(ctx.content, timingTier);
      let bonusCoins = 0;
      if (bonusMult > 0) {
        bonusCoins = idiv(finalSpecies.baseValue * bonusMult, 1000);
        if (bonusCoins > 0) {
          s.coins = SafeMath.creditCoins(s.coins, bonusCoins);
          s.bumpStat(Stats.TIMING_BONUSES);
          s.bumpStat(Stats.REVENUE, bonusCoins);
          s.record({ id: s.newId("tip"), type: "timing_bonus", coinDelta: bonusCoins, tick: s.tick, reference: finalSpecies.id });
        }
        if (timingTier === "perfect") s.bumpStat(Stats.PERFECT_REELS);
        else if (timingTier === "good") s.bumpStat(Stats.GOOD_REELS);
      }
      const timingBonus = timingTier !== "miss";
      const { sizePermille, valueCoins, personalBest } = TrophySystem.record(ctx, finalSpecies.id, timingTier);
      ctx.emit({
        type: "fish_caught", tick: s.tick, speciesId: finalSpecies.id, zoneId,
        timingBonus, timingTier, rareUpgrade: rare,
        sizePermille, valueCoins, personalBest,
      });
      if (spot.stock === 0) {
        ctx.emit({ type: "fishing_spot_depleted", tick: s.tick, zoneId });
      }
    }
  },

  clearCast(p: PlayerState): void {
    p.fishingSpecies = null;
    p.fishingProgress = 0;
    p.fishingCatchTicks = 0;
    p.reelAttemptedThisCast = false;
    p.activeBaitId = null;
  },

  regenerate(ctx: StepContext): void {
    for (const spot of ctx.state.fishingSpots) {
      const def = ctx.harbor.fishingSpots.find((f) => f.zone === spot.zoneId)!;
      if (spot.stock >= def.stockMax) {
        spot.regenProgress = 0;
        continue;
      }
      const needed = FishingSystem.regenTicksForState(ctx.content, ctx.state, def, spot.stock);
      if (++spot.regenProgress >= needed) {
        spot.stock++;
        spot.regenProgress = 0;
      }
    }
  },
};

export const BaitSystem = {
  requirementsMet(s: GameState, bait: BaitDef): boolean {
    return bait.requires.every((r) => s.ownedUpgrades.has(r) || s.completedQuests.has(r));
  },

  missingRequirement(content: ContentPack, s: GameState, bait: BaitDef): string | null {
    const missing = bait.requires.find((r) => !s.ownedUpgrades.has(r) && !s.completedQuests.has(r));
    if (!missing) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  resolveForCast(content: ContentPack, s: GameState): BaitDef | undefined {
    const preferred = s.player.preferredBaitId;
    if (preferred) {
      const def = content.baitById.get(preferred);
      if (def && s.player.bag.quantity(preferred) >= 1) return def;
    }
    return content.bait.find((b) => s.player.bag.quantity(b.id) >= 1);
  },

  effectiveWeight(species: { rarityWeight: number; rareUpgrade?: { to: string; chancePermille: number } | null }, bait?: BaitDef): number {
    if (!bait || !species.rareUpgrade) return species.rarityWeight;
    return Math.max(1, idiv(species.rarityWeight * bait.rareSpeciesWeightMultPermille, 1000));
  },

  rareChancePermille(baseChance: number, bait?: BaitDef, harborBonusPermille = 0): number {
    const baitBonus = bait?.rareChanceBonusPermille ?? 0;
    return Math.max(0, Math.min(1000, baseChance + baitBonus + harborBonusPermille));
  },

  select(s: GameState, content: ContentPack, baitId: string | null): void {
    if (baitId === null) {
      s.player.preferredBaitId = null;
      return;
    }
    if (content.baitById.has(baitId)) s.player.preferredBaitId = baitId;
  },

  buy(ctx: StepContext, baitId: string, requestId: string): void {
    const s = ctx.state;
    const prior = s.purchaseReceipts.get(requestId);
    if (prior) {
      ctx.emit({ type: "bait_purchased", tick: s.tick, baitId, quantity: 0, receipt: prior, replayed: true });
      return;
    }
    const zone = s.player.zoneId ? ctx.harbor.zones.find((z) => z.id === s.player.zoneId) : undefined;
    if (!zone || zone.kind !== "kiosk") {
      ctx.emit({ type: "bait_purchase_rejected", tick: s.tick, baitId, requestId, reason: "Stand at the bait kiosk" });
      return;
    }
    const bait = ctx.content.baitById.get(baitId);
    if (!bait) {
      ctx.emit({ type: "bait_purchase_rejected", tick: s.tick, baitId, requestId, reason: "Unknown bait" });
      return;
    }
    if (!BaitSystem.requirementsMet(s, bait)) {
      const miss = BaitSystem.missingRequirement(ctx.content, s, bait) ?? "an unlock";
      ctx.emit({ type: "bait_purchase_rejected", tick: s.tick, baitId, requestId, reason: `Requires: ${miss}` });
      return;
    }
    if (s.coins < bait.cost) {
      ctx.emit({ type: "bait_purchase_rejected", tick: s.tick, baitId, requestId, reason: `Need ${bait.cost - s.coins} more coins` });
      return;
    }
    const room = s.player.bag.roomFor(bait.id);
    if (room < 1) {
      ctx.emit({ type: "bait_purchase_rejected", tick: s.tick, baitId, requestId, reason: "Bag full" });
      return;
    }
    const qty = Math.min(bait.packQuantity, room);
    s.coins -= bait.cost;
    s.player.bag.add(bait.id, qty);
    s.bumpStat(Stats.BAIT_BOUGHT, qty);
    if (s.player.preferredBaitId === null) s.player.preferredBaitId = bait.id;
    const receipt: Receipt = { id: s.newId("receipt"), type: "bait", coinDelta: -bait.cost, tick: s.tick, reference: requestId };
    s.purchaseReceipts.set(requestId, receipt);
    s.record(receipt);
    ctx.emit({ type: "bait_purchased", tick: s.tick, baitId: bait.id, quantity: qty, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "bait" });
  },
};

export const TrophySystem = {
  GOOD_SIZE_BONUS: 50,
  PERFECT_SIZE_BONUS: 100,

  sizeBonusFor(tier: TimingTier): number {
    if (tier === "perfect") return TrophySystem.PERFECT_SIZE_BONUS;
    if (tier === "good") return TrophySystem.GOOD_SIZE_BONUS;
    return 0;
  },

  rollSizePermille(content: ContentPack, state: GameState, timingTier: TimingTier): number {
    const min = content.raw.trophies.sizeMinPermille;
    const max = content.raw.trophies.sizeMaxPermille;
    const span = max - min + 1;
    const raw = min + state.rng.nextBelow(span) + TrophySystem.sizeBonusFor(timingTier);
    return Math.max(min, Math.min(max, raw));
  },

  valueCoins(species: SpeciesDef, sizePermille: number): number {
    return Math.max(1, idiv(species.baseValue * sizePermille, 1000));
  },

  record(ctx: StepContext, speciesId: string, timingTier: TimingTier = "miss"): {
    sizePermille: number; valueCoins: number; personalBest: boolean;
  } {
    const content = ctx.content;
    const s = ctx.state;
    const species = content.speciesById.get(speciesId);
    if (!species) return { sizePermille: 0, valueCoins: 0, personalBest: false };
    const sizePermille = TrophySystem.rollSizePermille(content, s, timingTier);
    const valueCoins = TrophySystem.valueCoins(species, sizePermille);
    const prior = s.trophies.get(speciesId);
    const isBest = !prior || sizePermille > prior.sizePermille ||
      (sizePermille === prior.sizePermille && valueCoins > prior.valueCoins);
    if (!isBest) return { sizePermille, valueCoins, personalBest: false };

    const firstOfSpecies = !prior;
    const rec: TrophyRecord = { sizePermille, valueCoins, tick: s.tick };
    s.trophies.set(speciesId, rec);
    s.bumpStat(Stats.TROPHY_RECORDS);
    if (firstOfSpecies) s.bumpStat(Stats.TROPHY_SPECIES);
    ctx.emit({
      type: "trophy_recorded", tick: s.tick, speciesId, sizePermille, valueCoins, personalBest: true,
    });
    TrophySystem.refreshSets(ctx);
    return { sizePermille, valueCoins, personalBest: true };
  },

  refreshSets(ctx: StepContext): void {
    const content = ctx.content;
    const s = ctx.state;
    let completedNow = 0;
    for (const set of content.raw.trophies.sets) {
      const done = set.species.every((id) => s.trophies.has(id));
      const was = s.stat(set.completeStat) >= 1;
      if (done && !was) {
        s.stats.set(set.completeStat, 1);
        completedNow++;
        ctx.emit({ type: "trophy_set_completed", tick: s.tick, setId: set.id });
      } else if (done && was) {
        s.stats.set(set.completeStat, 1);
      } else if (!done) {
        s.stats.delete(set.completeStat);
      }
    }
    const n = content.raw.trophies.sets.filter((set) => s.stat(set.completeStat) >= 1).length;
    if (completedNow > 0 || n > 0 || s.stats.has(Stats.TROPHY_SETS_COMPLETE)) {
      s.stats.set(Stats.TROPHY_SETS_COMPLETE, n);
    }
  },

  rebuildSetStats(content: ContentPack, s: GameState): void {
    for (const set of content.raw.trophies.sets) {
      const done = set.species.every((id) => s.trophies.has(id));
      if (done) s.stats.set(set.completeStat, 1);
      else s.stats.delete(set.completeStat);
    }
    const n = content.raw.trophies.sets.filter((set) => s.stat(set.completeStat) >= 1).length;
    if (n > 0) s.stats.set(Stats.TROPHY_SETS_COMPLETE, n);
    else s.stats.delete(Stats.TROPHY_SETS_COMPLETE);
    const speciesCount = s.trophies.size;
    if (speciesCount > 0) s.stats.set(Stats.TROPHY_SPECIES, speciesCount);
    else s.stats.delete(Stats.TROPHY_SPECIES);
  },
};

// ---------------------------------------------------------------- production/ProductionSystem.kt

const fits = (content: ContentPack, inv: Inventory, items: readonly ItemQuantity[]) =>
  items.reduce((sum, iq) => sum + content.carryUnits(iq.item) * iq.quantity, 0) <= inv.freeUnits();

export const ProductionSystem = {
  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  stationDef(ctx: StepContext, stationId: string) {
    return ctx.harbor.stations.find((st) => st.id === stationId)!;
  },

  durationFor(m: MachineState, recipe: RecipeDef): number {
    return m.recipeDurations.get(recipe.id) ?? recipe.durationTicks;
  },

  durationForCtx(ctx: StepContext, m: MachineState, recipe: RecipeDef): number {
    let duration = ProductionSystem.durationFor(m, recipe);
    if (m.machineId.includes("smoker") &&
      WorkerSystem.smokerSpecialistOnDuty(ctx.content, ctx.state, ctx.harbor)) {
      const mult = ctx.content.staffProgression.roleBuffs.smokerSpecialistProcessSpeedPermille;
      duration = Math.max(1, Math.trunc((duration * 1000) / mult));
    }
    if (EconomySystem.isSlowed(m, ctx.state.tick)) {
      const slow = ctx.content.economy.wear.slowProcessMultPermille;
      duration = Math.max(1, Math.trunc((duration * slow) / 1000));
    }
    return duration;
  },

  recipeLabel(recipeId: string): string {
    return recipeId.replace(/^recipe\./, "").split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
  },

  machineRecipes(content: ContentPack, machineId: string): RecipeDef[] {
    return content.machinesById.get(machineId)!.recipes.map((id) => content.recipesById.get(id)!);
  },

  selectableRecipes(content: ContentPack, m: MachineState): RecipeDef[] {
    const all = ProductionSystem.machineRecipes(content, m.machineId);
    if (!m.preferredRecipeId) return all;
    const locked = all.filter((r) => r.id === m.preferredRecipeId);
    return locked.length > 0 ? locked : all;
  },

  queuedReady(content: ContentPack, m: MachineState): RecipeDef[] {
    return ProductionSystem.selectableRecipes(content, m)
      .filter((r) => r.inputs.every((iq) => m.input.available(iq.item) >= iq.quantity));
  },

  nextStartable(content: ContentPack, m: MachineState): RecipeDef | null {
    return ProductionSystem.queuedReady(content, m).find((r) => fits(content, m.output, r.outputs)) ?? null;
  },

  cyclePreferredRecipe(content: ContentPack, m: MachineState): string | null {
    const ids = ProductionSystem.machineRecipes(content, m.machineId).map((r) => r.id);
    if (ids.length === 0) { m.preferredRecipeId = null; return null; }
    const cur = m.preferredRecipeId;
    let next: string | null;
    if (cur === null) next = ids[0]!;
    else if (!ids.includes(cur)) next = null;
    else {
      const i = ids.indexOf(cur);
      next = i < 0 || i >= ids.length - 1 ? null : ids[i + 1]!;
    }
    m.preferredRecipeId = next;
    return next;
  },

  step(ctx: StepContext): void {
    for (const m of ctx.state.machines) ProductionSystem.stepMachine(ctx, m);
  },

  stepMachine(ctx: StepContext, m: MachineState): void {
    const s = ctx.state;
    const station = ProductionSystem.stationDef(ctx, m.stationId);
    if (!ProductionSystem.isUnlocked(station, s)) {
      m.status = "LOCKED";
      return;
    }
    if (m.paused) {
      m.status = "PAUSED";
      return;
    }
    if (m.broken) {
      m.status = "NEEDS_REPAIR";
      return;
    }
    if (m.preferredRecipeId) {
      const allowed = ctx.content.machinesById.get(m.machineId)!.recipes;
      if (!allowed.includes(m.preferredRecipeId)) m.preferredRecipeId = null;
    }
    const batch = m.activeBatch;
    if (batch) {
      if (batch.remainingTicks > 0) batch.remainingTicks--;
      if (batch.remainingTicks > 0) {
        m.status = "PROCESSING";
        return;
      }
      const recipe = ctx.content.recipesById.get(batch.recipeId)!;
      if (!fits(ctx.content, m.output, recipe.outputs)) {
        m.status = "OUTPUT_FULL";
        return;
      }
      recipe.outputs.forEach((o) => m.output.add(o.item, o.quantity));
      m.activeBatch = null;
      ctx.emit({ type: "batch_completed", tick: s.tick, batchId: batch.id, stationId: m.stationId });
    }

    const ready = ProductionSystem.queuedReady(ctx.content, m);
    const startable = ready.find((r) => fits(ctx.content, m.output, r.outputs));
    if (!startable) {
      m.status = ready.length > 0 ? "OUTPUT_FULL" : "WAITING_FOR_INPUT";
      return;
    }
    startable.inputs.forEach((iq) => m.input.remove(iq.item, iq.quantity));
    const duration = ProductionSystem.durationForCtx(ctx, m, startable);
    const next = { id: s.newId("batch"), recipeId: startable.id, durationTicks: duration, remainingTicks: duration, consumed: startable.inputs.map((i) => ({ ...i })) };
    m.activeBatch = next;
    m.status = "PROCESSING";
    ctx.emit({ type: "batch_started", tick: s.tick, batchId: next.id, stationId: m.stationId, recipeId: startable.id });
  },

  statusText(m: MachineState, content: ContentPack, lockedReason?: string | null): string {
    switch (m.status) {
      case "WAITING_FOR_INPUT": return ProductionSystem.waitingText(m, content);
      case "PROCESSING": {
        const id = m.activeBatch?.recipeId;
        return id ? `Processing ${ProductionSystem.recipeLabel(id)}` : "Processing";
      }
      case "OUTPUT_FULL": return ProductionSystem.outputFullText(m, content);
      case "PAUSED": return "Paused";
      case "LOCKED": return lockedReason ?? "Locked — buy an upgrade";
      case "NEEDS_REPAIR": return "Needs repair";
    }
  },

  waitingText(m: MachineState, content: ContentPack): string {
    const preferred = m.preferredRecipeId ? content.recipesById.get(m.preferredRecipeId) : undefined;
    if (preferred) {
      const missing = preferred.inputs
        .filter((iq) => m.input.available(iq.item) < iq.quantity)
        .map((iq) => content.itemName(iq.item));
      return missing.length === 0
        ? `Waiting: ${ProductionSystem.recipeLabel(preferred.id)}`
        : `Needs ${missing.join(", ")} for ${ProductionSystem.recipeLabel(preferred.id)}`;
    }
    const names = [...new Set(
      ProductionSystem.machineRecipes(content, m.machineId).flatMap((r) => r.inputs.map((iq) => content.itemName(iq.item))),
    )];
    if (names.length === 1) return `Needs ${names[0]}`;
    return "Needs input";
  },

  outputFullText(m: MachineState, content: ContentPack): string {
    const recipe = m.activeBatch
      ? content.recipesById.get(m.activeBatch.recipeId)
      : ProductionSystem.queuedReady(content, m)[0];
    const products = recipe?.outputs.map((o) => content.itemName(o.item)).join(", ");
    return products ? `Output full — collect ${products}` : "Output full — collect products";
  },
};

// ---------------------------------------------------------------- customers/CustomerSystem.kt

export const CustomerSystem = {
  step(ctx: StepContext): void {
    CustomerSystem.announceRushTransitions(ctx);
    CustomerSystem.spawn(ctx);
    const s = ctx.state;
    for (const counter of s.counters) {
      const def = ctx.harbor.counters.find((c) => c.id === counter.counterId)!;
      const front = s.customers.find((c) => c.counterId === counter.counterId && c.arrived);
      if (!front) {
        counter.checkoutProgress = 0;
        continue;
      }
      CustomerSystem.reserveTowardBasket(front, counter, def);

      const availableAccepted = CustomerSystem.acceptedAvailable(front, counter, def);
      const basketReady = front.reserved > 0 &&
        (front.reserved === front.wants || availableAccepted === 0);
      const served = s.player.zoneId === def.zone || CustomerSystem.cashierCovering(ctx, def.zone);
      if (basketReady && served) {
        if (++counter.checkoutProgress >= def.checkoutTicks) {
          CustomerSystem.pay(ctx, front, counter);
          s.customers.splice(s.customers.indexOf(front), 1);
          counter.checkoutProgress = 0;
          ctx.emit({ type: "customer_left", tick: s.tick, customerId: front.id, paid: true });
        }
      } else {
        counter.checkoutProgress = 0;
      }
    }

    for (const c of s.customers) if (c.walkTicksLeft > 0) c.walkTicksLeft--;
    const leaving: CustomerState[] = [];
    for (const c of s.customers) {
      if (!c.arrived) continue;
      const counter = s.counters.find((ct) => ct.counterId === c.counterId)!;
      const def = ctx.harbor.counters.find((d) => d.id === c.counterId)!;
      const type = ctx.content.customersById.get(c.typeId)!;
      c.patienceLeft -= CustomerSystem.patienceDrain(ctx, c, counter, def, type.unmetPatienceDrainPermille);
      if (c.patienceLeft <= 0) leaving.push(c);
    }
    for (const c of leaving) {
      const counter = s.counters.find((ct) => ct.counterId === c.counterId)!;
      CustomerSystem.releaseAll(c, counter);
      if (s.customers.find((x) => x.counterId === c.counterId && x.arrived) === c) counter.checkoutProgress = 0;
      s.customers.splice(s.customers.indexOf(c), 1);
      s.bumpStat(Stats.LOST_CUSTOMERS);
      ctx.emit({ type: "customer_left", tick: s.tick, customerId: c.id, paid: false });
    }
  },

  reserveTowardBasket(front: CustomerState, counter: CounterState, def: { products: string[] }): void {
    let need = front.wants - front.reserved;
    if (need <= 0) return;
    const pref = front.preferredProductId;
    if (pref && def.products.includes(pref)) {
      const take = Math.min(need, counter.stock.available(pref));
      if (take > 0 && counter.stock.reserve(pref, take)) {
        front.addReservation(pref, take);
        need -= take;
        if (need === 0) return;
      }
    }
    for (const [itemId] of counter.stock.contents()) {
      if (!def.products.includes(itemId) || itemId === pref) continue;
      const take = Math.min(need, counter.stock.available(itemId));
      if (take > 0 && counter.stock.reserve(itemId, take)) {
        front.addReservation(itemId, take);
        need -= take;
        if (need === 0) return;
      }
    }
  },

  acceptedAvailable(front: CustomerState, counter: CounterState, def: { products: string[] }): number {
    if (front.wants - front.reserved <= 0) return 0;
    let n = 0;
    for (const [itemId] of counter.stock.contents()) {
      if (def.products.includes(itemId)) n += counter.stock.available(itemId);
    }
    return n;
  },

  patienceDrain(
    ctx: StepContext,
    c: CustomerState,
    counter: CounterState,
    def: { products: string[] },
    unmetDrainPermille: number,
  ): number {
    const pref = c.preferredProductId;
    let drain: number;
    if (!pref || c.wants - c.reserved <= 0) {
      drain = 1;
    } else {
      const prefAvailable = def.products.includes(pref) ? counter.stock.available(pref) : 0;
      drain = prefAvailable > 0 ? 1 : Math.max(1, idiv(unmetDrainPermille, 1000));
    }
    if (WorkerSystem.greeterOnDuty(ctx.content, ctx.state)) {
      const mult = ctx.content.staffProgression.roleBuffs.greeterPatienceDrainMultPermille;
      drain = Math.max(1, Math.trunc((drain * mult) / 1000));
    }
    return drain;
  },

  releaseAll(c: CustomerState, counter: CounterState): void {
    for (const [itemId, qty] of c.reservedItems) counter.stock.releaseReservation(itemId, qty);
    c.clearReservations();
  },

  pay(ctx: StepContext, c: CustomerState, counter: CounterState): void {
    const s = ctx.state;
    const type = ctx.content.customersById.get(c.typeId)!;
    const items = [...c.reservedItems.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([item, quantity]) => ({ item, quantity }));
    let base = 0;
    for (const [itemId, qty] of c.reservedItems) {
      const price = ctx.content.productsById.get(itemId)!.unitPrice;
      base = SafeMath.add(base, SafeMath.multiply(price, qty));
    }
    const met = c.preferenceMet();
    let mult = type.priceMultPermille;
    if (!met) mult = idiv(mult * type.unmetPriceMultPermille, 1000);
    const counterDef = ctx.harbor.counters.find((ct) => ct.id === counter.counterId)!;
    mult = idiv(mult * CustomerSystem.demandPriceMultPermille(ctx.content, s, ctx.harbor, counterDef, counter), 1000);
    mult = idiv(mult * s.prestigePriceBonusPermille, 1000);
    const amount = idiv(base * mult, 1000);
    const saleId = s.newId("sale");
    s.coins = SafeMath.creditCoins(s.coins, amount);
    s.bumpStat(Stats.SALES);
    s.bumpStat(Stats.ITEMS_SOLD, c.reserved);
    s.bumpStat(Stats.REVENUE, amount);
    if (type.kind === "premium") s.bumpStat(Stats.PREMIUM_SALES);
    else if (type.kind === "bulk") s.bumpStat(Stats.BULK_SALES);
    else if (type.kind === "tourist") s.bumpStat(Stats.TOURIST_SALES);
    else if (type.kind === "wholesaler") s.bumpStat(Stats.WHOLESALER_SALES);
    else if (type.kind === "critic") s.bumpStat(Stats.CRITIC_SALES);
    else if (type.kind === "night_regular") s.bumpStat(Stats.NIGHT_SALES);
    if (!met) s.bumpStat(Stats.UNMET_PREFERENCE_SALES);
    s.record({ id: saleId, type: "sale", coinDelta: amount, tick: s.tick, reference: c.id });
    for (const [itemId, qty] of c.reservedItems) counter.stock.takeReserved(itemId, qty);
    c.clearReservations();
    // Phase 16: on-duty cashier at this pad earns XP for the assist.
    const counterZone = ctx.harbor.counters.find((ct) => ct.id === counter.counterId)!.zone;
    const cashier = s.workers.find((w) => {
      const role = ctx.content.workersById.get(w.roleId)?.role;
      return role === "cashier" &&
        !w.busyWalking &&
        w.phase === "WORK" &&
        w.taskZoneId === counterZone;
    });
    if (cashier) WorkerSystem.grantXp(ctx, cashier, ctx.content.staffProgression.xpSaleAssisted);
    ctx.emit({
      type: "sale_committed", tick: s.tick, saleId, customerId: c.id, items, coins: amount,
      customerTypeId: type.id, priceMultPermille: mult, preferenceMet: met,
      preferredProductId: c.preferredProductId,
    });
  },

  /** ceil(straight-line distance / speed), integer only. */
  walkTicks(from: PointMm, to: PointMm, mmPerTick: number): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    return idiv(dist + mmPerTick - 1, mmPerTick);
  },

  /** Approach polyline: entry → harbor waypoints → destination. */
  approachPath(harbor: HarborDef, destination: PointMm): PointMm[] {
    return [harbor.customerEntry, ...(harbor.customerPathWaypoints ?? []), destination];
  },

  pathWalkTicks(path: PointMm[], mmPerTick: number): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      total += CustomerSystem.walkTicks(path[i]!, path[i + 1]!, mmPerTick);
    }
    return total;
  },

  /** Point along [path] after [elapsedTicks] of [totalTicks] (distance-weighted). */
  pointAlongPath(path: PointMm[], elapsedTicks: number, totalTicks: number): { x: number; z: number } {
    if (path.length === 0) return { x: 0, z: 0 };
    if (totalTicks <= 0 || elapsedTicks >= totalTicks) {
      const last = path[path.length - 1]!;
      return { x: last.x, z: last.z };
    }
    if (elapsedTicks <= 0) {
      const first = path[0]!;
      return { x: first.x, z: first.z };
    }
    const lengths: number[] = [];
    let totalLen = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!, b = path[i + 1]!;
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = SafeMath.isqrt(dx * dx + dz * dz);
      lengths.push(len);
      totalLen += len;
    }
    if (totalLen <= 0) {
      const last = path[path.length - 1]!;
      return { x: last.x, z: last.z };
    }
    let target = idiv(elapsedTicks * totalLen, totalTicks);
    for (let i = 0; i < lengths.length; i++) {
      const len = lengths[i]!;
      if (target <= len) {
        const a = path[i]!, b = path[i + 1]!;
        if (len === 0) return { x: a.x, z: a.z };
        return {
          x: a.x + idiv((b.x - a.x) * target, len),
          z: a.z + idiv((b.z - a.z) * target, len),
        };
      }
      target -= len;
    }
    const last = path[path.length - 1]!;
    return { x: last.x, z: last.z };
  },

  isUnlocked(def: { requiresUpgrade?: string | null }, state: GameState): boolean {
    return !def.requiresUpgrade || state.ownedUpgrades.has(def.requiresUpgrade);
  },

  spawn(ctx: StepContext): void {
    const s = ctx.state;
    const interval = CustomerSystem.spawnIntervalTicks(ctx.harbor, s.tick);
    if (++s.customerSpawnProgress < interval) return;
    s.customerSpawnProgress = 0;
    const rush = CustomerSystem.activeRush(ctx.harbor, s.tick);
    const open = ctx.harbor.counters.filter((d) =>
      CustomerSystem.isUnlocked(d, s) &&
      s.customers.filter((c) => c.counterId === d.id).length < CustomerSystem.effectiveMaxQueue(d, rush));
    if (open.length === 0) return;
    const types = ctx.content.customers;
    const type = types[s.rng.pickWeighted(types.map((t) => CustomerSystem.effectiveSpawnWeight(ctx.content, s, ctx.harbor, t)))]!;
    const wants = s.rng.nextInRange(type.basketMin, type.basketMax);
    let preferredRoll: string | null = null;
    if (type.preferredProducts.length > 0) {
      const pick = type.preferredProducts[s.rng.pickWeighted(type.preferredProducts.map((p) => p.weight))]!;
      preferredRoll = pick.item;
    }
    const counterDef = CustomerSystem.pickCounter(open, type, preferredRoll, s);
    if (!counterDef) return;
    const preferred = preferredRoll && counterDef.products.includes(preferredRoll) ? preferredRoll : null;
    const slot = queueSlot(counterDef, s.customers.filter((x) => x.counterId === counterDef.id).length);
    const path = CustomerSystem.approachPath(ctx.harbor, slot);
    const patience = type.patienceTicks + DecorSystem.patienceBonusTicks(ctx.content, s);
    const c = new CustomerState(
      s.newId("customer"), type.id, counterDef.id, wants, patience,
      CustomerSystem.pathWalkTicks(path, ctx.harbor.customerWalkMmPerTick),
      preferred,
    );
    s.customers.push(c);
    ctx.emit({ type: "customer_arrived", tick: s.tick, customerId: c.id, counterId: counterDef.id });
  },

  /**
   * Choose an open unlocked counter: wholesalers prefer wholesale pads;
   * others prefer a pad that can sell their preferred SKU; then least queue.
   */
  pickCounter(
    open: CounterDef[],
    type: { kind: string },
    preferred: string | null,
    state: GameState,
  ): CounterDef | undefined {
    if (open.length === 0) return undefined;
    const matching = preferred ? open.filter((d) => d.products.includes(preferred)) : [];
    const wholesale = open.filter((d) => (d.kind ?? "retail") === "wholesale");
    let pool: CounterDef[];
    if (type.kind === "wholesaler" && matching.some((d) => (d.kind ?? "retail") === "wholesale")) {
      pool = matching.filter((d) => (d.kind ?? "retail") === "wholesale");
    } else if (type.kind === "wholesaler" && wholesale.length > 0) {
      pool = wholesale;
    } else if (matching.length > 0) {
      pool = matching;
    } else {
      pool = open;
    }
    return [...pool].sort((a, b) => {
      const qa = state.customers.filter((c) => c.counterId === a.id).length;
      const qb = state.customers.filter((c) => c.counterId === b.id).length;
      if (qa !== qb) return qa - qb;
      return compareStrings(a.id, b.id);
    })[0];
  },

  /** True when a cashier is on duty at [counterZoneId] (arrived, not walking). */
  cashierCovering(ctx: StepContext, counterZoneId: string): boolean {
    return ctx.state.workers.some((w) => {
      const role = ctx.content.workersById.get(w.roleId)?.role;
      return role === "cashier" &&
        !w.busyWalking &&
        w.phase === "WORK" &&
        w.taskZoneId === counterZoneId;
    });
  },

  /**
   * Base spawn weight scaled by day-part (Phase 11), reputation kind bias (Phase 13),
   * and harbor specialization kind multipliers (Phase 22).
   */
  effectiveSpawnWeight(
    content: ContentPack,
    state: GameState,
    harbor: HarborDef,
    type: { kind: string; spawnWeight: number; dayPartSpawnMultPermille?: Record<string, number> },
  ): number {
    const part = FishingSystem.dayPartAt(content, state.tick);
    const dayMult = type.dayPartSpawnMultPermille?.[part.id] ?? 1000;
    const repMult = ReputationSystem.kindSpawnMultPermille(content, state, type.kind);
    const harborMult = harbor.specialization?.kindSpawnMultPermille?.[type.kind] ?? 1000;
    let weight = type.spawnWeight;
    weight = idiv(weight * dayMult, 1000);
    weight = idiv(weight * repMult, 1000);
    weight = idiv(weight * harborMult, 1000);
    return Math.max(1, weight);
  },

  /** Soft rush price tip while a rush window is active (Phase 12). */
  rushPriceMultPermille(harbor: HarborDef, tick: number): number {
    return CustomerSystem.activeRush(harbor, tick)?.priceMultPermille ?? 1000;
  },

  /**
   * Soft scarcity tip from counter fill ratio vs economy.scarcityPriceCurvePermille.
   * Empty shelves land in band 0; a full counter lands in the last band.
   */
  scarcityPriceMultPermille(content: ContentPack, def: CounterDef, counter: CounterState): number {
    const curve = content.economy.scarcityPriceCurvePermille;
    if (curve.length === 0 || def.capacityUnits <= 0) return 1000;
    const used = Math.min(Math.max(0, counter.stock.usedUnits()), def.capacityUnits);
    const band = Math.min(curve.length - 1, idiv(used * curve.length, def.capacityUnits));
    return curve[band]!;
  },

  /** Soft harbor-rating tip from prestige.ratingPriceMultPermille (Phase 12). */
  ratingPriceMultPermille(content: ContentPack, state: GameState): number {
    const table = content.prestige.ratingPriceMultPermille;
    if (table.length === 0) return 1000;
    const stars = Math.min(table.length - 1, Math.max(0, PrestigeSystem.harborRating(content, state)));
    return table[stars]!;
  },

  /** Combined ephemeral demand multiplier (rush × scarcity × rating), excluding permanent prestige. */
  demandPriceMultPermille(
    content: ContentPack,
    state: GameState,
    harbor: HarborDef,
    def: CounterDef,
    counter: CounterState,
  ): number {
    let mult = 1000;
    mult = idiv(mult * CustomerSystem.rushPriceMultPermille(harbor, state.tick), 1000);
    mult = idiv(mult * CustomerSystem.scarcityPriceMultPermille(content, def, counter), 1000);
    mult = idiv(mult * CustomerSystem.ratingPriceMultPermille(content, state), 1000);
    return Math.max(1, mult);
  },

  activeRush(harbor: HarborDef, tick: number): RushWindowDef | null {
    if (!harbor.rushes?.length || tick <= 0) return null;
    for (const r of harbor.rushes) {
      const phase = tick % r.periodTicks;
      if (phase >= r.startTick && phase < r.startTick + r.durationTicks) return r;
    }
    return null;
  },

  spawnIntervalTicks(harbor: HarborDef, tick: number): number {
    const rush = CustomerSystem.activeRush(harbor, tick);
    if (!rush) return harbor.customerSpawnTicks;
    return Math.max(1, idiv(harbor.customerSpawnTicks * 1000, rush.spawnSpeedPermille));
  },

  effectiveMaxQueue(def: { maxQueue: number }, rush: RushWindowDef | null): number {
    return def.maxQueue + (rush?.queueBonus ?? 0);
  },

  ticksRemaining(rush: RushWindowDef, tick: number): number {
    const phase = tick % rush.periodTicks;
    return Math.max(0, rush.startTick + rush.durationTicks - phase);
  },

  announceRushTransitions(ctx: StepContext): void {
    const s = ctx.state;
    const cur = CustomerSystem.activeRush(ctx.harbor, s.tick);
    const prev = s.tick <= 1 ? null : CustomerSystem.activeRush(ctx.harbor, s.tick - 1);
    if (prev?.id === cur?.id) return;
    if (prev) ctx.emit({ type: "rush_ended", tick: s.tick, rushId: prev.id, name: prev.name });
    if (cur) ctx.emit({ type: "rush_started", tick: s.tick, rushId: cur.id, name: cur.name });
  },
};

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

// ---------------------------------------------------------------- progression/Progression.kt

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
    if (!PlotSystem.standingOnUpgradePlot(ctx.harbor, s, upgradeId)) {
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

/**
 * Phase 24 content-driven seasonal overlays. Windows repeat on the sim clock
 * (no live server). Active events boost catch weights, unlock banner cosmetics,
 * and gate event-only contract templates.
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

  scaledWeight(base: number, content: ContentPack, tick: number, speciesId: string): number {
    const mult = SeasonalEventSystem.speciesWeightMultPermille(content, tick, speciesId);
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

// ---------------------------------------------------------------- contracts/Contracts.kt

/**
 * Timed delivery contracts (Phase 17).
 *
 * Board posts weighted offers after contracts.requires are met; accepting moves
 * an offer into active work. Deliver from the player bag; miss the deadline and pay
 * a penalty (capped by current coins).
 */
export const ContractSystem = {
  streakStatKey(templateId: string): string {
    return `stat.contract_standing_streak.${templateId}`;
  },
  cooldownStatKey(templateId: string): string {
    return `stat.contract_standing_cd.${templateId}`;
  },
  standingStreak(state: GameState, templateId: string): number {
    return Math.max(0, state.stat(ContractSystem.streakStatKey(templateId)));
  },
  standingCooldownUntil(state: GameState, templateId: string): number {
    return state.stat(ContractSystem.cooldownStatKey(templateId));
  },
  scaleAmount(base: number, escalatePermille: number, streak: number, maxStreak: number): number {
    const steps = Math.min(Math.max(0, streak), Math.max(0, maxStreak));
    let value = base;
    for (let i = 0; i < steps; i++) value = idiv(value * escalatePermille, 1000);
    return value;
  },
  isStanding(t: { kind?: string } | undefined | null): boolean {
    return t?.kind === "standing";
  },

  step(ctx: StepContext): void {
    expireDeadlines(ctx);
    maybeRefreshBoard(ctx);
  },

  boardUnlocked(content: ContentPack, s: GameState): boolean {
    return content.contracts.requires.every((it) => s.ownedUpgrades.has(it) || s.completedQuests.has(it));
  },

  missingBoardRequirement(content: ContentPack, s: GameState): string | null {
    const missing = content.contracts.requires.find((it) => !s.ownedUpgrades.has(it) && !s.completedQuests.has(it));
    if (missing === undefined) return null;
    return content.upgradesById.get(missing)?.name ?? content.questsById.get(missing)?.name ?? missing;
  },

  accept(ctx: StepContext, offerId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({ type: "contract_accepted", tick: s.tick, contractId: existing.reference, offerId, receipt: existing, replayed: true });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "contract_rejected", tick: s.tick, referenceId: offerId, requestId, reason });
    };
    if (!ContractSystem.boardUnlocked(ctx.content, s)) {
      reject(`Requires: ${ContractSystem.missingBoardRequirement(ctx.content, s)}`);
      return;
    }
    const offer = s.contractOffers.find((it) => it.id === offerId);
    if (!offer) {
      reject("Offer no longer available");
      return;
    }
    if (s.activeContracts.length >= ctx.content.contracts.maxActive) {
      reject(`Max ${ctx.content.contracts.maxActive} active contracts`);
      return;
    }
    if (s.activeContracts.some((c) => c.templateId === offer.templateId)) {
      reject("Already running that standing order");
      return;
    }
    for (let i = s.contractOffers.length - 1; i >= 0; i--) {
      if (s.contractOffers[i]!.id === offerId) s.contractOffers.splice(i, 1);
    }
    const contract = new ContractState(
      s.newId("job"),
      offer.templateId,
      offer.itemId,
      offer.quantity,
      0,
      s.tick + offer.durationTicks,
      offer.payout,
      offer.penalty,
    );
    s.activeContracts.push(contract);
    const receipt: Receipt = { id: s.newId("contract"), type: "contract_accept", coinDelta: 0, tick: s.tick, reference: contract.id };
    s.record(receipt);
    s.purchaseReceipts.set(requestId, receipt);
    ctx.emit({ type: "contract_accepted", tick: s.tick, contractId: contract.id, offerId, receipt, replayed: false });
    ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
  },

  deliver(ctx: StepContext, contractId: string, requestId: string): void {
    const s = ctx.state;
    const existing = s.purchaseReceipts.get(requestId);
    if (existing) {
      ctx.emit({
        type: "contract_delivered", tick: s.tick, contractId, count: 0,
        completed: existing.type === "contract_payout", receipt: existing, replayed: true,
      });
      return;
    }
    const reject = (reason: string) => {
      ctx.emit({ type: "contract_rejected", tick: s.tick, referenceId: contractId, requestId, reason });
    };
    const idx = s.activeContracts.findIndex((it) => it.id === contractId);
    if (idx < 0) {
      reject("Unknown contract");
      return;
    }
    const c = s.activeContracts[idx]!;
    const need = c.quantity - c.delivered;
    if (need <= 0) {
      reject("Already complete");
      return;
    }
    const have = s.player.bag.available(c.itemId);
    if (have <= 0) {
      reject(`Need ${ctx.content.itemName(c.itemId)} in your bag`);
      return;
    }
    const take = Math.min(need, have);
    s.player.bag.remove(c.itemId, take);
    c.delivered += take;
    s.bumpStat(Stats.CONTRACT_ITEMS_DELIVERED, take);
    if (c.delivered >= c.quantity) {
      const payout = c.payout;
      s.coins = SafeMath.creditCoins(s.coins, payout);
      s.bumpStat(Stats.CONTRACTS_COMPLETED);
      s.bumpStat(Stats.CONTRACT_REVENUE, payout);
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_payout", coinDelta: payout, tick: s.tick, reference: c.id };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "contract_delivered", tick: s.tick, contractId: c.id, count: take, completed: true, receipt, replayed: false });
      ctx.emit({ type: "contract_completed", tick: s.tick, contractId: c.id, templateId: c.templateId, payout });
      const template = ctx.content.contractTemplatesById.get(c.templateId);
      if (ContractSystem.isStanding(template)) {
        refreshStandingJob(s, c, template!);
      } else {
        s.activeContracts.splice(idx, 1);
      }
      ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
    } else {
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_deliver", coinDelta: 0, tick: s.tick, reference: `${contractId}:${take}` };
      s.record(receipt);
      s.purchaseReceipts.set(requestId, receipt);
      ctx.emit({ type: "contract_delivered", tick: s.tick, contractId: c.id, count: take, completed: false, receipt, replayed: false });
    }
  },
};

function refreshStandingJob(s: GameState, c: ContractState, template: ContractTemplateDef): void {
  const nextStreak = ContractSystem.standingStreak(s, template.id) + 1;
  s.stats.set(ContractSystem.streakStatKey(template.id), nextStreak);
  c.delivered = 0;
  c.deadlineTick = s.tick + template.durationTicks;
  c.payout = ContractSystem.scaleAmount(
    template.payout, template.payoutEscalatePermille ?? 1000, nextStreak, template.maxStreak ?? 1,
  );
  c.penalty = ContractSystem.scaleAmount(
    template.penalty, template.penaltyEscalatePermille ?? 1000, nextStreak, template.maxStreak ?? 1,
  );
}

function expireDeadlines(ctx: StepContext): void {
  const s = ctx.state;
  const expired = s.activeContracts.filter((c) => s.tick >= c.deadlineTick);
  if (expired.length === 0) return;
  const drop = new Set(expired);
  for (let i = s.activeContracts.length - 1; i >= 0; i--) {
    if (drop.has(s.activeContracts[i]!)) s.activeContracts.splice(i, 1);
  }
  for (const c of expired) {
    const paid = Math.min(c.penalty, s.coins);
    if (paid > 0) {
      s.coins -= paid;
      const receipt: Receipt = { id: s.newId("contract"), type: "contract_penalty", coinDelta: -paid, tick: s.tick, reference: c.id };
      s.record(receipt);
    }
    s.bumpStat(Stats.CONTRACTS_FAILED);
    const template = ctx.content.contractTemplatesById.get(c.templateId);
    if (ContractSystem.isStanding(template)) {
      s.stats.set(ContractSystem.streakStatKey(c.templateId), 0);
      s.stats.set(ContractSystem.cooldownStatKey(c.templateId), s.tick + (template!.failCooldownTicks ?? 1));
    }
    ctx.emit({ type: "contract_failed", tick: s.tick, contractId: c.id, templateId: c.templateId, penaltyPaid: paid });
  }
  ctx.emit({ type: "checkpoint_requested", tick: s.tick, reason: "contract" });
}

function maybeRefreshBoard(ctx: StepContext): void {
  const s = ctx.state;
  if (!ContractSystem.boardUnlocked(ctx.content, s)) {
    s.contractOffers.length = 0;
    s.contractBoardRefreshAt = 0;
    return;
  }
  if (s.contractBoardRefreshAt === 0) {
    refreshOffers(ctx);
    return;
  }
  if (s.tick < s.contractBoardRefreshAt) return;
  refreshOffers(ctx);
}

function refreshOffers(ctx: StepContext): void {
  const s = ctx.state;
  const def = ctx.content.contracts;
  s.contractOffers.length = 0;
  const activeTemplates = new Set(s.activeContracts.map((c) => c.templateId));
  const pool = def.templates.filter((t) => !activeTemplates.has(t.id) && templateEligibleForBoard(ctx.content, s, t));
  const slots = Math.min(def.boardSlots, pool.length);
  for (let n = 0; n < slots; n++) {
    if (pool.length === 0) continue;
    const idx = s.rng.pickWeighted(pool.map((t) => t.weight));
    const t = pool.splice(idx, 1)[0]!;
    s.contractOffers.push(offerFrom(s, t));
  }
  s.contractBoardRefreshAt = s.tick + def.refreshPeriodTicks;
  ctx.emit({ type: "contract_board_refreshed", tick: s.tick, offerIds: s.contractOffers.map((o) => o.id) });
}

function templateEligibleForBoard(content: ContentPack, s: GameState, t: ContractTemplateDef): boolean {
  if (t.requiresSeasonalEvent) {
    const active = SeasonalEventSystem.active(content, s.tick);
    if (active?.id !== t.requiresSeasonalEvent) return false;
  }
  if (!ContractSystem.isStanding(t)) return true;
  return s.tick >= ContractSystem.standingCooldownUntil(s, t.id);
}

function offerFrom(s: GameState, t: ContractTemplateDef): ContractOffer {
  const streak = ContractSystem.isStanding(t) ? ContractSystem.standingStreak(s, t.id) : 0;
  return {
    id: s.newId("offer"),
    templateId: t.id,
    itemId: t.item,
    quantity: t.quantity,
    durationTicks: t.durationTicks,
    payout: ContractSystem.scaleAmount(t.payout, t.payoutEscalatePermille ?? 1000, streak, t.maxStreak ?? 1),
    penalty: ContractSystem.scaleAmount(t.penalty, t.penaltyEscalatePermille ?? 1000, streak, t.maxStreak ?? 1),
  };
}

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

  step(ctx: StepContext): void {
    BankSystem.checkCoinGoal(ctx);
    BankSystem.collectOverdue(ctx);
  },

  takeLoan(ctx: StepContext, requestId: string): void {
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
    const principal = ctx.content.bank.loanPrincipal;
    const owed = BankSystem.repayAmount(ctx.content);
    s.coins = SafeMath.add(s.coins, principal);
    s.loanOwed = owed;
    s.loanDueTick = s.tick + ctx.content.bank.termTicks;
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
      grantsCosmetic: "banner.iap_sunset_bunting",
      title: "Sunset bunting",
      description: "Warm dusk bunting for the pier. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.pearl_string",
      sku: "fish.cosmetic.pearl_string",
      grantsCosmetic: "banner.iap_pearl_string",
      title: "Pearl string lights",
      description: "Pearl-white string lights. Visual only — never changes rates, wages, or sale prices.",
    },
    {
      id: "entitlement.cosmetic.captain_crest",
      sku: "fish.cosmetic.captain_crest",
      grantsCosmetic: "banner.iap_captain_crest",
      title: "Captain's crest",
      description: "A harbor crest plaque. Visual only — never changes rates, wages, or sale prices.",
    },
  ] as const,

  BY_SKU: new Map<string, {
    id: string; sku: string; grantsCosmetic: string; title: string; description: string;
  }>(),
  BY_COSMETIC: new Map<string, {
    id: string; sku: string; grantsCosmetic: string; title: string; description: string;
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

// ---------------------------------------------------------------- workers/Workers.kt

export type WorkerHireAvailability =
  | { kind: "purchasable" }
  | { kind: "maxed" }
  | { kind: "too_expensive"; missing: number }
  | { kind: "locked"; reason: string };

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

  moveSpeed(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelMult = 1000 + prog.moveSpeedPermillePerLevel * Math.max(w.level - 1, 0);
    const [traitMove] = traitBonus(content, w);
    const [gearMove] = WorkerSystem.gearBonuses(content, w);
    let speed = def.moveSpeedMmPerTick;
    speed = Math.trunc((speed * gearMove) / 1000);
    speed = Math.trunc((speed * levelMult) / 1000);
    speed = Math.trunc((speed * traitMove) / 1000);
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
    return Math.max(1, speed);
  },

  carryCapacity(content: ContentPack, s: GameState, def: WorkerDef, w: WorkerState): number {
    const prog = content.staffProgression;
    const levelBonus = prog.carryBonusEveryLevels <= 0
      ? 0
      : Math.trunc(Math.max(w.level - 1, 0) / prog.carryBonusEveryLevels);
    const [, , traitCarry] = traitBonus(content, w);
    const [, , gearCarry] = WorkerSystem.gearBonuses(content, w);
    return Math.max(def.carryCapacityUnits, gearCarry) + levelBonus + traitCarry;
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
  const standardN = Math.min(n, free);
  const overtimeN = Math.max(0, n - free);
  const standard = rate * standardN;
  const overtime = Math.trunc(
    (rate * overtimeN * ctx.content.staffProgression.shifts.overtimeWagePermille) / 1000,
  );
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
    const pick = candidates[ctx.state.rng.pickWeighted(
      candidates.map((c) => SeasonalEventSystem.scaledWeight(c.rarityWeight, ctx.content, ctx.state.tick, c.id)),
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
  let best: CounterDef | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const cdef of [...ctx.harbor.counters].sort((a, b) => compareStrings(a.id, b.id))) {
    if (!CustomerSystem.isUnlocked(cdef, ctx.state)) continue;
    const counter = ctx.state.counters.find((c) => c.counterId === cdef.id)!;
    const zone = zonePoint(ctx.harbor, cdef.zone);
    const waiting = ctx.state.customers.filter((c) => c.counterId === cdef.id && c.arrived).length;
    const urgency = waiting * 25 + (counter.stock.usedUnits() === 0 ? 0 : 10);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const distance = Math.max(0, 200 - distTicks);
    const demand = waiting * 20 + (counter.stock.usedUnits() === 0 ? 40 : 0);
    let score = scorePost(ctx, urgency, distance, demand);
    if (covered.has(cdef.zone)) score -= 10_000;
    if (!best || score > bestScore || (score === bestScore && compareStrings(cdef.id, best.id) < 0)) {
      best = cdef;
      bestScore = score;
    }
  }
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
      break;
    default:
      clearTask(w);
      break;
  }
}

function assignSupervisor(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  const cdef = bestCashierPost(ctx, w);
  if (!cdef) return;
  const zone = zonePoint(ctx.harbor, cdef.zone);
  startWalk(w, zone.x, zone.z, WorkerSystem.moveSpeed(ctx.content, ctx.state, def, w));
  w.phase = "WALK_TO_WORK";
  w.taskZoneId = cdef.zone;
  w.taskId = ctx.state.newId("task");
}

function stepIceRunner(ctx: StepContext, w: WorkerState, def: WorkerDef): void {
  switch (w.phase) {
    case "NONE": assignIceRunner(ctx, w, def); break;
    case "WALK_TO_WORK": w.phase = "PICKUP"; break;
    case "PICKUP": pickupHaul(ctx, w, def); break;
    case "WALK_TO_DROP": w.phase = "DROP"; break;
    case "DROP": dropHaul(ctx, w, def); break;
    default: clearTask(w); break;
  }
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
  if (!w.bag.isEmpty()) {
    const dest = findSmokerInputDrop(ctx, w) ?? findMachineInputForBag(ctx, w);
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
        const score = scoreHaul(ctx, w, m.output, zone.x, zone.z, m.status === "OUTPUT_FULL" ? 50 : 0, demand);
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
        const score = scoreHaul(ctx, w, src.output, zone.x, zone.z, src.status === "OUTPUT_FULL" ? 50 : 0, demand);
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
  let best: (typeof ctx.state.fishingSpots)[number] | null = null;
  let bestScore = -1;
  let bestZone = "";
  for (const spot of ctx.state.fishingSpots) {
    const def = ctx.harbor.fishingSpots.find((f) => f.zone === spot.zoneId)!;
    if (!FishingSystem.isUnlocked(def, ctx.state) || spot.stock <= 0) continue;
    if (!def.species.some((id) => w.bag.roomFor(id) >= 1)) continue;
    const zone = zonePoint(ctx.harbor, spot.zoneId);
    const distTicks = WorkerSystem.walkTicks(w.x, w.z, zone.x, zone.z, 160);
    const demand = def.species.filter((id) => w.bag.roomFor(id) >= 1 && machineHungryFor(ctx, id)).length;
    const score = spot.stock * 10 + demand * 40 + Math.max(0, 200 - distTicks);
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
