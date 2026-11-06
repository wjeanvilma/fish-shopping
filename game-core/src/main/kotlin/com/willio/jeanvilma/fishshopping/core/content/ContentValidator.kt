package com.willio.jeanvilma.fishshopping.core.content

import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants

/**
 * Cross-reference checks that a JSON Schema cannot express: unique IDs,
 * references to existing IDs, an acyclic unlock graph, and layout sanity.
 */
object ContentValidator {

    /** Clearance radius used when validating customer approach path segments. */
    private const val CUSTOMER_PATH_RADIUS_MM = 200
    private const val CUSTOMER_PATH_SAMPLE_MM = 200

    fun validate(p: ContentPack): List<String> {
        val errors = mutableListOf<String>()
        fun check(ok: Boolean, msg: () -> String) {
            if (!ok) errors += msg()
        }

        check(p.ticksPerSecond == SimConstants.TICKS_PER_SECOND) {
            "ticksPerSecond is ${p.ticksPerSecond}; the simulation contract requires ${SimConstants.TICKS_PER_SECOND}"
        }
        check(p.player.timingWindowStartPermille < p.player.timingWindowEndPermille) {
            "player.timingWindowStartPermille must be < timingWindowEndPermille"
        }
        check(p.player.timingPerfectStartPermille < p.player.timingPerfectEndPermille) {
            "player.timingPerfectStartPermille must be < timingPerfectEndPermille"
        }
        check(p.player.timingPerfectStartPermille >= p.player.timingWindowStartPermille) {
            "player.timingPerfectStartPermille must be >= timingWindowStartPermille"
        }
        check(p.player.timingPerfectEndPermille <= p.player.timingWindowEndPermille) {
            "player.timingPerfectEndPermille must be <= timingWindowEndPermille"
        }
        check(p.player.timingGoodBonusPermille >= 1) {
            "player.timingGoodBonusPermille must be >= 1"
        }
        check(p.player.timingPerfectBonusPermille >= p.player.timingGoodBonusPermille) {
            "player.timingPerfectBonusPermille must be >= timingGoodBonusPermille"
        }
        check(p.player.startCatchSpeedPermille >= 1000) {
            "player.startCatchSpeedPermille must be >= 1000"
        }
        check(p.player.startFishRegenPermille >= 1000) {
            "player.startFishRegenPermille must be >= 1000"
        }

        // Unique IDs across every collection (IDs are global and namespaced by prefix).
        val allIds = p.species.map { it.id } + p.products.map { it.id } + p.bait.map { it.id } + p.recipes.map { it.id } +
            p.machines.map { it.id } + p.upgrades.map { it.id } + p.quests.map { it.id } +
                p.workers.map { it.id } + p.staffProgression.traits.map { it.id } +
                p.trophies.sets.map { it.id } + p.prestige.milestones.map { it.id } +
                p.contracts.templates.map { it.id } +
                p.customers.map { it.id } + p.tutorial.map { it.id } + p.decor.items.map { it.id } +
                p.seasonalEvents.events.map { it.id } +
                p.harbors.map { it.id }
        allIds.groupingBy { it }.eachCount().filter { it.value > 1 }.keys.forEach { errors += "Duplicate id '$it'" }

        for (w in p.workers) {
            check(w.hireCost >= 0) { "${w.id}: hireCost must be >= 0" }
            check(w.maxHired >= 1) { "${w.id}: maxHired must be >= 1" }
            check(w.catchSpeedPermille >= 1) { "${w.id}: catchSpeedPermille must be >= 1" }
        }
        check(p.workers.any { it.role == WorkerRoleKind.FISHER }) { "content needs at least one fisher worker" }
        check(p.workers.any { it.role == WorkerRoleKind.PORTER }) { "content needs at least one porter worker" }
        check(p.workers.any { it.role == WorkerRoleKind.OPERATOR }) { "content needs at least one operator worker" }
        check(p.workers.any { it.role == WorkerRoleKind.CASHIER }) { "content needs at least one cashier worker" }
        check(p.workers.any { it.role == WorkerRoleKind.SUPERVISOR }) { "content needs at least one supervisor worker" }
        check(p.workers.any { it.role == WorkerRoleKind.ICE_RUNNER }) { "content needs at least one ice_runner worker" }
        check(p.workers.any { it.role == WorkerRoleKind.SMOKER_SPECIALIST }) {
            "content needs at least one smoker_specialist worker"
        }
        check(p.workers.any { it.role == WorkerRoleKind.GREETER }) { "content needs at least one greeter worker" }
        val sp = p.staffProgression
        check(sp.maxLevel >= 1) { "staffProgression.maxLevel must be >= 1" }
        check(sp.xpThresholds.size == sp.maxLevel) {
            "staffProgression.xpThresholds must have maxLevel (${sp.maxLevel}) entries"
        }
        check(sp.xpThresholds.first() == 0) { "staffProgression.xpThresholds[0] must be 0" }
        for (i in 1 until sp.xpThresholds.size) {
            check(sp.xpThresholds[i] > sp.xpThresholds[i - 1]) {
                "staffProgression.xpThresholds must be strictly increasing"
            }
        }
        check(sp.traits.isNotEmpty()) { "staffProgression.traits must not be empty" }
        check(sp.traitsOnHire <= sp.traits.size) {
            "staffProgression.traitsOnHire must be <= traits.size"
        }
        check(sp.shifts.baseOnShiftSlots >= 1) { "staffProgression.shifts.baseOnShiftSlots must be >= 1" }
        check(sp.shifts.overtimeWagePermille >= 1) {
            "staffProgression.shifts.overtimeWagePermille must be >= 1"
        }
        check(sp.shifts.supervisorExtraSlots >= 0) {
            "staffProgression.shifts.supervisorExtraSlots must be >= 0"
        }
        check(sp.roleBuffs.greeterPatienceDrainMultPermille >= 1) {
            "staffProgression.roleBuffs.greeterPatienceDrainMultPermille must be >= 1"
        }
        check(sp.roleBuffs.smokerSpecialistProcessSpeedPermille >= 1) {
            "staffProgression.roleBuffs.smokerSpecialistProcessSpeedPermille must be >= 1"
        }
        check(sp.roleBuffs.iceRunnerFragileSpoilTierMin in 1..3) {
            "staffProgression.roleBuffs.iceRunnerFragileSpoilTierMin must be 1..3"
        }
        check(sp.roleBuffs.iceRunnerSpoilScoreBonus >= 0) {
            "staffProgression.roleBuffs.iceRunnerSpoilScoreBonus must be >= 0"
        }
        check(sp.loadouts.slots.isNotEmpty()) { "staffProgression.loadouts.slots must not be empty" }
        val seenSlotIds = mutableSetOf<String>()
        val seenGearUpgrades = mutableSetOf<String>()
        for (slot in sp.loadouts.slots) {
            check(slot.id.isNotBlank()) { "loadout slot id must not be blank" }
            check(seenSlotIds.add(slot.id)) { "duplicate loadout slot ${slot.id}" }
            check(slot.upgradeIds.isNotEmpty()) { "loadout slot ${slot.id}: upgradeIds must not be empty" }
            for (uid in slot.upgradeIds) {
                check(seenGearUpgrades.add(uid)) { "upgrade $uid listed in multiple loadout slots" }
                val u = p.upgradesById[uid] ?: error("loadout slot ${slot.id}: unknown upgrade $uid")
                check(
                    u.effect is UpgradeEffect.WorkerMoveSpeed ||
                        u.effect is UpgradeEffect.WorkerCarry ||
                        u.effect is UpgradeEffect.WorkerCatchSpeed,
                ) { "loadout upgrade $uid must use worker_move_speed / worker_carry / worker_catch_speed" }
            }
        }
        sp.traits.forEach { t ->
            check(t.weight >= 1) { "${t.id}: weight must be >= 1" }
            check(t.moveSpeedPermille >= 1) { "${t.id}: moveSpeedPermille must be >= 1" }
            check(t.catchSpeedPermille >= 1) { "${t.id}: catchSpeedPermille must be >= 1" }
            check(t.carryBonus >= 0) { "${t.id}: carryBonus must be >= 0" }
            check(t.transferIntervalMultPermille >= 1) {
                "${t.id}: transferIntervalMultPermille must be >= 1"
            }
        }
        check(p.routing.urgencyWeight >= 0) { "routing.urgencyWeight must be >= 0" }
        check(p.routing.distanceWeight >= 0) { "routing.distanceWeight must be >= 0" }
        check(p.routing.demandWeight >= 0) { "routing.demandWeight must be >= 0" }
        check(p.routing.supervisorDemandBoostPermille >= 1) { "routing.supervisorDemandBoostPermille must be >= 1" }
        check(p.automationAlerts.machineIdleTicksDuringRush >= 1) {
            "automationAlerts.machineIdleTicksDuringRush must be >= 1"
        }
        check(p.automationAlerts.alertCooldownTicks >= 1) {
            "automationAlerts.alertCooldownTicks must be >= 1"
        }
        check(p.offline.capHours >= 1) { "offline.capHours must be >= 1" }
        check(p.offline.summaryMinSeconds >= 0) { "offline.summaryMinSeconds must be >= 0" }
        check(p.economy.maintenancePeriodTicks >= 1) { "economy.maintenancePeriodTicks must be >= 1" }
        check(p.economy.maintenanceCoinsPerStation >= 0) { "economy.maintenanceCoinsPerStation must be >= 0" }
        check(p.economy.counterSpoilPeriodTicks >= 1) { "economy.counterSpoilPeriodTicks must be >= 1" }
        check(p.economy.counterSpoilUnits >= 0) { "economy.counterSpoilUnits must be >= 0" }
        check(p.economy.bagFishSpoilPeriodTicks >= 1) { "economy.bagFishSpoilPeriodTicks must be >= 1" }
        check(p.economy.bagFishSpoilUnits >= 0) { "economy.bagFishSpoilUnits must be >= 0" }
        check(p.economy.scarcityPriceCurvePermille.size == 5) {
            "economy.scarcityPriceCurvePermille must have exactly 5 bands"
        }
        for ((i, mult) in p.economy.scarcityPriceCurvePermille.withIndex()) {
            check(mult >= 1) { "economy.scarcityPriceCurvePermille[$i] must be >= 1" }
        }
        val economyRequirable = p.upgradesById.keys + p.questsById.keys
        p.economy.requires.forEach { req ->
            check(req in economyRequirable) { "economy: unknown requirement '$req'" }
        }
        val wear = p.economy.wear
        check(wear.checkPeriodTicks >= 1) { "economy.wear.checkPeriodTicks must be >= 1" }
        check(wear.chancePermille in 0..1000) { "economy.wear.chancePermille must be 0..1000" }
        check(wear.breakChancePermille in 0..1000) { "economy.wear.breakChancePermille must be 0..1000" }
        check(wear.slowDurationTicks >= 1) { "economy.wear.slowDurationTicks must be >= 1" }
        check(wear.slowProcessMultPermille >= 1000) {
            "economy.wear.slowProcessMultPermille must be >= 1000"
        }
        check(wear.repairCoins >= 0) { "economy.wear.repairCoins must be >= 0" }
        wear.requires.forEach { req ->
            check(req in economyRequirable) { "economy.wear: unknown requirement '$req'" }
        }
        val bank = p.bank
        check(bank.loanPrincipal >= 1) { "bank.loanPrincipal must be >= 1" }
        check(bank.repayPermille >= 1000) { "bank.repayPermille must be >= 1000" }
        check(bank.termTicks >= 1) { "bank.termTicks must be >= 1" }
        check(bank.collectionPeriodTicks >= 1) { "bank.collectionPeriodTicks must be >= 1" }
        check(bank.goalPresets.isNotEmpty()) { "bank.goalPresets must not be empty" }
        check(bank.goalPresets.distinct().size == bank.goalPresets.size) {
            "bank.goalPresets must be unique"
        }
        for (goal in bank.goalPresets) {
            check(goal >= 1) { "bank.goalPresets entries must be >= 1" }
        }
        bank.requires.forEach { req ->
            check(req in economyRequirable) { "bank: unknown requirement '$req'" }
        }
        check(p.ecology.dayLengthTicks >= 1) { "ecology.dayLengthTicks must be >= 1" }
        check(p.ecology.parts.size >= 2) { "ecology.parts needs at least 2 day parts" }
        check(p.ecology.parts.map { it.id }.toSet().size == p.ecology.parts.size) {
            "ecology.parts ids must be unique"
        }
        var prevEnd = 0
        for (part in p.ecology.parts) {
            check(part.endPermille > prevEnd) {
                "ecology.${part.id}: endPermille must increase (was $prevEnd → ${part.endPermille})"
            }
            check(part.regenMultPermille >= 1) { "ecology.${part.id}: regenMultPermille must be >= 1" }
            check(part.catchSpeedMultPermille >= 1) { "ecology.${part.id}: catchSpeedMultPermille must be >= 1" }
            prevEnd = part.endPermille
        }
        check(p.ecology.parts.last().endPermille == 1000) { "ecology.parts must end at endPermille 1000" }
        check(p.trophies.sizeMinPermille <= p.trophies.sizeMaxPermille) {
            "trophies: sizeMinPermille must be <= sizeMaxPermille"
        }
        check(p.trophies.sets.isNotEmpty()) { "trophies.sets must not be empty" }
        check(p.trophies.sets.map { it.id }.toSet().size == p.trophies.sets.size) {
            "trophies.sets ids must be unique"
        }
        check(p.trophies.sets.map { it.completeStat }.toSet().size == p.trophies.sets.size) {
            "trophies.sets completeStat values must be unique"
        }
        for (set in p.trophies.sets) {
            check(set.species.isNotEmpty()) { "${set.id}: species must not be empty" }
            check(set.species.toSet().size == set.species.size) { "${set.id}: species must be unique" }
            check(set.completeStat.startsWith("stat.")) { "${set.id}: completeStat must start with 'stat.'" }
            for (sp in set.species) {
                check(sp in p.speciesById) { "${set.id}: unknown species '$sp'" }
            }
        }
        check(p.prestige.ratingThresholds.size == 5) { "prestige.ratingThresholds must have exactly 5 entries" }
        check(p.prestige.ratingPriceMultPermille.size == 6) {
            "prestige.ratingPriceMultPermille must have exactly 6 entries (stars 0..5)"
        }
        for ((i, mult) in p.prestige.ratingPriceMultPermille.withIndex()) {
            check(mult >= 1) { "prestige.ratingPriceMultPermille[$i] must be >= 1" }
        }
        check(p.prestige.milestones.isNotEmpty()) { "prestige.milestones must not be empty" }
        for (i in 1 until p.prestige.ratingThresholds.size) {
            check(p.prestige.ratingThresholds[i] >= p.prestige.ratingThresholds[i - 1]) {
                "prestige.ratingThresholds must be non-decreasing"
            }
        }
        val rep = p.reputation
        check(rep.minSample >= 1) { "reputation.minSample must be >= 1" }
        check(rep.neutralScorePermille >= 1) { "reputation.neutralScorePermille must be >= 1" }
        check(rep.scoreBandThresholdsPermille.isNotEmpty()) {
            "reputation.scoreBandThresholdsPermille must not be empty"
        }
        for (i in 1 until rep.scoreBandThresholdsPermille.size) {
            check(rep.scoreBandThresholdsPermille[i] >= rep.scoreBandThresholdsPermille[i - 1]) {
                "reputation.scoreBandThresholdsPermille must be non-decreasing"
            }
        }
        check(rep.kindSpawnMultPermille.size == rep.scoreBandThresholdsPermille.size + 1) {
            "reputation.kindSpawnMultPermille must have thresholds+1 rows"
        }
        val kindWires = CustomerKind.entries.map { it.wire }.toSet()
        for ((bandIdx, row) in rep.kindSpawnMultPermille.withIndex()) {
            check(row.keys.containsAll(kindWires)) {
                "reputation.kindSpawnMultPermille[$bandIdx] must include every customer kind"
            }
            for ((kind, mult) in row) {
                check(kind in kindWires) {
                    "reputation.kindSpawnMultPermille[$bandIdx]: unknown kind '$kind'"
                }
                check(mult >= 1) {
                    "reputation.kindSpawnMultPermille[$bandIdx].$kind must be >= 1"
                }
            }
        }
        check(rep.unmetPreferencePenaltyPermille >= 0) {
            "reputation.unmetPreferencePenaltyPermille must be >= 0"
        }
        check(rep.coachingLostRatioPermille in 0..1000) {
            "reputation.coachingLostRatioPermille must be 0..1000"
        }
        check(rep.coachingPraiseScorePermille >= 1) {
            "reputation.coachingPraiseScorePermille must be >= 1"
        }
        check(p.contracts.boardSlots >= 1) { "contracts.boardSlots must be >= 1" }
        check(p.contracts.maxActive >= 1) { "contracts.maxActive must be >= 1" }
        check(p.contracts.refreshPeriodTicks >= 1) { "contracts.refreshPeriodTicks must be >= 1" }
        check(p.contracts.templates.isNotEmpty()) { "contracts.templates must not be empty" }
        val contractRequirable = p.upgradesById.keys + p.questsById.keys
        p.contracts.requires.forEach { req ->
            check(req in contractRequirable) { "contracts: unknown requirement '$req'" }
        }
        for (t in p.contracts.templates) {
            check(p.isKnownItem(t.item)) { "${t.id}: unknown item '${t.item}'" }
            check(t.quantity >= 1) { "${t.id}: quantity must be >= 1" }
            check(t.durationTicks >= 1) { "${t.id}: durationTicks must be >= 1" }
            check(t.payout >= 0) { "${t.id}: payout must be >= 0" }
            check(t.penalty >= 0) { "${t.id}: penalty must be >= 0" }
            check(t.payoutEscalatePermille >= 1) { "${t.id}: payoutEscalatePermille must be >= 1" }
            check(t.penaltyEscalatePermille >= 1) { "${t.id}: penaltyEscalatePermille must be >= 1" }
            check(t.maxStreak >= 1) { "${t.id}: maxStreak must be >= 1" }
            check(t.failCooldownTicks >= 1) { "${t.id}: failCooldownTicks must be >= 1" }
            if (t.isStanding) {
                check(t.payoutEscalatePermille >= 1000) {
                    "${t.id}: standing payoutEscalatePermille must be >= 1000"
                }
                check(t.penaltyEscalatePermille >= 1000) {
                    "${t.id}: standing penaltyEscalatePermille must be >= 1000"
                }
            }
            check(t.weight >= 1) { "${t.id}: weight must be >= 1" }
            t.requiresSeasonalEvent?.let { eventId ->
                check(eventId in p.seasonalEventsById) {
                    "${t.id}: unknown requiresSeasonalEvent '$eventId'"
                }
            }
        }

        for (sp in p.species) {
            sp.rareUpgrade?.let { ru ->
                check(ru.to in p.speciesById) { "${sp.id}: rareUpgrade.to unknown species '${ru.to}'" }
                check(ru.to != sp.id) { "${sp.id}: rareUpgrade.to must differ from the base species" }
                val target = p.speciesById.getValue(ru.to)
                check(target.carryUnits == sp.carryUnits) {
                    "${sp.id}: rareUpgrade target must share carryUnits with the base species"
                }
            }
        }
        for (r in p.recipes) {
            check(r.machine in p.machinesById) { "${r.id}: unknown machine '${r.machine}'" }
            (r.inputs + r.outputs).forEach { iq -> check(p.isKnownItem(iq.item)) { "${r.id}: unknown item '${iq.item}'" } }
            check(r.inputs.isNotEmpty() && r.outputs.isNotEmpty()) { "${r.id}: needs inputs and outputs" }
        }
        for (m in p.machines) {
            m.recipes.forEach { rid ->
                val r = p.recipesById[rid]
                check(r != null) { "${m.id}: unknown recipe '$rid'" }
                if (r != null) {
                    check(r.machine == m.id) { "${m.id}: recipe '$rid' belongs to '${r.machine}'" }
                    val inUnits = r.inputs.sumOf { p.carryUnitsOrZero(it.item) * it.quantity }
                    val outUnits = r.outputs.sumOf { p.carryUnitsOrZero(it.item) * it.quantity }
                    check(inUnits <= m.inputCapacityUnits) { "${m.id}: input capacity too small for '$rid'" }
                    check(outUnits <= m.outputCapacityUnits) { "${m.id}: output capacity too small for '$rid'" }
                }
            }
        }

        val requirable = p.upgradesById.keys + p.questsById.keys
        check(p.bait.isNotEmpty()) { "bait must not be empty" }
        for (b in p.bait) {
            check(b.carryUnits >= 1) { "${b.id}: carryUnits must be >= 1" }
            check(b.packQuantity >= 1) { "${b.id}: packQuantity must be >= 1" }
            check(b.cost >= 0) { "${b.id}: cost must be >= 0" }
            check(b.rareSpeciesWeightMultPermille >= 1) { "${b.id}: rareSpeciesWeightMultPermille must be >= 1" }
            check(b.rareChanceBonusPermille in 0..1000) { "${b.id}: rareChanceBonusPermille must be 0..1000" }
            b.requires.forEach { req -> check(req in requirable) { "${b.id}: unknown requirement '$req'" } }
        }
        for (h in p.harbors) {
            check(h.zones.any { it.kind == ZoneKind.KIOSK }) { "${h.id}: needs at least one kiosk zone" }
        }
        for (u in p.upgrades) {
            u.requires.forEach { req -> check(req in requirable) { "${u.id}: unknown requirement '$req'" } }
            when (val e = u.effect) {
                is UpgradeEffect.CarryCapacity -> check(e.capacityUnits > p.player.startCarryCapacityUnits) {
                    "${u.id}: carry capacity does not exceed the starting capacity"
                }
                is UpgradeEffect.RecipeDuration -> {
                    check(e.machine in p.machinesById) { "${u.id}: unknown machine '${e.machine}'" }
                    check(e.recipe in p.recipesById) { "${u.id}: unknown recipe '${e.recipe}'" }
                }
                is UpgradeEffect.CatchSpeed -> check(e.speedPermille > p.player.startCatchSpeedPermille) {
                    "${u.id}: catch speed does not exceed the starting catch speed"
                }
                is UpgradeEffect.GrantBait -> {
                    check(e.bait in p.baitById) { "${u.id}: grant_bait unknown '${e.bait}'" }
                    check(e.quantity >= 1) { "${u.id}: grant_bait quantity must be >= 1" }
                }
                is UpgradeEffect.TimingWindow -> {
                    check(e.windowStartPermille < e.windowEndPermille) {
                        "${u.id}: timing_window windowStart must be < windowEnd"
                    }
                    check(e.perfectStartPermille < e.perfectEndPermille) {
                        "${u.id}: timing_window perfectStart must be < perfectEnd"
                    }
                    check(e.perfectStartPermille >= e.windowStartPermille) {
                        "${u.id}: timing_window Perfect must sit inside Good (start)"
                    }
                    check(e.perfectEndPermille <= e.windowEndPermille) {
                        "${u.id}: timing_window Perfect must sit inside Good (end)"
                    }
                    check(e.windowStartPermille < p.player.timingWindowStartPermille) {
                        "${u.id}: timing_window must widen Good start vs player default"
                    }
                    check(e.windowEndPermille > p.player.timingWindowEndPermille) {
                        "${u.id}: timing_window must widen Good end vs player default"
                    }
                }
                is UpgradeEffect.FishRegen -> check(e.speedPermille > p.player.startFishRegenPermille) {
                    "${u.id}: fish regen does not exceed the starting fish regen"
                }
                is UpgradeEffect.UnlockFishingSpot -> {
                    val spot = p.harbors.flatMap { it.fishingSpots }.firstOrNull { it.zone == e.zone }
                    check(spot != null) { "${u.id}: unlock_fishing_spot unknown zone '${e.zone}'" }
                    check(spot?.requiresUpgrade == u.id) {
                        "${u.id}: unlock_fishing_spot zone must list this upgrade as requiresUpgrade"
                    }
                }
                is UpgradeEffect.UnlockMachine -> {
                    check(e.machine in p.machinesById) { "${u.id}: unlock_machine unknown '${e.machine}'" }
                    val stations = p.harbors.flatMap { it.stations }.filter { it.machine == e.machine }
                    check(stations.isNotEmpty()) { "${u.id}: unlock_machine has no stations for '${e.machine}'" }
                    stations.forEach { st ->
                        check(st.requiresUpgrade == u.id) {
                            "${u.id}: station '${st.id}' must list this upgrade as requiresUpgrade"
                        }
                    }
                }
                is UpgradeEffect.UnlockCounter -> {
                    val kind = CounterKind.fromWire(e.pad)
                    val counters = p.harbors.flatMap { it.counters }.filter { it.kind == kind }
                    check(counters.isNotEmpty()) { "${u.id}: unlock_counter has no '${e.pad}' counters" }
                    counters.forEach { c ->
                        check(c.requiresUpgrade == u.id) {
                            "${u.id}: counter '${c.id}' must list this upgrade as requiresUpgrade"
                        }
                    }
                    p.harbors.forEach { h ->
                        check(h.counters.any { it.kind == kind }) {
                            "${u.id}: harbor '${h.id}' needs a '${e.pad}' counter"
                        }
                    }
                }
                is UpgradeEffect.WorkerMoveSpeed -> check(e.speedPermille > 1000) {
                    "${u.id}: worker_move_speed must exceed 1000 (base speed)"
                }
                is UpgradeEffect.WorkerCarry -> {
                    val minCarry = p.workers.minOfOrNull { it.carryCapacityUnits } ?: 1
                    check(e.capacityUnits > minCarry) {
                        "${u.id}: worker_carry must exceed the smallest role carry capacity"
                    }
                }
                is UpgradeEffect.WorkerCatchSpeed -> check(e.speedPermille >= 1000) {
                    "${u.id}: worker_catch_speed must be >= 1000"
                }
                is UpgradeEffect.WorkerWage -> check(e.coinsPerWorkerPerHour >= 1) {
                    "${u.id}: worker_wage must be >= 1"
                }
                is UpgradeEffect.MaintenanceDiscount -> check(e.coinsOffPerStation >= 1) {
                    "${u.id}: maintenance_discount must be >= 1"
                }
                is UpgradeEffect.BagSpoilResist -> check(e.periodMultPermille > 1000) {
                    "${u.id}: bag_spoil_resist must exceed 1000"
                }
                is UpgradeEffect.CounterSpoilResist -> check(e.periodMultPermille > 1000) {
                    "${u.id}: counter_spoil_resist must exceed 1000"
                }
            }
        }
        findUpgradeCycle(p)?.let { errors += "Upgrade requirement cycle: ${it.joinToString(" -> ")}" }

        for (q in p.quests) {
            q.requires.forEach { req -> check(req in requirable) { "${q.id}: unknown requirement '$req'" } }
            check(q.reward.coins >= 0) { "${q.id}: reward.coins must be >= 0" }
            q.reward.unlockUpgrades.forEach { uid ->
                check(uid in p.upgradesById) { "${q.id}: unknown reward upgrade '$uid'" }
            }
        }
        findQuestCycle(p)?.let { errors += "Quest requirement cycle: ${it.joinToString(" -> ")}" }

        val prestigeRequirable = requirable + p.prestigeMilestonesById.keys
        p.prestige.requires.forEach { req ->
            check(req in prestigeRequirable) { "prestige: unknown requirement '$req'" }
        }
        for (m in p.prestige.milestones) {
            m.requires.forEach { req ->
                check(req in prestigeRequirable) { "${m.id}: unknown requirement '$req'" }
            }
            check(m.reward.coins >= 0) { "${m.id}: reward.coins must be >= 0" }
            if (m.reward.catchSpeedPermille > 0) {
                check(m.reward.catchSpeedPermille >= 1000) {
                    "${m.id}: catchSpeedPermille must be 0 or >= 1000"
                }
            }
            if (m.reward.priceBonusPermille > 0) {
                check(m.reward.priceBonusPermille >= 1000) {
                    "${m.id}: priceBonusPermille must be 0 or >= 1000"
                }
            }
            m.reward.cosmetic?.let { cos ->
                check(cos.isNotBlank()) { "${m.id}: cosmetic must be non-empty when set" }
            }
        }
        findPrestigeCycle(p)?.let { errors += "Prestige requirement cycle: ${it.joinToString(" -> ")}" }

        check(p.decor.items.isNotEmpty()) { "decor.items must not be empty" }
        val prestigeCosmetics = p.prestige.milestones.mapNotNull { it.reward.cosmetic }.toSet()
        for (d in p.decor.items) {
            check(d.id.startsWith("decor.")) { "${d.id}: decor id must start with 'decor.'" }
            check(d.name.isNotBlank()) { "${d.id}: name must not be blank" }
            check(d.description.isNotBlank()) { "${d.id}: description must not be blank" }
            check(d.cost >= 0) { "${d.id}: cost must be >= 0" }
            check(d.patienceBonusTicks >= 0) { "${d.id}: patienceBonusTicks must be >= 0" }
            d.requiresCosmetic?.let { cos ->
                check(cos.isNotBlank()) { "${d.id}: requiresCosmetic must be non-empty when set" }
                check(cos in prestigeCosmetics) {
                    "${d.id}: requiresCosmetic '$cos' is not granted by any prestige milestone"
                }
            }
        }

        check(p.seasonalEvents.events.isNotEmpty()) { "seasonalEvents.events must not be empty" }
        val seasonalWindows = mutableListOf<Triple<Int, Int, Int>>()
        for (e in p.seasonalEvents.events) {
            check(e.id.startsWith("event.")) { "${e.id}: seasonal event id must start with 'event.'" }
            check(e.name.isNotBlank()) { "${e.id}: name must not be blank" }
            check(e.description.isNotBlank()) { "${e.id}: description must not be blank" }
            check(e.periodTicks >= 1) { "${e.id}: periodTicks must be >= 1" }
            check(e.startTick >= 0) { "${e.id}: startTick must be >= 0" }
            check(e.durationTicks >= 1) { "${e.id}: durationTicks must be >= 1" }
            check(e.startTick + e.durationTicks <= e.periodTicks) {
                "${e.id}: window must fit inside periodTicks (no wrap)"
            }
            e.banner?.let { b ->
                check(b.isNotBlank()) { "${e.id}: banner must be non-empty when set" }
            }
            for ((sp, mult) in e.speciesWeightMultPermille) {
                check(sp in p.speciesById) { "${e.id}: unknown species '$sp'" }
                check(mult >= 1) { "${e.id}: speciesWeightMultPermille.$sp must be >= 1" }
            }
            for ((period, otherStart, otherEnd) in seasonalWindows) {
                if (period != e.periodTicks) continue
                check(e.endTick <= otherStart || otherEnd <= e.startTick) {
                    "${e.id}: overlaps another seasonal event window inside the period"
                }
            }
            seasonalWindows += Triple(e.periodTicks, e.startTick, e.endTick)
        }

        for (w in p.workers) {
            w.requires.forEach { req -> check(req in requirable) { "${w.id}: unknown requirement '$req'" } }
        }

        for (c in p.customers) {
            check(c.basketMax >= c.basketMin) { "${c.id}: basketMax < basketMin" }
            check(c.priceMultPermille >= 1000) { "${c.id}: priceMultPermille must be >= 1000" }
            check(c.unmetPriceMultPermille in 1..1000) { "${c.id}: unmetPriceMultPermille must be 1..1000" }
            check(c.unmetPatienceDrainPermille >= 1000) {
                "${c.id}: unmetPatienceDrainPermille must be >= 1000"
            }
            if (c.kind == CustomerKind.PREMIUM || c.kind == CustomerKind.TOURIST || c.kind == CustomerKind.CRITIC) {
                check(c.priceMultPermille > 1000) {
                    "${c.id}: ${c.kind.wire} customers must tip (priceMultPermille > 1000)"
                }
            }
            if (c.kind == CustomerKind.BULK) {
                check(c.basketMin >= 5) { "${c.id}: bulk customers need basketMin >= 5" }
            }
            if (c.kind == CustomerKind.WHOLESALER) {
                check(c.basketMin >= 2) { "${c.id}: wholesaler customers need basketMin >= 2" }
            }
            if (c.kind == CustomerKind.CRITIC) {
                check(c.preferredProducts.isNotEmpty()) { "${c.id}: critic customers need preferred products" }
                check(c.unmetPatienceDrainPermille >= 2500) {
                    "${c.id}: critic unmetPatienceDrainPermille must be >= 2500"
                }
            }
            if (c.kind == CustomerKind.NIGHT_REGULAR) {
                val night = c.dayPartSpawnMultPermille["night"] ?: 1000
                val day = c.dayPartSpawnMultPermille["day"] ?: 1000
                check(night > day) { "${c.id}: night_regular needs night spawn mult > day" }
            }
            val ecologyParts = p.ecology.parts.map { it.id }.toSet()
            for ((partId, mult) in c.dayPartSpawnMultPermille) {
                check(partId in ecologyParts) { "${c.id}: unknown day-part '$partId' in dayPartSpawnMultPermille" }
                check(mult >= 1) { "${c.id}: dayPartSpawnMultPermille.$partId must be >= 1" }
            }
            for (pw in c.preferredProducts) {
                check(pw.item in p.productsById) { "${c.id}: preferred product unknown '${pw.item}'" }
            }
            // Preferred products must be sellable at least somewhere.
            if (c.preferredProducts.isNotEmpty()) {
                val sellable = p.harbors.flatMap { h -> h.counters.flatMap { it.products } }.toSet()
                c.preferredProducts.forEach { pw ->
                    check(pw.item in sellable) { "${c.id}: preferred '${pw.item}' is not sold at any counter" }
                }
            }
        }

        val specializationIds = mutableSetOf<String>()
        for (h in p.harbors) {
            val zoneIds = h.zonesById.keys
            for (req in h.requires) {
                check(req in p.upgradesById || req in p.questsById || req in p.prestigeMilestonesById) {
                    "${h.id}: unknown requirement '$req'"
                }
            }
            val sp = checkNotNull(h.specialization) { "${h.id}: specialization is required" }
            check(sp.id.startsWith("spec.")) { "${h.id}: specialization.id must start with 'spec.'" }
            check(sp.name.isNotBlank()) { "${h.id}: specialization.name must not be blank" }
            check(sp.description.isNotBlank()) { "${h.id}: specialization.description must not be blank" }
            check(sp.maintenanceDiscountPerStation >= 0) {
                "${h.id}: specialization.maintenanceDiscountPerStation must be >= 0"
            }
            check(sp.rareChanceBonusPermille in 0..1000) {
                "${h.id}: specialization.rareChanceBonusPermille must be 0..1000"
            }
            val kindWires = CustomerKind.entries.map { it.wire }.toSet()
            for ((kind, mult) in sp.kindSpawnMultPermille) {
                check(kind in kindWires) { "${h.id}: specialization.kindSpawnMultPermille unknown kind '$kind'" }
                check(mult >= 1) { "${h.id}: specialization.kindSpawnMultPermille.$kind must be >= 1" }
            }
            check(specializationIds.add(sp.id)) { "${h.id}: duplicate specialization '${sp.id}'" }
            check(h.walkable.any { it.contains(h.playerSpawn.x, h.playerSpawn.z) }) { "${h.id}: spawn is not walkable" }
            check(h.obstacles.none { it.contains(h.playerSpawn.x, h.playerSpawn.z) }) { "${h.id}: spawn is inside an obstacle" }
            val fishingZoneIds = h.zones.filter { it.kind == ZoneKind.FISHING }.map { it.id }.toSet()
            val spotZoneIds = h.fishingSpots.map { it.zone }.toSet()
            check(fishingZoneIds == spotZoneIds) {
                "${h.id}: fishing zones and fishingSpots must cover the same zone ids"
            }
            for (f in h.fishingSpots) {
                check(h.zonesById[f.zone]?.kind == ZoneKind.FISHING) { "${h.id}: '${f.zone}' is not a fishing zone" }
                f.species.forEach { s -> check(s in p.speciesById) { "${h.id}: unknown species '$s'" } }
                check(f.regenCurvePermille.size >= 2) { "${h.id}: '${f.zone}' regenCurvePermille needs >= 2 entries" }
                f.dayPartRegenMultPermille.forEach { (partId, mult) ->
                    check(partId in p.ecology.partsById) {
                        "${h.id}: '${f.zone}' dayPartRegenMultPermille unknown part '$partId'"
                    }
                    check(mult >= 1) { "${h.id}: '${f.zone}' dayPartRegenMultPermille.$partId must be >= 1" }
                }
                f.requiresUpgrade?.let { req ->
                    check(req in p.upgradesById) { "${h.id}: '${f.zone}' requiresUpgrade unknown '$req'" }
                }
            }
            for (s in h.stations) {
                check(s.machine in p.machinesById) { "${s.id}: unknown machine '${s.machine}'" }
                check(h.zonesById[s.inputZone]?.kind == ZoneKind.MACHINE_INPUT) { "${s.id}: bad input zone" }
                check(h.zonesById[s.outputZone]?.kind == ZoneKind.MACHINE_OUTPUT) { "${s.id}: bad output zone" }
                s.requiresUpgrade?.let { req ->
                    check(req in p.upgradesById) { "${s.id}: requiresUpgrade unknown '$req'" }
                }
            }
            fun open(x: Int, z: Int) = h.walkable.any { it.contains(x, z) } && h.obstacles.none { it.contains(x, z) }
            fun openForCustomer(x: Int, z: Int): Boolean {
                val r = CUSTOMER_PATH_RADIUS_MM
                if (h.walkable.none { it.contains(x, z) }) return false
                return h.obstacles.none {
                    x >= it.minX - r && x < it.maxX + r && z >= it.minZ - r && z < it.maxZ + r
                }
            }
            fun segmentClear(a: PointMm, b: PointMm): Boolean {
                val dx = (b.x - a.x).toLong()
                val dz = (b.z - a.z).toLong()
                val dist = SafeMath.isqrt(dx * dx + dz * dz).toInt().coerceAtLeast(1)
                var d = 0
                while (d <= dist) {
                    val x = a.x + ((dx * d) / dist).toInt()
                    val z = a.z + ((dz * d) / dist).toInt()
                    if (!openForCustomer(x, z)) return false
                    d += CUSTOMER_PATH_SAMPLE_MM
                }
                return openForCustomer(b.x, b.z)
            }
            check(open(h.customerEntry.x, h.customerEntry.z)) { "${h.id}: customer entry is not on open walkable ground" }
            for ((i, wp) in h.customerPathWaypoints.withIndex()) {
                check(openForCustomer(wp.x, wp.z)) {
                    "${h.id}: customerPathWaypoints[$i] is not on open walkable ground"
                }
            }
            val rushQueueBonus = h.rushes.maxOfOrNull { it.queueBonus } ?: 0
            for (r in h.rushes) {
                check(r.startTick + r.durationTicks <= r.periodTicks) {
                    "${r.id}: rush window must fit inside periodTicks (no wrap)"
                }
                check(r.spawnSpeedPermille >= 1000) {
                    "${r.id}: spawnSpeedPermille must be >= 1000 (rushes only speed up spawns)"
                }
                check(r.priceMultPermille >= 1) {
                    "${r.id}: priceMultPermille must be >= 1"
                }
            }
            h.rushes.groupingBy { it.id }.eachCount().filter { it.value > 1 }.keys
                .forEach { errors += "${h.id}: duplicate rush '$it'" }
            for (i in h.rushes.indices) {
                for (j in i + 1 until h.rushes.size) {
                    val a = h.rushes[i]
                    val b = h.rushes[j]
                    if (a.periodTicks != b.periodTicks) continue
                    val overlap = a.startTick < b.endTick && b.startTick < a.endTick
                    check(!overlap) { "${h.id}: rushes '${a.id}' and '${b.id}' overlap" }
                }
            }
            for (c in h.counters) {
                check(c.products.isNotEmpty()) { "${c.id}: needs at least one product" }
                c.products.forEach { pid -> check(pid in p.productsById) { "${c.id}: unknown product '$pid'" } }
                check(c.products.toSet().size == c.products.size) { "${c.id}: duplicate products" }
                check(h.zonesById[c.zone]?.kind == ZoneKind.COUNTER) { "${c.id}: bad counter zone" }
                c.requiresUpgrade?.let { req ->
                    check(req in p.upgradesById) { "${c.id}: requiresUpgrade unknown '$req'" }
                }
                for (i in 0 until c.maxQueue + rushQueueBonus) {
                    val slot = c.queueSlot(i)
                    check(open(slot.x, slot.z)) { "${c.id}: queue slot $i is not on open walkable ground" }
                    val path = listOf(h.customerEntry) + h.customerPathWaypoints + slot
                    for (seg in path.zipWithNext()) {
                        check(segmentClear(seg.first, seg.second)) {
                            "${c.id}: customer path to queue slot $i crosses blocked ground"
                        }
                    }
                }
            }
            // Every zone must be reachable: its centre lies on walkable, unobstructed ground.
            for (z in h.zones) {
                val cx = z.rect.centerX
                val cz = z.rect.centerZ
                check(h.walkable.any { it.contains(cx, cz) } && h.obstacles.none { it.contains(cx, cz) }) {
                    "${h.id}: zone '${z.id}' centre is not on open walkable ground"
                }
            }
            val ids = (h.zones.map { it.id } + h.stations.map { it.id } + h.counters.map { it.id })
            ids.groupingBy { it }.eachCount().filter { it.value > 1 }.keys.forEach { errors += "${h.id}: duplicate '$it'" }
            check(zoneIds.isNotEmpty()) { "${h.id}: no zones" }
        }

        for (t in p.tutorial) {
            val trig = t.advanceOn
            if (trig is TutorialTrigger.EnterZone) {
                check(p.harbors.any { trig.zone in it.zonesById }) { "${t.id}: unknown zone '${trig.zone}'" }
            }
        }
        return errors
    }

