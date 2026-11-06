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
      })),
    },
    prestige: {
      ratingThresholds: raw.prestige.ratingThresholds,
      milestones: raw.prestige.milestones.map((m) => ({
        id: m.id,
        goalStat: m.goal.stat,
        goalAtLeast: m.goal.atLeast,
        rewardCoins: m.reward.coins,
        rewardCatchSpeedPermille: m.reward.catchSpeedPermille,
        rewardPriceBonusPermille: m.reward.priceBonusPermille,
      })),
    },
  };
}

export function encodeBalanceExport(content: ContentPack): string {
  return JSON.stringify(buildBalanceExport(content));
}
