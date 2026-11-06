package com.willio.jeanvilma.fishshopping.core.economy

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
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
 * counter/bag spoilage after [EconomyDef.requires] are met. Accrual is ephemeral
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

    fun maintenanceCoinsPerStation(content: ContentPack, s: GameState): Int =
        (content.economy.maintenanceCoinsPerStation - s.maintenanceDiscountPerStation).coerceAtLeast(0)

    fun bagFishSpoilPeriodTicks(content: ContentPack, s: GameState): Int {
        val base = content.economy.bagFishSpoilPeriodTicks.toLong()
        val scaled = SafeMath.multiply(base, s.bagSpoilPeriodMultPermille.toLong()) / 1000L
        return scaled.toInt().coerceAtLeast(1)
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

    fun step(ctx: StepContext) {
        if (!unlocked(ctx.content, ctx.state)) return
        accrueMaintenance(ctx)
        accrueCounterSpoil(ctx)
        accrueBagFishSpoil(ctx)
    }

    private fun accrueMaintenance(ctx: StepContext) {
        val s = ctx.state
        val eco = ctx.content.economy
        val rate = maintenanceCoinsPerStation(ctx.content, s)
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
