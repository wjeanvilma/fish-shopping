/**
 * Data-driven balance knob dump (Phase 27). Mirrors game-core BalanceExport.kt —
 * retuning is content-pack.json only; this never invents knobs in code.
 */
import type { ContentPack, UpgradeEffect } from "./content";

export const BALANCE_SCHEMA = "fish.balance.v1";

function effectJson(e: UpgradeEffect): Record<string, unknown> {
  switch (e.kind) {
    case "carry_capacity": return { kind: e.kind, capacityUnits: e.capacityUnits };
    case "recipe_duration":
      return { kind: e.kind, machine: e.machine, recipe: e.recipe, durationTicks: e.durationTicks };
    case "catch_speed": return { kind: e.kind, speedPermille: e.speedPermille };
    case "timing_window":
      return {
        kind: e.kind,
        windowStartPermille: e.windowStartPermille,
        windowEndPermille: e.windowEndPermille,
        perfectStartPermille: e.perfectStartPermille,
        perfectEndPermille: e.perfectEndPermille,
      };
    case "fish_regen": return { kind: e.kind, speedPermille: e.speedPermille };
    case "unlock_fishing_spot": return { kind: e.kind, zone: e.zone };
    case "unlock_machine": return { kind: e.kind, machine: e.machine };
    case "worker_move_speed": return { kind: e.kind, speedPermille: e.speedPermille };
    case "worker_carry": return { kind: e.kind, capacityUnits: e.capacityUnits };
    case "worker_catch_speed": return { kind: e.kind, speedPermille: e.speedPermille };
    case "worker_wage": return { kind: e.kind, coinsPerWorkerPerHour: e.coinsPerWorkerPerHour };
    case "maintenance_discount": return { kind: e.kind, coinsOffPerStation: e.coinsOffPerStation };
    case "bag_spoil_resist": return { kind: e.kind, periodMultPermille: e.periodMultPermille };
    case "counter_spoil_resist": return { kind: e.kind, periodMultPermille: e.periodMultPermille };
    case "grant_bait": return { kind: e.kind, bait: e.bait, quantity: e.quantity };
  }
}

