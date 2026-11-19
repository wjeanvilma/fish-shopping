/**
 * Extracted Finish 4.0 Phase 2 — fishing / bait / trophies.
 */
import type { BaitDef, ContentPack, DayPartDef, FishingSpotDef, SpeciesDef } from "../content";
import { idiv, SafeMath } from "../foundations";
import type { TimingTier, TrophyRecord } from "../state";
import { GameState, PlayerState, Receipt, Stats } from "../state";
import { StepContext } from "./context";
import { systemsBridge } from "./bridge";
import { CastPhases, type CastPhase } from "./castPhases";

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
        systemsBridge.seasonalScaledWeight(
          BaitSystem.effectiveWeight(sp, bait),
          ctx.content,
          s.tick,
          sp.id,
          s.harborId,
        ),
      );
      const pick = candidates[s.rng.pickWeighted(weights)]!;
      p.fishingSpecies = pick.id;
      p.fishingProgress = 0;
      p.fishingCatchTicks = FishingSystem.catchTicksFor(
        FishingSystem.effectiveCatchSpeed(ctx.content, s, pick.id), pick.catchTicks,
      );
      p.reelAttemptedThisCast = false;
      p.lastCastPhase = "waiting";
      ctx.emit({
        type: "cast_phase_changed",
        tick: s.tick,
        phase: "waiting",
        speciesId: pick.id,
        zoneId: zone.id,
      });
      s.bumpStat(Stats.CAST_PHASE_TRANSITIONS);
    }

    const species = ctx.content.speciesById.get(p.fishingSpecies)!;
    const duration = p.fishingCatchTicks > 0
      ? p.fishingCatchTicks
      : FishingSystem.catchTicksFor(FishingSystem.effectiveCatchSpeed(ctx.content, s, species.id), species.catchTicks);
    p.fishingCatchTicks = duration;

    let reelTier: TimingTier = "miss";
    let reelPhase: CastPhase = CastPhases.phaseAt(p.fishingProgress, duration, ctx.content, s);
    if (p.reelRequested) {
      p.reelRequested = false;
      if (!p.reelAttemptedThisCast) {
        p.reelAttemptedThisCast = true;
        reelPhase = CastPhases.phaseAt(p.fishingProgress, duration, ctx.content, s);
        reelTier = FishingSystem.timingTierAtContent(ctx.content, s, p.fishingProgress, duration);
        if (reelPhase === "strike" && reelTier !== "miss") {
          s.bumpStat(Stats.CAST_STRIKE_REELS);
          ctx.emit({
            type: "cast_strike_reel",
            tick: s.tick,
            speciesId: species.id,
            zoneId: zone.id,
            timingTier: reelTier,
          });
        }
        if (reelTier !== "miss") {
          p.fishingProgress = duration;
        }
      }
    }

    if (reelTier === "miss") p.fishingProgress++;
    const nextPhase = CastPhases.phaseAt(p.fishingProgress, duration, ctx.content, s);
    if (p.lastCastPhase !== nextPhase) {
      p.lastCastPhase = nextPhase;
      s.bumpStat(Stats.CAST_PHASE_TRANSITIONS);
      ctx.emit({
        type: "cast_phase_changed",
        tick: s.tick,
        phase: nextPhase,
        speciesId: species.id,
        zoneId: zone.id,
      });
    }
    if (p.fishingProgress < duration) return;

    FishingSystem.commitCatch(ctx, zone.id, spot.zoneId, species.id, reelTier, reelPhase);
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

  /**
   * Player upgrades, prestige floors, (with tide chart) day-part catch bonuses,
   * Finish 2.0 Phase 13 weather + tide, and Phase 14 mastery / technique multipliers.
   */
  effectiveCatchSpeed(content: ContentPack, state: GameState, speciesId: string | null = null): number {
    let speed = Math.max(
      state.player.catchSpeedPermille,
      state.prestigeCatchSpeedPermille,
      state.endgameCatchSpeedPermille,
    );
    if (FishingSystem.hasTideChart(state)) {
      const part = FishingSystem.dayPartAt(content, state.tick);
      speed = idiv(speed * part.catchSpeedMultPermille, 1000);
    }
    const weatherTide = systemsBridge.weatherCatchSpeedMultPermille(content, state);
    speed = idiv(speed * weatherTide, 1000);
    const mastery = systemsBridge.masteryCatchSpeedMultPermille(content, state, speciesId);
    return Math.max(1, idiv(speed * mastery, 1000));
  },

  catchTicksFor(catchSpeedPermille: number, baseCatchTicks: number): number {
    return Math.max(1, idiv(baseCatchTicks * 1000, catchSpeedPermille));
  },

  inTimingWindow(progress: number, duration: number, startPermille: number, endPermille: number): boolean {
    if (duration <= 0) return false;
    const permille = idiv(progress * 1000, duration);
    return permille >= startPermille && permille < endPermille;
  },

  timingTierAtContent(content: ContentPack, state: GameState, progress: number, duration: number): TimingTier {
    if (duration <= 0) return "miss";
    const windows = systemsBridge.masteryTimingWindows(content, state);
    if (FishingSystem.inTimingWindow(progress, duration, windows.perfectStart, windows.perfectEnd)) {
      return "perfect";
    }
    if (FishingSystem.inTimingWindow(progress, duration, windows.goodStart, windows.goodEnd)) {
      return "good";
    }
    return "miss";
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
    const weatherTide = systemsBridge.weatherRegenMultPermille(content, state);
    const combined = Math.max(1, idiv(dayMult * weatherTide, 1000));
    return FishingSystem.regenTicksFor(def, stock, state.player.fishRegenPermille, combined);
  },

  commitCatch(
    ctx: StepContext,
    zoneId: string,
    spotZoneId: string,
    rolledSpeciesId: string,
    timingTier: TimingTier,
    castPhase: CastPhase = "fight",
  ): void {
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
      const weatherBonus = systemsBridge.weatherRareChanceBonusPermille(ctx.content, s.tick);
      const masteryBonus = systemsBridge.masteryRareChanceBonusPermille(ctx.content, s, rolledSpeciesId);
      const chance = BaitSystem.rareChancePermille(
        ru.chancePermille, bait, harborBonus + weatherBonus + masteryBonus,
      );
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
      const bonusMult = systemsBridge.masteryTimingBonusPermille(ctx.content, s, timingTier);
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
      systemsBridge.masteryGrantCatchXp(
        ctx,
        finalSpecies.id,
        timingTier,
        rare,
        CastPhases.strikeXpMultPermille(castPhase, timingTier),
      );
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
    p.lastCastPhase = null;
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

