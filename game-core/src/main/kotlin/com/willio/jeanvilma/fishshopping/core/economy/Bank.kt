package com.willio.jeanvilma.fishshopping.core.economy

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.min

/**
 * Phase 26 pier bank: one short-term loan (interest baked into repay amount) and
 * player-set coin goals. Overdue loans auto-collect on a content period.
 */
object BankSystem {

    fun unlocked(content: ContentPack, s: GameState): Boolean =
        content.bank.requires.all { it in s.ownedUpgrades || it in s.completedQuests }

    fun missingRequirement(content: ContentPack, s: GameState): String? {
        val missing = content.bank.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests
        } ?: return null
        return content.upgradesById[missing]?.name
            ?: content.questsById[missing]?.name
            ?: missing
    }

    fun hasLoan(s: GameState): Boolean = s.loanOwed > 0L

    fun overdue(s: GameState): Boolean = hasLoan(s) && s.tick >= s.loanDueTick

    fun ticksRemaining(s: GameState): Int {
        if (!hasLoan(s)) return 0
        return (s.loanDueTick - s.tick).toInt().coerceAtLeast(0)
    }

    fun repayAmount(content: ContentPack): Long = content.bank.repayAmount()

    fun step(ctx: StepContext) {
        checkCoinGoal(ctx)
        collectOverdue(ctx)
    }

    fun takeLoan(ctx: StepContext, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            ctx.emit(GameEvent.LoanTaken(s.tick, prior.coinDelta, s.loanOwed, s.loanDueTick, prior, replayed = true))
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.LoanRejected(s.tick, requestId, reason))
        }
        if (!unlocked(ctx.content, s)) {
            return reject("Requires: ${missingRequirement(ctx.content, s)}")
        }
        if (hasLoan(s)) return reject("Loan already outstanding")
        val principal = ctx.content.bank.loanPrincipal
        val owed = repayAmount(ctx.content)
        s.coins += principal
        s.loanOwed = owed
        s.loanDueTick = s.tick + ctx.content.bank.termTicks
        s.loanCollectionAccrualTicks = 0
        s.bumpStat(Stats.LOANS_TAKEN)
        val interest = owed - principal
        if (interest > 0L) s.bumpStat(Stats.LOAN_INTEREST_ACCRUED, interest)
        val receipt = Receipt(s.newId("receipt"), "loan", principal, s.tick, requestId)
        s.purchaseReceipts[requestId] = receipt
        s.record(receipt)
        ctx.emit(GameEvent.LoanTaken(s.tick, principal, owed, s.loanDueTick, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "purchase"))
    }

    fun repayLoan(ctx: StepContext, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            ctx.emit(
                GameEvent.LoanRepaid(
                    s.tick,
                    -prior.coinDelta,
                    remaining = s.loanOwed,
                    receipt = prior,
                    replayed = true,
                ),
            )
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.LoanRejected(s.tick, requestId, reason))
        }
        if (!hasLoan(s)) return reject("No loan to repay")
        if (s.coins <= 0L) return reject("Need coins to repay")
        val paid = min(s.loanOwed, s.coins)
        s.coins -= paid
        s.loanOwed -= paid
        if (s.loanOwed <= 0L) {
            s.loanOwed = 0
            s.loanDueTick = 0
            s.loanCollectionAccrualTicks = 0
        }
        s.bumpStat(Stats.LOAN_REPAID, paid)
        val receipt = Receipt(s.newId("receipt"), "loan_repay", -paid, s.tick, requestId)
        s.purchaseReceipts[requestId] = receipt
        s.record(receipt)
        ctx.emit(GameEvent.LoanRepaid(s.tick, paid, s.loanOwed, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "purchase"))
    }

    fun setCoinGoal(ctx: StepContext, amount: Long) {
        val s = ctx.state
        if (amount < 0L) return
        if (amount != 0L && amount !in ctx.content.bank.goalPresets) return
        val target = amount
        s.coinGoal = target
        val alreadyMet = target > 0L && s.coins >= target
        s.coinGoalCelebrated = alreadyMet
        ctx.emit(GameEvent.CoinGoalSet(s.tick, target))
        if (alreadyMet) {
            s.bumpStat(Stats.COIN_GOALS_REACHED)
            ctx.emit(GameEvent.CoinGoalReached(s.tick, target, s.coins))
        }
    }

    private fun checkCoinGoal(ctx: StepContext) {
        val s = ctx.state
        if (s.coinGoal <= 0L || s.coinGoalCelebrated) return
        if (s.coins < s.coinGoal) return
        s.coinGoalCelebrated = true
        s.bumpStat(Stats.COIN_GOALS_REACHED)
        ctx.emit(GameEvent.CoinGoalReached(s.tick, s.coinGoal, s.coins))
    }

    private fun collectOverdue(ctx: StepContext) {
        val s = ctx.state
        if (!overdue(s)) {
            s.loanCollectionAccrualTicks = 0
            return
        }
        val period = ctx.content.bank.collectionPeriodTicks
        s.loanCollectionAccrualTicks++
        if (s.loanCollectionAccrualTicks < period) return
        s.loanCollectionAccrualTicks = 0
        if (s.coins <= 0L || s.loanOwed <= 0L) return
        val seized = min(s.loanOwed, s.coins)
        s.coins -= seized
        s.loanOwed -= seized
        s.bumpStat(Stats.LOAN_COLLECTED, seized)
        if (s.loanOwed <= 0L) {
            s.loanOwed = 0
            s.loanDueTick = 0
        }
        val receipt = Receipt(s.newId("receipt"), "loan_collect", -seized, s.tick, "overdue")
        s.record(receipt)
        ctx.emit(GameEvent.LoanCollected(s.tick, seized, s.loanOwed))
    }
}
