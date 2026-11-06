package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem

/**
 * Immutable presentation snapshot built on the simulation thread and handed to
 * the HUD and renderer. Nothing here can mutate game state.
 */
data class SimView(
    val tick: Long,
    val coins: Long,
    val harborName: String,
    val player: PlayerView,
    val bag: List<ItemCount>,
    val bagUsedUnits: Int,
    val bagCapacityUnits: Int,
    val fishingProgress: Float?,
    /** True while casting and progress is inside the Reel timing window. */
    val fishingTimingWindow: Boolean,
    /** True while casting and the player can still attempt Reel. */
    val fishingCanReel: Boolean,
    val context: ContextCard?,
    val stations: List<StationView>,
    val counters: List<CounterView>,
    val customersWaiting: Int,
    /** Every customer in the harbor, walking or queued, in queue order per counter. */
    val customers: List<CustomerView>,
    /** Where customers enter and leave (renderers walk departing customers back here). */
    val customerEntryXMm: Int,
    val customerEntryZMm: Int,
    val tutorialText: String?,
    val upgrades: List<UpgradeView>,
)

/**
 * Presentation-only customer position: interpolated along the canonical walk, then the
 * customer's current queue slot (which moves forward as people ahead are served).
 */
data class CustomerView(
    val id: String,
    val counterId: String,
    val queueIndex: Int,
    val xMm: Float,
    val zMm: Float,
    val arrived: Boolean,
    val wants: Int,
    val reserved: Int,
)

data class PlayerView(val xMm: Int, val zMm: Int, val facingX: Int, val facingZ: Int, val zoneId: String?)
data class ItemCount(val itemId: String, val name: String, val count: Int)
data class ContextCard(val title: String, val lines: List<String>, val progress: Float?)
data class StationView(val stationId: String, val status: MachineStatus, val inputCount: Int, val outputCount: Int, val progress: Float?)
data class CounterView(val counterId: String, val stock: Int, val capacityUnits: Int, val queue: Int)

data class UpgradeView(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    val owned: Boolean,
    val purchasable: Boolean,
    val reason: String?,
)

private fun Simulation.customerViews(): List<CustomerView> {
    val entry = harbor.customerEntry
    return harbor.counters.flatMap { def ->
        state.customers.filter { it.counterId == def.id }.mapIndexed { index, c ->
            val slot = def.queueSlot(index)
            val t = if (c.walkTicksTotal == 0) 1f else 1f - c.walkTicksLeft.toFloat() / c.walkTicksTotal
            CustomerView(
                c.id, def.id, index,
                entry.x + (slot.x - entry.x) * t,
                entry.z + (slot.z - entry.z) * t,
                c.arrived, c.wants, c.reserved,
            )
        }
    }
}

fun Simulation.view(): SimView {
    val s = state
    val c = content
    val p = s.player
    val zone = p.zoneId?.let { harbor.zonesById[it] }

    val stationViews = s.machines.map { m ->
        val batch = m.activeBatch
        val progress = batch?.let { 1f - it.remainingTicks.toFloat() / it.durationTicks }
        StationView(m.stationId, m.status, m.input.usedUnits(), m.output.usedUnits(), progress)
    }

    val context: ContextCard? = when (zone?.kind) {
        ZoneKind.FISHING -> {
            val spot = s.fishingSpots.first { it.zoneId == zone.id }
            val full = p.bag.freeUnits() == 0
            val casting = p.fishingSpecies != null && p.fishingCatchTicks > 0
            val inWindow = casting && FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                c.player.timingWindowStartPermille, c.player.timingWindowEndPermille,
            )
            val lines = mutableListOf(
                when {
                    full -> "Bag full - deliver your catch"
                    casting && inWindow && !p.reelAttemptedThisCast -> "Reel now for a bonus!"
                    else -> "Fishing..."
                },
                "Fish here: ${spot.stock}",
            )
            if (casting) lines += "Hooked: ${c.speciesById.getValue(p.fishingSpecies!!).name}"
            ContextCard(
                "Fishing spot",
                lines,
                if (casting) p.fishingProgress.toFloat() / p.fishingCatchTicks else null,
            )
        }
        ZoneKind.MACHINE_INPUT, ZoneKind.MACHINE_OUTPUT -> {
            val station = harbor.stations.first { it.inputZone == zone.id || it.outputZone == zone.id }
            val m = s.machines.first { it.stationId == station.id }
            val v = stationViews.first { it.stationId == station.id }
            ContextCard(
                c.machinesById.getValue(m.machineId).name,
                listOf(
                    ProductionSystem.statusText(m),
                    "In: ${m.input.usedUnits()}/${m.input.capacityUnits}   Out: ${m.output.usedUnits()}/${m.output.capacityUnits}",
                ),
                v.progress,
            )
        }
        ZoneKind.COUNTER -> {
            val def = harbor.counters.first { it.zone == zone.id }
            val counter = s.counters.first { it.counterId == def.id }
            val queue = s.customers.count { it.counterId == def.id }
            val label = def.products.joinToString(" / ") { c.productsById.getValue(it).name }
            ContextCard(
                "$label counter",
                listOf(
                    "Stock: ${counter.stock.usedUnits()}/${def.capacityUnits}",
                    "Queue: $queue",
                ),
                if (counter.checkoutProgress > 0) counter.checkoutProgress.toFloat() / def.checkoutTicks else null,
            )
        }
        null -> null
    }

    return SimView(
        tick = s.tick,
        coins = s.coins,
        harborName = harbor.name,
        player = PlayerView(p.x, p.z, p.facingX, p.facingZ, p.zoneId),
        bag = p.bag.contents().map { (id, n) -> ItemCount(id, c.itemName(id), n) },
        bagUsedUnits = p.bag.usedUnits(),
        bagCapacityUnits = p.bag.capacityUnits,
        fishingProgress = p.fishingSpecies?.let {
            val dur = p.fishingCatchTicks.coerceAtLeast(1)
            p.fishingProgress.toFloat() / dur
        },
        fishingTimingWindow = p.fishingSpecies != null && p.fishingCatchTicks > 0 &&
            FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                c.player.timingWindowStartPermille, c.player.timingWindowEndPermille,
            ),
        fishingCanReel = p.fishingSpecies != null && !p.reelAttemptedThisCast,
        context = context,
        stations = stationViews,
        counters = s.counters.map { ct ->
            CounterView(ct.counterId, ct.stock.usedUnits(), ct.stock.capacityUnits, s.customers.count { it.counterId == ct.counterId })
        },
        customersWaiting = s.customers.size,
        customers = customerViews(),
        customerEntryXMm = harbor.customerEntry.x,
        customerEntryZMm = harbor.customerEntry.z,
        tutorialText = c.tutorial.getOrNull(s.tutorialIndex)?.text,
        upgrades = c.upgrades.map { u ->
            val a = UpgradeSystem.availability(c, s, u)
            UpgradeView(
                u.id, u.name, u.description, u.cost,
                owned = a is UpgradeSystem.Availability.Owned,
                purchasable = a is UpgradeSystem.Availability.Purchasable,
                reason = when (a) {
                    is UpgradeSystem.Availability.Locked -> a.reason
                    is UpgradeSystem.Availability.TooExpensive -> "Need ${a.missing} more coins"
                    else -> null
                },
            )
        },
    )
}
