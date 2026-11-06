package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
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
    /** True when standing on an unlocked fishing spot with zero stock. */
    val fishingSpotEmpty: Boolean,
    /** Progress toward the next restocked fish when the current spot is regenerating. */
    val fishingRegenProgress: Float?,
    val context: ContextCard?,
    val stations: List<StationView>,
    val counters: List<CounterView>,
    val customersWaiting: Int,
    /** Every customer in the harbor, walking or queued, in queue order per counter. */
    val customers: List<CustomerView>,
    /** Where customers enter and leave (renderers walk departing customers back here). */
    val customerEntryXMm: Int,
    val customerEntryZMm: Int,
    /**
     * Approach waypoints between entry and the queue (presentation leave path uses
     * these in reverse). Empty when the approach is a straight line.
     */
    val customerPathWaypoints: List<PathPointView>,
    val tutorialText: String?,
    val upgrades: List<UpgradeView>,
    /** Non-null while a harbor rush window is active. */
    val rush: RushBannerView?,
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
    val typeId: String,
    val typeName: String,
    /** standard | premium | bulk */
    val kind: String,
    val preferredProductId: String?,
    val preferredProductName: String?,
    val preferenceMet: Boolean,
)

data class PlayerView(val xMm: Int, val zMm: Int, val facingX: Int, val facingZ: Int, val zoneId: String?)
data class ItemCount(val itemId: String, val name: String, val count: Int)
data class ContextCard(
    val title: String,
    val lines: List<String>,
    val progress: Float?,
    /** When set, HUD can cycle this station's preferred recipe. */
    val stationId: String? = null,
    /** Auto, or the locked recipe label. */
    val recipeModeLabel: String? = null,
)
data class StationView(
    val stationId: String,
    val status: MachineStatus,
    val inputCount: Int,
    val outputCount: Int,
    val progress: Float?,
    val statusText: String,
    val preferredRecipeId: String?,
    val nextRecipeId: String?,
)
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

data class RushBannerView(
    val rushId: String,
    val name: String,
    val ticksRemaining: Int,
)

data class PathPointView(val xMm: Int, val zMm: Int)

