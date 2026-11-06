package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.BaitDef
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.SpeciesDef
import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.min

/**
 * Pier bait consumables (Phase 9): kiosk purchases, preferred bait selection,
 * and catch-weight / rare-chance modifiers while a cast is active.
 */
object BaitSystem {

    fun requirementsMet(s: GameState, bait: BaitDef): Boolean =
        bait.requires.all { it in s.ownedUpgrades || it in s.completedQuests }

    fun missingRequirement(content: ContentPack, s: GameState, bait: BaitDef): String? {
        val missing = bait.requires.firstOrNull { it !in s.ownedUpgrades && it !in s.completedQuests } ?: return null
        return content.upgradesById[missing]?.name ?: content.questsById[missing]?.name ?: missing
    }

    fun resolveForCast(content: ContentPack, s: GameState): BaitDef? {
        val preferred = s.player.preferredBaitId
        if (preferred != null) {
            val def = content.baitById[preferred]
            if (def != null && s.player.bag.quantity(preferred) >= 1) return def
        }
        return content.bait.firstOrNull { s.player.bag.quantity(it.id) >= 1 }
    }

    fun effectiveWeight(species: SpeciesDef, bait: BaitDef?): Int {
        val base = species.rarityWeight
        if (bait == null || species.rareUpgrade == null) return base
        return ((base.toLong() * bait.rareSpeciesWeightMultPermille) / 1000L).toInt().coerceAtLeast(1)
    }

    fun rareChancePermille(baseChance: Int, bait: BaitDef?): Int {
        if (bait == null) return baseChance
        return (baseChance + bait.rareChanceBonusPermille).coerceIn(0, 1000)
    }

    fun select(s: GameState, content: ContentPack, baitId: String?) {
        if (baitId == null) {
            s.player.preferredBaitId = null
            return
        }
        if (baitId in content.baitById) s.player.preferredBaitId = baitId
    }

    fun buy(ctx: StepContext, baitId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { receipt ->
            ctx.emit(GameEvent.BaitPurchased(s.tick, baitId, quantity = 0, receipt = receipt, replayed = true))
            return
        }
        val zone = s.player.zoneId?.let { zid -> ctx.harbor.zonesById[zid] }
        if (zone == null || zone.kind != ZoneKind.KIOSK) {
            ctx.emit(GameEvent.BaitPurchaseRejected(s.tick, baitId, requestId, "Stand at the bait kiosk"))
            return
        }
        val bait = ctx.content.baitById[baitId]
        if (bait == null) {
            ctx.emit(GameEvent.BaitPurchaseRejected(s.tick, baitId, requestId, "Unknown bait"))
            return
        }
        if (!requirementsMet(s, bait)) {
            val miss = missingRequirement(ctx.content, s, bait) ?: "an unlock"
            ctx.emit(GameEvent.BaitPurchaseRejected(s.tick, baitId, requestId, "Requires: $miss"))
            return
        }
        if (s.coins < bait.cost) {
            ctx.emit(GameEvent.BaitPurchaseRejected(s.tick, baitId, requestId, "Need ${bait.cost - s.coins} more coins"))
            return
        }
        val room = s.player.bag.roomFor(bait.id)
        if (room < 1) {
            ctx.emit(GameEvent.BaitPurchaseRejected(s.tick, baitId, requestId, "Bag full"))
            return
        }
        val qty = min(bait.packQuantity, room)
        s.coins -= bait.cost
        s.player.bag.add(bait.id, qty)
        s.bumpStat(Stats.BAIT_BOUGHT, qty.toLong())
        if (s.player.preferredBaitId == null) s.player.preferredBaitId = bait.id
        val receipt = Receipt(s.newId("receipt"), "bait", -bait.cost, s.tick, requestId)
        s.purchaseReceipts[requestId] = receipt
        s.record(receipt)
        ctx.emit(GameEvent.BaitPurchased(s.tick, bait.id, qty, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "bait"))
    }
}
