package com.willio.jeanvilma.fishshopping.core.contracts

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.ContractTemplateDef
import com.willio.jeanvilma.fishshopping.core.sim.ContractOffer
import com.willio.jeanvilma.fishshopping.core.sim.ContractState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.min

/**
 * Timed delivery contracts (Phase 17).
 *
 * Board posts weighted offers after [ContractsDef.requires] are met; accepting moves
 * an offer into active work. Deliver from the player bag; miss the deadline and pay
 * a penalty (capped by current coins).
 */
object ContractSystem {

    fun step(ctx: StepContext) {
        expireDeadlines(ctx)
        maybeRefreshBoard(ctx)
    }

    fun boardUnlocked(content: ContentPack, s: GameState): Boolean =
        content.contracts.requires.all { it in s.ownedUpgrades || it in s.completedQuests }

    fun missingBoardRequirement(content: ContentPack, s: GameState): String? {
        val missing = content.contracts.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests
        } ?: return null
        return content.upgradesById[missing]?.name ?: content.questsById[missing]?.name ?: missing
    }

    fun accept(ctx: StepContext, offerId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { existing ->
            ctx.emit(GameEvent.ContractAccepted(s.tick, existing.reference, offerId, existing, replayed = true))
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.ContractRejected(s.tick, offerId, requestId, reason))
        }
        if (!boardUnlocked(ctx.content, s)) {
            reject("Requires: ${missingBoardRequirement(ctx.content, s)}")
            return
        }
        val offer = s.contractOffers.firstOrNull { it.id == offerId }
        if (offer == null) {
            reject("Offer no longer available")
            return
        }
        if (s.activeContracts.size >= ctx.content.contracts.maxActive) {
            reject("Max ${ctx.content.contracts.maxActive} active contracts")
            return
        }
        s.contractOffers.removeAll { it.id == offerId }
        val contract = ContractState(
            id = s.newId("job"),
            templateId = offer.templateId,
            itemId = offer.itemId,
            quantity = offer.quantity,
            delivered = 0,
            deadlineTick = s.tick + offer.durationTicks,
            payout = offer.payout,
            penalty = offer.penalty,
        )
        s.activeContracts += contract
        val receipt = Receipt(s.newId("contract"), "contract_accept", 0, s.tick, contract.id)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.ContractAccepted(s.tick, contract.id, offerId, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "contract"))
    }

    fun deliver(ctx: StepContext, contractId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { existing ->
            ctx.emit(
                GameEvent.ContractDelivered(
                    s.tick, contractId, count = 0,
                    completed = existing.type == "contract_payout",
                    receipt = existing, replayed = true,
                ),
            )
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.ContractRejected(s.tick, contractId, requestId, reason))
        }
        val idx = s.activeContracts.indexOfFirst { it.id == contractId }
        if (idx < 0) {
            reject("Unknown contract")
            return
        }
        val c = s.activeContracts[idx]
        val need = c.quantity - c.delivered
        if (need <= 0) {
            reject("Already complete")
            return
        }
        val have = s.player.bag.available(c.itemId)
        if (have <= 0) {
            reject("Need ${ctx.content.itemName(c.itemId)} in your bag")
            return
        }
        val take = min(need, have)
        s.player.bag.remove(c.itemId, take)
        c.delivered += take
        s.bumpStat(Stats.CONTRACT_ITEMS_DELIVERED, take.toLong())
        if (c.delivered >= c.quantity) {
            s.activeContracts.removeAt(idx)
            s.coins = SafeMath.creditCoins(s.coins, c.payout)
            s.bumpStat(Stats.CONTRACTS_COMPLETED)
            s.bumpStat(Stats.CONTRACT_REVENUE, c.payout)
            val receipt = Receipt(s.newId("contract"), "contract_payout", c.payout, s.tick, c.id)
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.ContractDelivered(s.tick, c.id, take, completed = true, receipt = receipt, replayed = false))
            ctx.emit(GameEvent.ContractCompleted(s.tick, c.id, c.templateId, c.payout))
            ctx.emit(GameEvent.CheckpointRequested(s.tick, "contract"))
        } else {
            val receipt = Receipt(s.newId("contract"), "contract_deliver", 0, s.tick, "$contractId:$take")
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.ContractDelivered(s.tick, c.id, take, completed = false, receipt = receipt, replayed = false))
        }
    }

    private fun expireDeadlines(ctx: StepContext) {
        val s = ctx.state
        val expired = s.activeContracts.filter { s.tick >= it.deadlineTick }
        if (expired.isEmpty()) return
        s.activeContracts.removeAll(expired.toSet())
        for (c in expired) {
            val paid = min(c.penalty, s.coins)
            if (paid > 0) {
                s.coins -= paid
                val receipt = Receipt(s.newId("contract"), "contract_penalty", -paid, s.tick, c.id)
                s.record(receipt)
            }
            s.bumpStat(Stats.CONTRACTS_FAILED)
            ctx.emit(GameEvent.ContractFailed(s.tick, c.id, c.templateId, paid))
        }
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "contract"))
    }

    private fun maybeRefreshBoard(ctx: StepContext) {
        val s = ctx.state
        val def = ctx.content.contracts
        if (!boardUnlocked(ctx.content, s)) {
            s.contractOffers.clear()
            s.contractBoardRefreshAt = 0
            return
        }
        if (s.contractBoardRefreshAt == 0L) {
            refreshOffers(ctx)
            return
        }
        if (s.tick < s.contractBoardRefreshAt) return
        refreshOffers(ctx)
    }

    private fun refreshOffers(ctx: StepContext) {
        val s = ctx.state
        val def = ctx.content.contracts
        s.contractOffers.clear()
        val pool = def.templates.toMutableList()
        val slots = min(def.boardSlots, pool.size)
        repeat(slots) {
            if (pool.isEmpty()) return@repeat
            val idx = s.rng.pickWeighted(pool.map { it.weight })
            val t = pool.removeAt(idx)
            s.contractOffers += offerFrom(s, t)
        }
        s.contractBoardRefreshAt = s.tick + def.refreshPeriodTicks
        ctx.emit(GameEvent.ContractBoardRefreshed(s.tick, s.contractOffers.map { it.id }))
    }

    private fun offerFrom(s: GameState, t: ContractTemplateDef) = ContractOffer(
        id = s.newId("offer"),
        templateId = t.id,
        itemId = t.item,
        quantity = t.quantity,
        durationTicks = t.durationTicks,
        payout = t.payout,
        penalty = t.penalty,
    )
}
