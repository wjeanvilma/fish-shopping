package com.willio.jeanvilma.fishshopping.core.contracts

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.ContractTemplateDef
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.sim.ContractOffer
import com.willio.jeanvilma.fishshopping.core.sim.ContractState
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.max
import kotlin.math.min

/**
 * Timed delivery contracts with standing orders, festival gates, and Finish 2.0
 * Phase 17 Contracts 2.0: delivery chains, reputation-tier board gates/payouts,
 * and global failure-streak board pressure.
 *
 * Chain progress persists via the active [ContractState.templateId] (mid-chain
 * steps never post to the board). Failure streak lives in [Stats.CONTRACT_FAIL_STREAK].
 */
object ContractSystem {

    fun streakStatKey(templateId: String) = "stat.contract_standing_streak.$templateId"
    fun cooldownStatKey(templateId: String) = "stat.contract_standing_cd.$templateId"

    fun standingStreak(state: GameState, templateId: String): Int =
        state.stat(streakStatKey(templateId)).toInt().coerceAtLeast(0)

    fun standingCooldownUntil(state: GameState, templateId: String): Long =
        state.stat(cooldownStatKey(templateId))

    fun failStreak(state: GameState): Int =
        state.stat(Stats.CONTRACT_FAIL_STREAK).toInt().coerceAtLeast(0)

    fun scaleAmount(base: Long, escalatePermille: Int, streak: Int, maxStreak: Int): Long {
        val steps = min(streak.coerceAtLeast(0), maxStreak.coerceAtLeast(0))
        var value = base
        repeat(steps) {
            value = (value * escalatePermille.toLong()) / 1000L
        }
        return value
    }

    fun chainLength(content: ContentPack, chainId: String): Int =
        content.contracts.templates.count { it.chainId == chainId }

    fun nextChainTemplate(content: ContentPack, current: ContractTemplateDef): ContractTemplateDef? {
        val chainId = current.chainId ?: return null
        return content.contracts.templates
            .filter { it.chainId == chainId && it.chainStep == current.chainStep + 1 }
            .minByOrNull { it.id }
    }

    fun reputationPayoutMultPermille(content: ContentPack, state: GameState): Int {
        val table = content.contracts.reputationPayoutMultPermille
        if (table.isEmpty()) return 1000
        val band = ReputationSystem.band(content, state).coerceIn(0, table.lastIndex)
        return table[band]
    }

    fun offerWeight(content: ContentPack, state: GameState, t: ContractTemplateDef): Int {
        var weight = t.weight.toLong()
        val def = content.contracts
        if (failStreak(state) >= def.failStreakThreshold) {
            weight = (weight * def.failStreakOfferWeightMultPermille.toLong()) / 1000L
        }
        return max(1, weight.toInt())
    }

