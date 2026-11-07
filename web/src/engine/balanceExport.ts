/**
 * Data-driven balance knob dump (Phase 27). Mirrors game-core BalanceExport.kt —
 * retuning is content-pack.json only; this never invents knobs in code.
 */
import type { ContentPack, UpgradeEffect } from "./content";

export const BALANCE_SCHEMA = "fish.balance.v2";

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
    case "unlock_counter": return { kind: e.kind, pad: e.pad };
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
    /** Formulas for fish.telemetry.v2 derived rates (runtime; not content knobs). */
    derivedRateFormulas: {
      abandonPermille: "lost_customers * 1000 / (sales + lost_customers)",
      wageRatioPermille: "wages_paid * 1000 / revenue",
      speciesCatchSharePermille: "speciesCatches[id] * 1000 / fish_caught",
    },
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
      wear: {
        checkPeriodTicks: e.wear.checkPeriodTicks,
        chancePermille: e.wear.chancePermille,
        breakChancePermille: e.wear.breakChancePermille,
        slowDurationTicks: e.wear.slowDurationTicks,
        slowProcessMultPermille: e.wear.slowProcessMultPermille,
        repairCoins: e.wear.repairCoins,
      },
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
    automationAlerts: {
      machineIdleTicksDuringRush: raw.automationAlerts.machineIdleTicksDuringRush,
      alertCooldownTicks: raw.automationAlerts.alertCooldownTicks,
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
    decor: {
      items: raw.decor.items.map((d) => ({
        id: d.id,
        name: d.name,
        cost: d.cost,
        patienceBonusTicks: d.patienceBonusTicks,
        requiresCosmetic: d.requiresCosmetic ?? null,
      })),
    },
    seasonalEvents: {
      events: raw.seasonalEvents.events.map((e) => ({
        id: e.id,
        name: e.name,
        periodTicks: e.periodTicks,
        startTick: e.startTick,
        durationTicks: e.durationTicks,
        banner: e.banner ?? null,
        speciesWeightMultPermille: { ...(e.speciesWeightMultPermille ?? {}) },
      })),
    },
    bank: {
      loanPrincipal: raw.bank.loanPrincipal,
      repayPermille: raw.bank.repayPermille,
      repayAmount: Math.trunc((raw.bank.loanPrincipal * raw.bank.repayPermille) / 1000),
      termTicks: raw.bank.termTicks,
      collectionPeriodTicks: raw.bank.collectionPeriodTicks,
      goalPresets: [...raw.bank.goalPresets],
      requires: [...raw.bank.requires],
    },
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
      specialization: h.specialization
        ? {
          id: h.specialization.id,
          name: h.specialization.name,
          maintenanceDiscountPerStation: h.specialization.maintenanceDiscountPerStation ?? 0,
          rareChanceBonusPermille: h.specialization.rareChanceBonusPermille ?? 0,
          kindSpawnMultPermille: { ...(h.specialization.kindSpawnMultPermille ?? {}) },
        }
        : null,
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
    staffProgression: (() => {
      const sp = raw.staffProgression;
      return {
        maxLevel: sp.maxLevel,
        xpThresholds: [...sp.xpThresholds],
        moveSpeedPermillePerLevel: sp.moveSpeedPermillePerLevel,
        catchSpeedPermillePerLevel: sp.catchSpeedPermillePerLevel,
        carryBonusEveryLevels: sp.carryBonusEveryLevels,
        xpFishCaught: sp.xpFishCaught,
        xpItemMoved: sp.xpItemMoved,
        xpSaleAssisted: sp.xpSaleAssisted,
        traitsOnHire: sp.traitsOnHire,
        shifts: {
          baseOnShiftSlots: sp.shifts.baseOnShiftSlots,
          overtimeWagePermille: sp.shifts.overtimeWagePermille,
          supervisorExtraSlots: sp.shifts.supervisorExtraSlots,
        },
        roleBuffs: {
          greeterPatienceDrainMultPermille: sp.roleBuffs.greeterPatienceDrainMultPermille,
          smokerSpecialistProcessSpeedPermille: sp.roleBuffs.smokerSpecialistProcessSpeedPermille,
          iceRunnerFragileSpoilTierMin: sp.roleBuffs.iceRunnerFragileSpoilTierMin,
          iceRunnerSpoilScoreBonus: sp.roleBuffs.iceRunnerSpoilScoreBonus,
        },
        loadouts: {
          slots: sp.loadouts.slots.map((slot) => ({
            id: slot.id,
            name: slot.name,
            upgradeIds: [...slot.upgradeIds],
          })),
        },
        traits: sp.traits.map((t) => ({
          id: t.id,
          name: t.name,
          weight: t.weight,
          moveSpeedPermille: t.moveSpeedPermille ?? 1000,
          catchSpeedPermille: t.catchSpeedPermille ?? 1000,
          carryBonus: t.carryBonus ?? 0,
          transferIntervalMultPermille: t.transferIntervalMultPermille ?? 1000,
        })),
      };
    })(),
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
    achievements: {
      entries: raw.achievements.entries.map((a) => ({
        id: a.id,
        category: a.category,
        goalStat: a.goal.stat,
        goalAtLeast: a.goal.atLeast,
        rewardCoins: a.rewardCoins,
      })),
    },
    codex: {
      families: raw.codex.families,
      entries: raw.codex.entries.map((e) => ({
        speciesId: e.speciesId,
        family: e.family,
      })),
    },
    weather: {
      patterns: raw.weather.patterns.map((p) => ({
        id: p.id,
        durationTicks: p.durationTicks,
        catchSpeedMultPermille: p.catchSpeedMultPermille,
        customerSpawnMultPermille: p.customerSpawnMultPermille,
      })),
      tide: {
        periodTicks: raw.weather.tide.periodTicks,
        phases: raw.weather.tide.phases.map((p) => ({
          id: p.id,
          endPermille: p.endPermille,
          catchSpeedMultPermille: p.catchSpeedMultPermille,
          customerSpawnMultPermille: p.customerSpawnMultPermille,
        })),
      },
    },
    fishingMastery: {
      maxLevel: raw.fishingMastery.maxLevel,
      xpThresholds: raw.fishingMastery.xpThresholds,
      xpCatch: raw.fishingMastery.xpCatch,
      xpGoodReel: raw.fishingMastery.xpGoodReel,
      xpPerfectReel: raw.fishingMastery.xpPerfectReel,
      xpRareCatch: raw.fishingMastery.xpRareCatch,
      catchSpeedPermillePerLevel: raw.fishingMastery.catchSpeedPermillePerLevel,
      rareChanceBonusPermillePerLevel: raw.fishingMastery.rareChanceBonusPermillePerLevel,
      techniques: raw.fishingMastery.techniques.map((t) => ({
        id: t.id,
        requiresMasteryLevel: t.requiresMasteryLevel,
        catchSpeedMultPermille: t.catchSpeedMultPermille,
        perfectBonusPermille: t.perfectBonusPermille,
        rareChanceBonusPermille: t.rareChanceBonusPermille,
      })),
      coachingTipCount: raw.fishingMastery.coachingTips.length,
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
