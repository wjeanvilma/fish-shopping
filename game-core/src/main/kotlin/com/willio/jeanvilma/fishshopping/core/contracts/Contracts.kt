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
 * Timed delivery contracts (Phase 17) with standing orders (Phase 14).
 *
 * Board posts weighted offers after [ContractsDef.requires] are met; accepting moves
 * an offer into active work. Deliver from the player bag; miss the deadline and pay
 * a penalty (capped by current coins).
 *
 * Standing templates auto-refresh the same job after a successful delivery, escalating
 * payout/penalty by streak. Failures reset streak and apply a content cooldown before
 * the template can reappear on the board.
 */
object ContractSystem {

    fun streakStatKey(templateId: String) = "stat.contract_standing_streak.$templateId"
    fun cooldownStatKey(templateId: String) = "stat.contract_standing_cd.$templateId"

    fun standingStreak(state: GameState, templateId: String): Int =
        state.stat(streakStatKey(templateId)).toInt().coerceAtLeast(0)

    fun standingCooldownUntil(state: GameState, templateId: String): Long =
        state.stat(cooldownStatKey(templateId))

    fun scaleAmount(base: Long, escalatePermille: Int, streak: Int, maxStreak: Int): Long {
        val steps = min(streak.coerceAtLeast(0), maxStreak.coerceAtLeast(0))
        var value = base
        repeat(steps) {
            value = (value * escalatePermille.toLong()) / 1000L
        }
        return value
    }

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
        if (s.activeContracts.any { it.templateId == offer.templateId }) {
            reject("Already running that standing order")
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
            val payout = c.payout
            s.coins = SafeMath.creditCoins(s.coins, payout)
            s.bumpStat(Stats.CONTRACTS_COMPLETED)
            s.bumpStat(Stats.CONTRACT_REVENUE, payout)
            val receipt = Receipt(s.newId("contract"), "contract_payout", payout, s.tick, c.id)
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.ContractDelivered(s.tick, c.id, take, completed = true, receipt = receipt, replayed = false))
            ctx.emit(GameEvent.ContractCompleted(s.tick, c.id, c.templateId, payout))
            val template = ctx.content.contractTemplatesById[c.templateId]
            if (template != null && template.isStanding) {
                refreshStandingJob(s, c, template)
            } else {
                s.activeContracts.removeAt(idx)
            }
            ctx.emit(GameEvent.CheckpointRequested(s.tick, "contract"))
        } else {
            val receipt = Receipt(s.newId("contract"), "contract_deliver", 0, s.tick, "$contractId:$take")
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.ContractDelivered(s.tick, c.id, take, completed = false, receipt = receipt, replayed = false))
        }
    }

    private fun refreshStandingJob(s: GameState, c: ContractState, template: ContractTemplateDef) {
        val nextStreak = standingStreak(s, template.id) + 1
        s.stats[streakStatKey(template.id)] = nextStreak.toLong()
        c.delivered = 0
        c.deadlineTick = s.tick + template.durationTicks
        c.payout = scaleAmount(template.payout, template.payoutEscalatePermille, nextStreak, template.maxStreak)
        c.penalty = scaleAmount(template.penalty, template.penaltyEscalatePermille, nextStreak, template.maxStreak)
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
            val template = ctx.content.contractTemplatesById[c.templateId]
            if (template != null && template.isStanding) {
                s.stats[streakStatKey(template.id)] = 0L
                s.stats[cooldownStatKey(template.id)] = s.tick + template.failCooldownTicks.toLong()
            }
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
        val activeTemplates = s.activeContracts.map { it.templateId }.toSet()
        val pool = def.templates.filter { t ->
            t.id !in activeTemplates && templateEligibleForBoard(s, t)
        }.toMutableList()
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

    private fun templateEligibleForBoard(s: GameState, t: ContractTemplateDef): Boolean {
        if (!t.isStanding) return true
        return s.tick >= standingCooldownUntil(s, t.id)
    }

    private fun offerFrom(s: GameState, t: ContractTemplateDef): ContractOffer {
        val streak = if (t.isStanding) standingStreak(s, t.id) else 0
        return ContractOffer(
            id = s.newId("offer"),
            templateId = t.id,
            itemId = t.item,
            quantity = t.quantity,
            durationTicks = t.durationTicks,
            payout = scaleAmount(t.payout, t.payoutEscalatePermille, streak, t.maxStreak),
            penalty = scaleAmount(t.penalty, t.penaltyEscalatePermille, streak, t.maxStreak),
        )
    }
}