    fun effectiveBoardSlots(content: ContentPack, state: GameState): Int {
        val def = content.contracts
        var slots = def.boardSlots
        if (failStreak(state) >= def.failStreakThreshold) {
            slots -= def.failStreakBoardSlotPenalty
        }
        return slots.coerceAtLeast(1)
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
        val template = ctx.content.contractTemplatesById[offer.templateId]
        if (s.activeContracts.any { it.templateId == offer.templateId }) {
            reject("Already running that standing order")
            return
        }
        val chainId = template?.chainId
        if (chainId != null) {
            val runningChain = s.activeContracts.any { job ->
                ctx.content.contractTemplatesById[job.templateId]?.chainId == chainId
            }
            if (runningChain) {
                reject("Already running that delivery chain")
                return
            }
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
            s.stats[Stats.CONTRACT_FAIL_STREAK] = 0L
            val receipt = Receipt(s.newId("contract"), "contract_payout", payout, s.tick, c.id)
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.ContractDelivered(s.tick, c.id, take, completed = true, receipt = receipt, replayed = false))
            ctx.emit(GameEvent.ContractCompleted(s.tick, c.id, c.templateId, payout))
            val template = ctx.content.contractTemplatesById[c.templateId]
            when {
                template != null && template.isStanding -> refreshStandingJob(s, c, template)
                template != null && template.isChain -> advanceOrFinishChain(ctx, idx, c, template)
                else -> s.activeContracts.removeAt(idx)
            }
            ctx.emit(GameEvent.CheckpointRequested(s.tick, "contract"))
        } else {
            val receipt = Receipt(s.newId("contract"), "contract_deliver", 0, s.tick, "$contractId:$take")
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.ContractDelivered(s.tick, c.id, take, completed = false, receipt = receipt, replayed = false))
        }
    }

    private fun advanceOrFinishChain(
        ctx: StepContext,
        idx: Int,
        c: ContractState,
        template: ContractTemplateDef,
    ) {
        val s = ctx.state
        val next = nextChainTemplate(ctx.content, template)
        if (next == null) {
            s.bumpStat(Stats.CONTRACT_CHAINS_COMPLETED)
            s.activeContracts.removeAt(idx)
            return
        }
        val payoutMult = reputationPayoutMultPermille(ctx.content, s)
        val payout = (next.payout * payoutMult.toLong()) / 1000L
        s.activeContracts[idx] = ContractState(
            id = c.id,
            templateId = next.id,
            itemId = next.item,
            quantity = next.quantity,
            delivered = 0,
            deadlineTick = s.tick + next.durationTicks,
            payout = payout,
            penalty = next.penalty,
        )
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
            s.stats[Stats.CONTRACT_FAIL_STREAK] = failStreak(s) + 1L
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
        val activeChains = s.activeContracts.mapNotNull {
            ctx.content.contractTemplatesById[it.templateId]?.chainId
        }.toSet()
        val pool = def.templates.filter { t ->
            t.id !in activeTemplates &&
                (t.chainId == null || t.chainId !in activeChains) &&
                templateEligibleForBoard(ctx.content, s, t)
        }.toMutableList()
        val slots = min(effectiveBoardSlots(ctx.content, s), pool.size)
        repeat(slots) {
            if (pool.isEmpty()) return@repeat
            val idx = s.rng.pickWeighted(pool.map { offerWeight(ctx.content, s, it) })
            val t = pool.removeAt(idx)
            s.contractOffers += offerFrom(ctx.content, s, t)
        }
        s.contractBoardRefreshAt = s.tick + def.refreshPeriodTicks
        ctx.emit(GameEvent.ContractBoardRefreshed(s.tick, s.contractOffers.map { it.id }))
    }

    fun templateEligibleForBoard(
        content: ContentPack,
        s: GameState,
        t: ContractTemplateDef,
    ): Boolean {
        if (!t.isChainHead) return false
        t.requiresSeasonalEvent?.let { eventId ->
            val active = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.active(content, s.tick)
            if (active?.id != eventId) return false
        }
        t.requiresReputationBand?.let { minBand ->
            if (ReputationSystem.band(content, s) < minBand) return false
        }
        if (!t.isStanding) return true
        return s.tick >= standingCooldownUntil(s, t.id)
    }

    private fun offerFrom(content: ContentPack, s: GameState, t: ContractTemplateDef): ContractOffer {
        val streak = if (t.isStanding) standingStreak(s, t.id) else 0
        var payout = scaleAmount(t.payout, t.payoutEscalatePermille, streak, t.maxStreak)
        val repMult = reputationPayoutMultPermille(content, s)
        payout = (payout * repMult.toLong()) / 1000L
        return ContractOffer(
            id = s.newId("offer"),
            templateId = t.id,
            itemId = t.item,
            quantity = t.quantity,
            durationTicks = t.durationTicks,
            payout = payout,
            penalty = scaleAmount(t.penalty, t.penaltyEscalatePermille, streak, t.maxStreak),
        )
    }
}
