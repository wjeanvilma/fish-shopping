package com.willio.jeanvilma.fishshopping.core.content

import com.willio.jeanvilma.fishshopping.core.sim.SimConstants

/**
 * Cross-reference checks that a JSON Schema cannot express: unique IDs,
 * references to existing IDs, an acyclic unlock graph, and layout sanity.
 */
object ContentValidator {

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

        // Unique IDs across every collection (IDs are global and namespaced by prefix).
        val allIds = p.species.map { it.id } + p.products.map { it.id } + p.recipes.map { it.id } +
            p.machines.map { it.id } + p.upgrades.map { it.id } + p.quests.map { it.id } +
            p.customers.map { it.id } + p.tutorial.map { it.id } + p.harbors.map { it.id }
        allIds.groupingBy { it }.eachCount().filter { it.value > 1 }.keys.forEach { errors += "Duplicate id '$it'" }

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
            }
        }
        findUpgradeCycle(p)?.let { errors += "Upgrade requirement cycle: ${it.joinToString(" -> ")}" }

        for (c in p.customers) check(c.basketMax >= c.basketMin) { "${c.id}: basketMax < basketMin" }

        for (h in p.harbors) {
            val zoneIds = h.zonesById.keys
            check(h.walkable.any { it.contains(h.playerSpawn.x, h.playerSpawn.z) }) { "${h.id}: spawn is not walkable" }
            check(h.obstacles.none { it.contains(h.playerSpawn.x, h.playerSpawn.z) }) { "${h.id}: spawn is inside an obstacle" }
            for (f in h.fishingSpots) {
                check(h.zonesById[f.zone]?.kind == ZoneKind.FISHING) { "${h.id}: '${f.zone}' is not a fishing zone" }
                f.species.forEach { s -> check(s in p.speciesById) { "${h.id}: unknown species '$s'" } }
            }
            for (s in h.stations) {
                check(s.machine in p.machinesById) { "${s.id}: unknown machine '${s.machine}'" }
                check(h.zonesById[s.inputZone]?.kind == ZoneKind.MACHINE_INPUT) { "${s.id}: bad input zone" }
                check(h.zonesById[s.outputZone]?.kind == ZoneKind.MACHINE_OUTPUT) { "${s.id}: bad output zone" }
            }
            fun open(x: Int, z: Int) = h.walkable.any { it.contains(x, z) } && h.obstacles.none { it.contains(x, z) }
            check(open(h.customerEntry.x, h.customerEntry.z)) { "${h.id}: customer entry is not on open walkable ground" }
            for (c in h.counters) {
                check(c.products.isNotEmpty()) { "${c.id}: needs at least one product" }
                c.products.forEach { pid -> check(pid in p.productsById) { "${c.id}: unknown product '$pid'" } }
                check(c.products.toSet().size == c.products.size) { "${c.id}: duplicate products" }
                check(h.zonesById[c.zone]?.kind == ZoneKind.COUNTER) { "${c.id}: bad counter zone" }
                for (i in 0 until c.maxQueue) {
                    val slot = c.queueSlot(i)
                    check(open(slot.x, slot.z)) { "${c.id}: queue slot $i is not on open walkable ground" }
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
}