export function buildBalanceExport(content: ContentPack): Record<string, unknown> {
  const raw = content.raw;
  const p = raw.player;
  const e = raw.economy;
  const r = raw.routing;
  return {
    schema: BALANCE_SCHEMA,
    contentVersion: raw.contentVersion,
    ticksPerSecond: raw.ticksPerSecond,
    player: {
      startCoins: p.startCoins,
      startCarryCapacityUnits: p.startCarryCapacityUnits,
      moveSpeedMmPerTick: p.moveSpeedMmPerTick,
      transferIntervalTicks: p.transferIntervalTicks,
      startCatchSpeedPermille: p.startCatchSpeedPermille,
      startFishRegenPermille: p.startFishRegenPermille,
      timingWindowStartPermille: p.timingWindowStartPermille,
      timingWindowEndPermille: p.timingWindowEndPermille,
      timingPerfectStartPermille: p.timingPerfectStartPermille,
      timingPerfectEndPermille: p.timingPerfectEndPermille,
      timingGoodBonusPermille: p.timingGoodBonusPermille,
      timingPerfectBonusPermille: p.timingPerfectBonusPermille,
    },
    offline: {
      capHours: raw.offline.capHours,
      summaryMinSeconds: raw.offline.summaryMinSeconds,
    },
    economy: {
      requires: e.requires,
      maintenancePeriodTicks: e.maintenancePeriodTicks,
      maintenanceCoinsPerStation: e.maintenanceCoinsPerStation,
      counterSpoilPeriodTicks: e.counterSpoilPeriodTicks,
      counterSpoilUnits: e.counterSpoilUnits,
      bagFishSpoilPeriodTicks: e.bagFishSpoilPeriodTicks,
      bagFishSpoilUnits: e.bagFishSpoilUnits,
      scarcityPriceCurvePermille: e.scarcityPriceCurvePermille,
    },
    ecology: {
      dayLengthTicks: raw.ecology.dayLengthTicks,
      parts: raw.ecology.parts.map((part) => ({
        id: part.id,
        name: part.name,
        endPermille: part.endPermille,
        regenMultPermille: part.regenMultPermille,
        catchSpeedMultPermille: part.catchSpeedMultPermille,
      })),
    },
    routing: {
      urgencyWeight: r.urgencyWeight,
      distanceWeight: r.distanceWeight,
      demandWeight: r.demandWeight,
      supervisorDemandBoostPermille: r.supervisorDemandBoostPermille,
    },
    species: raw.species.map((s) => ({
      id: s.id,
      catchTicks: s.catchTicks,
      baseValue: s.baseValue,
      rarityWeight: s.rarityWeight,
      carryUnits: s.carryUnits,
      spoilTier: s.spoilTier ?? 2,
      rareUpgrade: s.rareUpgrade
        ? { to: s.rareUpgrade.to, chancePermille: s.rareUpgrade.chancePermille }
        : null,
    })),
    products: raw.products.map((pr) => ({
      id: pr.id, unitPrice: pr.unitPrice, carryUnits: pr.carryUnits, spoilTier: pr.spoilTier ?? 2,
    })),
    bait: raw.bait.map((b) => ({
      id: b.id,
      carryUnits: b.carryUnits,
      packQuantity: b.packQuantity,
      cost: b.cost,
      rareSpeciesWeightMultPermille: b.rareSpeciesWeightMultPermille,
      rareChanceBonusPermille: b.rareChanceBonusPermille,
    })),
    recipes: raw.recipes.map((rec) => ({
      id: rec.id,
      machine: rec.machine,
      durationTicks: rec.durationTicks,
      inputs: rec.inputs.map((iq) => ({ item: iq.item, quantity: iq.quantity })),
      outputs: rec.outputs.map((iq) => ({ item: iq.item, quantity: iq.quantity })),
    })),
    customers: raw.customers.map((c) => ({
      id: c.id,
      kind: c.kind,
      basketMin: c.basketMin,
      basketMax: c.basketMax,
      patienceTicks: c.patienceTicks,
      spawnWeight: c.spawnWeight,
      priceMultPermille: c.priceMultPermille,
      unmetPriceMultPermille: c.unmetPriceMultPermille,
      unmetPatienceDrainPermille: c.unmetPatienceDrainPermille,
      dayPartSpawnMultPermille: c.dayPartSpawnMultPermille ?? {},
    })),
    harborRushes: raw.harbors.flatMap((h) =>
      (h.rushes ?? []).map((ru) => ({
        harborId: h.id,
        id: ru.id,
        periodTicks: ru.periodTicks,
        startTick: ru.startTick,
        durationTicks: ru.durationTicks,
        spawnSpeedPermille: ru.spawnSpeedPermille,
        queueBonus: ru.queueBonus,
        priceMultPermille: ru.priceMultPermille ?? 1000,
      })),
    ),
    harbors: raw.harbors.map((h) => ({
      id: h.id,
      customerSpawnTicks: h.customerSpawnTicks,
      customerWalkMmPerTick: h.customerWalkMmPerTick,
      fishingSpots: h.fishingSpots.map((s) => ({
        zone: s.zone,
        stockMax: s.stockMax,
        regenTicks: s.regenTicks,
        regenCurvePermille: s.regenCurvePermille,
        dayPartRegenMultPermille: s.dayPartRegenMultPermille ?? {},
      })),
      counters: h.counters.map((c) => ({
        id: c.id,
        capacityUnits: c.capacityUnits,
        checkoutTicks: c.checkoutTicks,
        maxQueue: c.maxQueue,
      })),
    })),
    workers: raw.workers.map((w) => ({
      id: w.id,
      role: w.role,
      hireCost: w.hireCost,
      maxHired: w.maxHired,
      carryCapacityUnits: w.carryCapacityUnits,
      moveSpeedMmPerTick: w.moveSpeedMmPerTick,
      catchSpeedPermille: w.catchSpeedPermille,
      transferIntervalTicks: w.transferIntervalTicks,
      leaseTicks: w.leaseTicks,
    })),
    upgrades: raw.upgrades.map((u) => ({
      id: u.id, cost: u.cost, effect: effectJson(u.effect),
    })),
    contracts: {
      boardSlots: raw.contracts.boardSlots,
      maxActive: raw.contracts.maxActive,
      refreshPeriodTicks: raw.contracts.refreshPeriodTicks,
      templates: raw.contracts.templates.map((t) => ({
        id: t.id, item: t.item, quantity: t.quantity,
        durationTicks: t.durationTicks, payout: t.payout, penalty: t.penalty,
        kind: t.kind ?? "standard",
        payoutEscalatePermille: t.payoutEscalatePermille ?? 1000,
        penaltyEscalatePermille: t.penaltyEscalatePermille ?? 1000,
        maxStreak: t.maxStreak ?? 1,
        failCooldownTicks: t.failCooldownTicks ?? 1,
      })),
    },
    trophies: {
      sizeMinPermille: raw.trophies.sizeMinPermille,
      sizeMaxPermille: raw.trophies.sizeMaxPermille,
      sets: raw.trophies.sets.map((set) => ({
        id: set.id,
        speciesCount: set.species.length,
        completeStat: set.completeStat,
      })),
    },
    prestige: {
      ratingThresholds: raw.prestige.ratingThresholds,
      ratingPriceMultPermille: raw.prestige.ratingPriceMultPermille,
      milestones: raw.prestige.milestones.map((m) => ({
        id: m.id,
        goalStat: m.goal.stat,
        goalAtLeast: m.goal.atLeast,
        rewardCoins: m.reward.coins,
        rewardCatchSpeedPermille: m.reward.catchSpeedPermille,
        rewardPriceBonusPermille: m.reward.priceBonusPermille,
      })),
    },
    reputation: {
      minSample: raw.reputation.minSample,
      neutralScorePermille: raw.reputation.neutralScorePermille,
      scoreBandThresholdsPermille: raw.reputation.scoreBandThresholdsPermille,
      kindSpawnMultPermille: raw.reputation.kindSpawnMultPermille,
      unmetPreferencePenaltyPermille: raw.reputation.unmetPreferencePenaltyPermille,
      coachingLostRatioPermille: raw.reputation.coachingLostRatioPermille,
      coachingPraiseScorePermille: raw.reputation.coachingPraiseScorePermille,
    },
  };
}

export function encodeBalanceExport(content: ContentPack): string {
  return JSON.stringify(buildBalanceExport(content));
}