private fun Simulation.customerViews(): List<CustomerView> {
    return harbor.counters.flatMap { def ->
        state.customers.filter { it.counterId == def.id }.mapIndexed { index, c ->
            val slot = def.queueSlot(index)
            val path = CustomerSystem.approachPath(harbor, slot)
            val elapsed = (c.walkTicksTotal - c.walkTicksLeft).coerceAtLeast(0)
            val (x, z) = CustomerSystem.pointAlongPath(path, elapsed, c.walkTicksTotal)
            val type = content.customersById[c.typeId]
            val prefName = c.preferredProductId?.let { content.itemName(it) }
            CustomerView(
                c.id, def.id, index,
                x, z,
                c.arrived, c.wants, c.reserved,
                typeId = c.typeId,
                typeName = type?.name ?: c.typeId,
                kind = type?.kind?.wire ?: "standard",
                preferredProductId = c.preferredProductId,
                preferredProductName = prefName,
                preferenceMet = c.preferenceMet(),
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
        StationView(
            m.stationId, m.status, m.input.usedUnits(), m.output.usedUnits(), progress,
            statusText = ProductionSystem.statusText(m, c),
            preferredRecipeId = m.preferredRecipeId,
            nextRecipeId = ProductionSystem.nextStartable(c, m)?.id ?: m.activeBatch?.recipeId,
        )
    }

    val context: ContextCard? = when (zone?.kind) {
        ZoneKind.FISHING -> {
            val spotDef = harbor.fishingSpots.first { it.zone == zone.id }
            val spot = s.fishingSpots.first { it.zoneId == zone.id }
            val unlocked = FishingSystem.isUnlocked(spotDef, s)
            val full = p.bag.freeUnits() == 0
            val casting = p.fishingSpecies != null && p.fishingCatchTicks > 0
            val inWindow = casting && FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                c.player.timingWindowStartPermille, c.player.timingWindowEndPermille,
            )
            val empty = unlocked && spot.stock <= 0
            val lines = mutableListOf(
                when {
                    !unlocked -> {
                        val name = spotDef.requiresUpgrade?.let { c.upgradesById[it]?.name } ?: "an upgrade"
                        "Locked — buy $name"
                    }
                    full -> "Bag full - deliver your catch"
                    empty -> "Pier empty — fish are returning"
                    casting && inWindow && !p.reelAttemptedThisCast -> "Reel now for a bonus!"
                    else -> "Fishing..."
                },
                "Fish here: ${spot.stock}/${spotDef.stockMax}",
            )
            if (casting) lines += "Hooked: ${c.speciesById.getValue(p.fishingSpecies!!).name}"
            val regenNeeded = FishingSystem.regenTicksFor(spotDef, spot.stock, p.fishRegenPermille)
            val progress = when {
                casting -> p.fishingProgress.toFloat() / p.fishingCatchTicks
                unlocked && spot.stock < spotDef.stockMax -> spot.regenProgress.toFloat() / regenNeeded
                else -> null
            }
            ContextCard("Fishing spot", lines, progress)
        }
        ZoneKind.MACHINE_INPUT, ZoneKind.MACHINE_OUTPUT -> {
            val station = harbor.stations.first { it.inputZone == zone.id || it.outputZone == zone.id }
            val m = s.machines.first { it.stationId == station.id }
            val v = stationViews.first { it.stationId == station.id }
            val queue = ProductionSystem.queuedReady(c, m)
            val queuePreview = when {
                queue.isEmpty() -> "Queue: empty"
                else -> "Queue: " + queue.take(3).joinToString(" → ") { ProductionSystem.recipeLabel(it.id) } +
                    if (queue.size > 3) "…" else ""
            }
            val mode = m.preferredRecipeId?.let { ProductionSystem.recipeLabel(it) } ?: "Auto"
            ContextCard(
                title = c.machinesById.getValue(m.machineId).name,
                lines = listOf(
                    v.statusText,
                    "In: ${m.input.usedUnits()}/${m.input.capacityUnits}   Out: ${m.output.usedUnits()}/${m.output.capacityUnits}",
                    queuePreview,
                    "Recipe: $mode",
                ),
                progress = v.progress,
                stationId = m.stationId,
                recipeModeLabel = mode,
            )
        }
        ZoneKind.COUNTER -> {
            val def = harbor.counters.first { it.zone == zone.id }
            val counter = s.counters.first { it.counterId == def.id }
            val queued = s.customers.filter { it.counterId == def.id }
            val front = queued.firstOrNull { it.arrived }
            val label = def.products.joinToString(" / ") { c.productsById.getValue(it).name }
            val lines = mutableListOf(
                "Stock: ${counter.stock.usedUnits()}/${def.capacityUnits}",
                "Queue: ${queued.size}",
            )
            if (front != null) {
                val type = c.customersById[front.typeId]
                val who = type?.name ?: front.typeId
                val kindNote = when (type?.kind?.wire) {
                    "premium" -> " · tips well"
                    "bulk" -> " · bulk order"
                    else -> ""
                }
                val wantLabel = front.preferredProductId?.let { c.itemName(it) } ?: "anything"
                val subNote = when {
                    front.preferredProductId == null -> ""
                    front.reserved == 0 -> ""
                    front.preferenceMet() -> ""
                    else -> " · substituting"
                }
                lines += "Front: $who wants ${front.wants} $wantLabel$kindNote$subNote"
            }
            ContextCard(
                "$label counter",
                lines,
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
        fishingSpotEmpty = run {
            val z = zone ?: return@run false
            if (z.kind != ZoneKind.FISHING) return@run false
            val def = harbor.fishingSpots.first { it.zone == z.id }
            val spot = s.fishingSpots.first { it.zoneId == z.id }
            FishingSystem.isUnlocked(def, s) && spot.stock <= 0
        },
        fishingRegenProgress = run {
            val z = zone ?: return@run null
            if (z.kind != ZoneKind.FISHING) return@run null
            val def = harbor.fishingSpots.first { it.zone == z.id }
            val spot = s.fishingSpots.first { it.zoneId == z.id }
            if (!FishingSystem.isUnlocked(def, s) || spot.stock >= def.stockMax) return@run null
            val needed = FishingSystem.regenTicksFor(def, spot.stock, p.fishRegenPermille)
            spot.regenProgress.toFloat() / needed
        },
        context = context,
        stations = stationViews,
        counters = s.counters.map { ct ->
            CounterView(ct.counterId, ct.stock.usedUnits(), ct.stock.capacityUnits, s.customers.count { it.counterId == ct.counterId })
        },
        customersWaiting = s.customers.size,
        customers = customerViews(),
        customerEntryXMm = harbor.customerEntry.x,
        customerEntryZMm = harbor.customerEntry.z,
        customerPathWaypoints = harbor.customerPathWaypoints.map { PathPointView(it.x, it.z) },
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
        rush = CustomerSystem.activeRush(harbor, s.tick)?.let { r ->
            RushBannerView(r.id, r.name, CustomerSystem.ticksRemaining(r, s.tick))
        },
    )
}
