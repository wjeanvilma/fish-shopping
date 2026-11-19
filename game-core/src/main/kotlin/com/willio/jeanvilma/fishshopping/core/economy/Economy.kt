package com.willio.jeanvilma.fishshopping.core.economy

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.min

/**
 * Soft economy sinks (Phase 19 / Phase 4 deepening): station upkeep and tiered
 * counter/bag spoilage after [EconomyDef.requires] are met. Phase 25 adds gated
 * machine wear (slowdowns / breaks) with coin repairs. Accrual is ephemeral
 * (not persisted), like wages. Separate ice upgrades scale bag vs counter periods.
 */
object EconomySystem {

    fun unlocked(content: ContentPack, s: GameState): Boolean =
        content.economy.requires.all { it in s.ownedUpgrades || it in s.completedQuests }

    fun missingRequirement(content: ContentPack, s: GameState): String? {
        val missing = content.economy.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests
        } ?: return null
        return content.upgradesById[missing]?.name
            ?: content.questsById[missing]?.name
            ?: missing
    }

    fun wearUnlocked(content: ContentPack, s: GameState): Boolean =
        content.economy.wear.requires.all { it in s.ownedUpgrades || it in s.completedQuests }

    fun wearMissingRequirement(content: ContentPack, s: GameState): String? {
        val missing = content.economy.wear.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests
        } ?: return null
        return content.upgradesById[missing]?.name
            ?: content.questsById[missing]?.name
            ?: missing
    }

    fun maintenanceCoinsPerStation(content: ContentPack, s: GameState, harbor: HarborDef): Int {
        val harborDisc = harbor.specialization?.maintenanceDiscountPerStation ?: 0
        return (content.economy.maintenanceCoinsPerStation - s.maintenanceDiscountPerStation - harborDisc)
            .coerceAtLeast(0)
    }

    /**
     * Mean spoil tier of raw fish in the bag, as permille (tier×1000).
     * Empty bag → 2000 (neutral tier-2 baseline).
     */
    fun meanBagSpoilTierPermille(content: ContentPack, s: GameState): Int {
        var weighted = 0L
        var units = 0L
        for ((id, qty) in s.player.bag.contents()) {
            if (id !in content.speciesById || qty <= 0) continue
            weighted += spoilTier(content, id).toLong() * qty
            units += qty
        }
        if (units <= 0L) return 2000
        return ((weighted * 1000L) / units).toInt()
    }

    /**
     * Finish 5.0 Phase 2 — bag spoil pressure from mean fish spoil tier.
     * 1000 = neutral (mean tier 2). Higher → shorter spoil period.
     */
    fun bagSpoilPressurePermille(content: ContentPack, s: GameState): Int {
        val mean = meanBagSpoilTierPermille(content, s)
        val delta = (mean - 2000) / 10
        return (1000 + delta).coerceIn(750, 1400)
    }

    fun bagFishSpoilPeriodTicks(content: ContentPack, s: GameState): Int {
        val base = content.economy.bagFishSpoilPeriodTicks.toLong()
        val iced = SafeMath.multiply(base, s.bagSpoilPeriodMultPermille.toLong()) / 1000L
        val pressure = bagSpoilPressurePermille(content, s).toLong().coerceAtLeast(1L)
        return ((iced * 1000L) / pressure).toInt().coerceAtLeast(1)
    }

    /** Ticks until the next bag fish spoil tick; null when spoilage inactive or bag empty of fish. */
    fun ticksUntilBagSpoil(content: ContentPack, s: GameState): Int? {
        if (!unlocked(content, s)) return null
        if (content.economy.bagFishSpoilUnits <= 0) return null
        var fishUnits = 0
        for ((id, qty) in s.player.bag.contents()) {
            if (id in content.speciesById) fishUnits += qty
        }
        if (fishUnits <= 0) return null
        val period = bagFishSpoilPeriodTicks(content, s)
        return (period - s.bagSpoilAccrualTicks).coerceAtLeast(0)
    }

    fun counterSpoilPeriodTicks(content: ContentPack, s: GameState): Int {
        val base = content.economy.counterSpoilPeriodTicks.toLong()
        val scaled = SafeMath.multiply(base, s.counterSpoilPeriodMultPermille.toLong()) / 1000L
        return scaled.toInt().coerceAtLeast(1)
    }

    fun spoilTier(content: ContentPack, itemId: String): Int =
        content.productsById[itemId]?.spoilTier
            ?: content.speciesById[itemId]?.spoilTier
            ?: 2

    fun isSlowed(m: com.willio.jeanvilma.fishshopping.core.sim.MachineState, tick: Long): Boolean =
        !m.broken && m.slowUntilTick > tick

    fun repairCost(content: ContentPack): Long = content.economy.wear.repairCoins

    fun needsRepair(m: com.willio.jeanvilma.fishshopping.core.sim.MachineState, tick: Long): Boolean =
        m.broken || isSlowed(m, tick)

    fun step(ctx: StepContext) {
        if (!unlocked(ctx.content, ctx.state)) return
        accrueMaintenance(ctx)
        accrueCounterSpoil(ctx)
        accrueBagFishSpoil(ctx)
        accrueWear(ctx)
    }

    fun repair(ctx: StepContext, stationId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            val machineId = s.machines.firstOrNull { it.stationId == stationId }?.machineId ?: ""
            ctx.emit(GameEvent.MachineRepaired(s.tick, stationId, machineId, prior, replayed = true))
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.MachineRepairRejected(s.tick, stationId, requestId, reason))
        }
        val m = s.machines.firstOrNull { it.stationId == stationId } ?: return reject("Unknown station")
        if (!needsRepair(m, s.tick)) return reject("Nothing to repair")
        val cost = repairCost(ctx.content)
        if (s.coins < cost) return reject("Need ${cost - s.coins} more coins")
        s.coins -= cost
        m.broken = false
        m.slowUntilTick = 0
        s.bumpStat(Stats.MACHINES_REPAIRED)
        if (cost > 0L) s.bumpStat(Stats.REPAIR_SPENT, cost)
        val receipt = Receipt(s.newId("receipt"), "repair", -cost, s.tick, requestId)
        s.purchaseReceipts[requestId] = receipt
        s.record(receipt)
        ctx.emit(GameEvent.MachineRepaired(s.tick, m.stationId, m.machineId, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "purchase"))
    }

    private fun accrueMaintenance(ctx: StepContext) {
        val s = ctx.state
        val eco = ctx.content.economy
        val rate = maintenanceCoinsPerStation(ctx.content, s, ctx.harbor)
        if (rate <= 0 || eco.maintenancePeriodTicks <= 0) return
        s.maintenanceAccrualTicks++
        if (s.maintenanceAccrualTicks < eco.maintenancePeriodTicks) return
        s.maintenanceAccrualTicks = 0
        val stations = ctx.harbor.stations.count {
            com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.isUnlocked(it, s)
        }
        if (stations <= 0) return
        val cost = rate.toLong() * stations
        val paid = min(cost, s.coins)
        if (paid <= 0L) return
        s.coins -= paid
        s.bumpStat(Stats.MAINTENANCE_PAID, paid)
        val receipt = Receipt(s.newId("maint"), "maintenance", -paid, s.tick, "stations:$stations")
        s.record(receipt)
        ctx.emit(GameEvent.MaintenancePaid(s.tick, stations, paid))
    }

    private fun accrueCounterSpoil(ctx: StepContext) {
        val s = ctx.state
        val eco = ctx.content.economy
        if (eco.counterSpoilUnits <= 0) return
        s.counterSpoilAccrualTicks++
        val period = counterSpoilPeriodTicks(ctx.content, s)
        if (s.counterSpoilAccrualTicks < period) return
        s.counterSpoilAccrualTicks = 0
        val lost = mutableListOf<ItemQuantity>()
        var remaining = eco.counterSpoilUnits
        for (counter in s.counters.sortedBy { it.counterId }) {
            if (remaining <= 0) break
            remaining = removeUnits(counter.stock, remaining, preferProducts = true, ctx.content, lost)
        }
        if (lost.isEmpty()) return
        val total = lost.sumOf { it.quantity }
        s.bumpStat(Stats.ITEMS_SPOILED, total.toLong())
        ctx.emit(GameEvent.ItemsSpoiled(s.tick, "counter", lost.toList()))
    }

    private fun accrueBagFishSpoil(ctx: StepContext) {
        val s = ctx.state
        val eco = ctx.content.economy
        if (eco.bagFishSpoilUnits <= 0) return
        s.bagSpoilAccrualTicks++
        val period = bagFishSpoilPeriodTicks(ctx.content, s)
        if (s.bagSpoilAccrualTicks < period) return
        s.bagSpoilAccrualTicks = 0
        val lost = mutableListOf<ItemQuantity>()
        removeUnits(s.player.bag, eco.bagFishSpoilUnits, preferProducts = false, ctx.content, lost)
        if (lost.isEmpty()) return
        val total = lost.sumOf { it.quantity }
        s.bumpStat(Stats.ITEMS_SPOILED, total.toLong())
        ctx.emit(GameEvent.ItemsSpoiled(s.tick, "bag", lost.toList()))
    }

    private fun accrueWear(ctx: StepContext) {
        if (!wearUnlocked(ctx.content, ctx.state)) return
        val s = ctx.state
        val wear = ctx.content.economy.wear
        if (wear.chancePermille <= 0) return
        s.wearAccrualTicks++
        if (s.wearAccrualTicks < wear.checkPeriodTicks) return
        s.wearAccrualTicks = 0
        val candidates = s.machines.filter { m ->
            val st = ctx.harbor.stations.firstOrNull { it.id == m.stationId } ?: return@filter false
            com.willio.jeanvilma.fishshopping.core.production.ProductionSystem.isUnlocked(st, s) &&
                !m.broken &&
                !isSlowed(m, s.tick)
        }
        if (candidates.isEmpty()) return
        // One roll per unlocked healthy machine each check period.
        for (m in candidates.sortedBy { it.stationId }) {
            if (s.rng.nextBelow(1000) >= wear.chancePermille) continue
            if (s.rng.nextBelow(1000) < wear.breakChancePermille) {
                m.broken = true
                m.slowUntilTick = 0
                s.bumpStat(Stats.MACHINES_BROKEN)
                ctx.emit(GameEvent.MachineBroke(s.tick, m.stationId, m.machineId))
            } else {
                m.slowUntilTick = s.tick + wear.slowDurationTicks
                s.bumpStat(Stats.MACHINES_SLOWED)
                ctx.emit(GameEvent.MachineSlowed(s.tick, m.stationId, m.machineId, m.slowUntilTick))
            }
        }
    }

    /**
     * Removes up to [units] from [inv]. When [preferProducts] is true, only products;
     * otherwise only species (raw fish). Higher spoil tiers first, then sorted ids.
     */
    private fun removeUnits(
        inv: Inventory,
        units: Int,
        preferProducts: Boolean,
        content: ContentPack,
        into: MutableList<ItemQuantity>,
    ): Int {
        var left = units
        val ids = inv.contents().keys
            .filter { id ->
                if (preferProducts) id in content.productsById else id in content.speciesById
            }
            .sortedWith(
                compareByDescending<String> { spoilTier(content, it) }
                    .thenBy { it },
            )
        for (id in ids) {
            if (left <= 0) break
            val have = inv.available(id)
            if (have <= 0) continue
            val take = min(have, left)
            inv.remove(id, take)
            into += ItemQuantity(id, take)
            left -= take
        }
        return left
    }
}
