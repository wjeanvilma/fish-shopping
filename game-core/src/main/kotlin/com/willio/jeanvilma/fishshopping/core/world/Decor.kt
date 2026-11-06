package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.DecorDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Phase 23 shop decor: buy-once placable cosmetics that add a tiny customer
 * patience buff. Banner-gated pieces reuse prestige cosmetic IDs.
 */
object DecorSystem {

    fun patienceBonusTicks(content: ContentPack, s: GameState): Int =
        content.decor.items.sumOf { d ->
            if (d.id in s.ownedDecor) d.patienceBonusTicks else 0
        }

    fun missingRequirement(content: ContentPack, s: GameState, def: DecorDef): String? {
        val cos = def.requiresCosmetic ?: return null
        if (cos in s.unlockedCosmetics) return null
        return content.prestige.milestones.firstOrNull { it.reward.cosmetic == cos }?.name ?: cos
    }

    fun availability(content: ContentPack, s: GameState, def: DecorDef): DecorAvailability {
        if (def.id in s.ownedDecor) return DecorAvailability.Owned
        missingRequirement(content, s, def)?.let { return DecorAvailability.Locked(it) }
        if (s.coins < def.cost) {
            return DecorAvailability.TooExpensive(def.cost - s.coins)
        }
        return DecorAvailability.Purchasable
    }

    fun purchase(ctx: StepContext, decorId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            ctx.emit(GameEvent.DecorPurchased(s.tick, decorId, prior, replayed = true))
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.DecorPurchaseRejected(s.tick, decorId, requestId, reason))
        }
        val def = ctx.content.decorById[decorId] ?: return reject("Unknown decor")
        when (val a = availability(ctx.content, s, def)) {
            DecorAvailability.Owned -> reject("Already owned")
            is DecorAvailability.Locked -> reject("Requires: ${a.reason}")
            is DecorAvailability.TooExpensive -> reject("Need ${a.missing} more coins")
            DecorAvailability.Purchasable -> {
                s.coins -= def.cost
                s.ownedDecor += def.id
                s.bumpStat(Stats.DECOR_BOUGHT)
                val receipt = Receipt(s.newId("receipt"), "decor", -def.cost, s.tick, requestId)
                s.purchaseReceipts[requestId] = receipt
                s.record(receipt)
                ctx.emit(GameEvent.DecorPurchased(s.tick, def.id, receipt, replayed = false))
                ctx.emit(GameEvent.CheckpointRequested(s.tick, "purchase"))
            }
        }
    }
}

sealed interface DecorAvailability {
    data object Owned : DecorAvailability
    data object Purchasable : DecorAvailability
    data class Locked(val reason: String) : DecorAvailability
    data class TooExpensive(val missing: Long) : DecorAvailability
}
