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
        check(p.player.startCatchSpeedPermille >= 1000) {
            "player.startCatchSpeedPermille must be >= 1000"
        }
        check(p.player.startFishRegenPermille >= 1000) {
            "player.startFishRegenPermille must be >= 1000"
        }

        // Unique IDs across every collection (IDs are global and namespaced by prefix).
        val allIds = p.species.map { it.id } + p.products.map { it.id } + p.recipes.map { it.id } +
            p.machines.map { it.id } + p.upgrades.map { it.id } + p.quests.map { it.id } +
                p.workers.map { it.id } + p.prestige.milestones.map { it.id } + p.contracts.templates.map { it.id } +
                p.customers.map { it.id } + p.tutorial.map { it.id } + p.harbors.map { it.id }
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
        check(p.routing.urgencyWeight >= 0) { "routing.urgencyWeight must be >= 0" }
        check(p.routing.distanceWeight >= 0) { "routing.distanceWeight must be >= 0" }
        check(p.routing.demandWeight >= 0) { "routing.demandWeight must be >= 0" }
        check(p.routing.supervisorDemandBoostPermille >= 1) { "routing.supervisorDemandBoostPermille must be >= 1" }
        check(p.offline.capHours >= 1) { "offline.capHours must be >= 1" }
        check(p.offline.summaryMinSeconds >= 0) { "offline.summaryMinSeconds must be >= 0" }
        check(p.economy.maintenancePeriodTicks >= 1) { "economy.maintenancePeriodTicks must be >= 1" }
        check(p.economy.maintenanceCoinsPerStation >= 0) { "economy.maintenanceCoinsPerStation must be >= 0" }
        check(p.economy.counterSpoilPeriodTicks >= 1) { "economy.counterSpoilPeriodTicks must be >= 1" }
        check(p.economy.counterSpoilUnits >= 0) { "economy.counterSpoilUnits must be >= 0" }
        check(p.economy.bagFishSpoilPeriodTicks >= 1) { "economy.bagFishSpoilPeriodTicks must be >= 1" }
        check(p.economy.bagFishSpoilUnits >= 0) { "economy.bagFishSpoilUnits must be >= 0" }
        val economyRequirable = p.upgradesById.keys + p.questsById.keys
        p.economy.requires.forEach { req ->
            check(req in economyRequirable) { "economy: unknown requirement '$req'" }
        }
        check(p.prestige.ratingThresholds.size == 5) { "prestige.ratingThresholds must have exactly 5 entries" }
        check(p.prestige.milestones.isNotEmpty()) { "prestige.milestones must not be empty" }
        for (i in 1 until p.prestige.ratingThresholds.size) {
            check(p.prestige.ratingThresholds[i] >= p.prestige.ratingThresholds[i - 1]) {
                "prestige.ratingThresholds must be non-decreasing"
            }
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
            check(t.weight >= 1) { "${t.id}: weight must be >= 1" }
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
            if (c.kind == CustomerKind.PREMIUM) {
                check(c.priceMultPermille > 1000) { "${c.id}: premium customers must tip (priceMultPermille > 1000)" }
            }
            if (c.kind == CustomerKind.BULK) {
                check(c.basketMin >= 5) { "${c.id}: bulk customers need basketMin >= 5" }
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

        for (h in p.harbors) {
            val zoneIds = h.zonesById.keys
            for (req in h.requires) {
                check(req in p.upgradesById || req in p.questsById) {
                    "${h.id}: unknown requirement '$req'"
                }
            }
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
                f.requiresUpgrade?.let { req ->
                    check(req in p.upgradesById) { "${h.id}: '${f.zone}' requiresUpgrade unknown '$req'" }
                }
            }
            for (s in h.stations) {
                check(s.machine in p.machinesById) { "${s.id}: unknown machine '${s.machine}'" }
                check(h.zonesById[s.inputZone]?.kind == ZoneKind.MACHINE_INPUT) { "${s.id}: bad input zone" }
                check(h.zonesById[s.outputZone]?.kind == ZoneKind.MACHINE_OUTPUT) { "${s.id}: bad output zone" }
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