    private fun ContentPack.carryUnitsOrZero(item: String) =
        speciesById[item]?.carryUnits ?: productsById[item]?.carryUnits ?: 0

    /** Depth-first search over upgrade -> required upgrade edges. */
    private fun findUpgradeCycle(p: ContentPack): List<String>? {
        val state = HashMap<String, Int>() // 1 = visiting, 2 = done
        val stack = ArrayDeque<String>()
        fun visit(id: String): List<String>? {
            when (state[id]) {
                1 -> return stack.dropWhile { it != id } + id
                2 -> return null
            }
            state[id] = 1
            stack.addLast(id)
            for (req in p.upgradesById[id]?.requires.orEmpty()) {
                if (req in p.upgradesById) visit(req)?.let { return it }
            }
            stack.removeLast()
            state[id] = 2
            return null
        }
        for (u in p.upgrades) visit(u.id)?.let { return it }
        return null
    }

    /** Depth-first search over quest -> required quest edges (upgrade requires ignored). */
    private fun findQuestCycle(p: ContentPack): List<String>? {
        val state = HashMap<String, Int>()
        val stack = ArrayDeque<String>()
        fun visit(id: String): List<String>? {
            when (state[id]) {
                1 -> return stack.dropWhile { it != id } + id
                2 -> return null
            }
            state[id] = 1
            stack.addLast(id)
            for (req in p.questsById[id]?.requires.orEmpty()) {
                if (req in p.questsById) visit(req)?.let { return it }
            }
            stack.removeLast()
            state[id] = 2
            return null
        }
        for (q in p.quests) visit(q.id)?.let { return it }
        return null
    }

    /** Depth-first search over prestige -> required prestige edges. */
    private fun findPrestigeCycle(p: ContentPack): List<String>? {
        val state = HashMap<String, Int>()
        val stack = ArrayDeque<String>()
        fun visit(id: String): List<String>? {
            when (state[id]) {
                1 -> return stack.dropWhile { it != id } + id
                2 -> return null
            }
            state[id] = 1
            stack.addLast(id)
            for (req in p.prestigeMilestonesById[id]?.requires.orEmpty()) {
                if (req in p.prestigeMilestonesById) visit(req)?.let { return it }
            }
            stack.removeLast()
            state[id] = 2
            return null
        }
        for (m in p.prestige.milestones) visit(m.id)?.let { return it }
        return null
    }
}
