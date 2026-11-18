package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.HarborDef
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem

/**
 * Phase 9 business dashboard: committed sales/revenue only (never wallet coins),
 * abandon + wage rates, session interval labels, and live bottlenecks.
 * Finish 2.0 Phase 18 adds daily streak / objectives.
 * Finish 4.0 Phase 20 adds cashflow / scarcity / reputation surfaces.
 */
object BusinessDashboard {

    fun build(
        content: ContentPack,
        state: GameState,
        bottlenecks: List<AutomationIssueView>,
        topSpecies: List<SpeciesCatchShareView>,
        harbor: HarborDef? = null,
    ): BusinessDashboardView {
        val tps = content.ticksPerSecond.coerceAtLeast(1)
        val sessionTicks = state.tick.coerceAtLeast(0L)
        val sessionSeconds = sessionTicks / tps
        val sales = state.stat(Stats.SALES)
        val itemsSold = state.stat(Stats.ITEMS_SOLD)
        val committedRevenue = state.stat(Stats.REVENUE)
        val contractRevenue = state.stat(Stats.CONTRACT_REVENUE)
        val lost = state.stat(Stats.LOST_CUSTOMERS)
        val wages = state.stat(Stats.WAGES_PAID)
        val maintenance = state.stat(Stats.MAINTENANCE_PAID)
        val repairs = state.stat(Stats.REPAIR_SPENT)
        val spoiled = state.stat(Stats.ITEMS_SPOILED)
        val loanInterest = state.stat(Stats.LOAN_INTEREST_ACCRUED)
        val loanCollected = state.stat(Stats.LOAN_COLLECTED)
        val operatingCosts = wages + maintenance + repairs
        val gross = committedRevenue + contractRevenue
        val minutes = sessionSeconds / 60L
        val revenuePerMinute = if (minutes > 0L) committedRevenue / minutes else 0L
        val salesPerMinute = if (minutes > 0L) sales / minutes else 0L
        val daily = DailyGoalsSystem.boardObjectives(content, state).map { o ->
            val progress = DailyGoalsSystem.progress(content, state, o)
            val complete = DailyGoalsSystem.isComplete(content, state, o)
            val claimed = DailyGoalsSystem.isClaimed(content, state, o)
            DailyGoalView(
                objectiveId = o.id,
                name = o.name,
                description = o.description,
                progress = progress,
                target = o.goal.atLeast,
                rewardCoins = DailyGoalsSystem.claimRewardCoins(content, state, o),
                complete = complete,
                claimed = claimed,
                claimEnabled = complete && !claimed,
            )
        }
        val scarcityTip = harbor?.let { activeScarcityTipPermille(content, state, it) } ?: 1000
        return BusinessDashboardView(
            sessionTicks = sessionTicks,
            sessionLabel = formatSession(sessionSeconds),
            rateIntervalLabel = if (minutes > 0L) "per min" else "awaiting 1m",
            salesCount = sales,
            itemsSold = itemsSold,
            committedRevenue = committedRevenue,
            contractRevenue = contractRevenue,
            lostCustomers = lost,
            abandonPermille = Telemetry.abandonPermille(state),
            wagesPaid = wages,
            wageRatioPermille = Telemetry.wageRatioPermille(state),
            revenuePerMinute = revenuePerMinute,
            salesPerMinute = salesPerMinute,
            topSpecies = topSpecies,
            bottlenecks = bottlenecks,
            empty = sales == 0L && lost == 0L && committedRevenue == 0L && contractRevenue == 0L && daily.isEmpty(),
            dailyLoginStreak = DailyGoalsSystem.streak(state),
            dailyGoals = daily,
            offlineJournalLines = emptyList(),
            maintenancePaid = maintenance,
            repairSpent = repairs,
            itemsSpoiled = spoiled,
            loanInterestAccrued = loanInterest,
            loanCollected = loanCollected,
            operatingCosts = operatingCosts,
            netOperatingProfit = gross - operatingCosts,
            activeScarcityTipPermille = scarcityTip,
            reputationScorePermille = ReputationSystem.scorePermille(content, state),
            reputationLabel = ReputationSystem.bandLabel(content, state),
        )
    }

    fun activeScarcityTipPermille(content: ContentPack, state: GameState, harbor: HarborDef): Int {
        var best = 1000
        for (cdef in harbor.counters) {
            if (!CustomerSystem.isUnlocked(cdef, state)) continue
            val counter = state.counters.firstOrNull { it.counterId == cdef.id } ?: continue
            val tip = CustomerSystem.scarcityPriceMultPermille(content, cdef, counter)
            if (tip > best) best = tip
        }
        return best
    }

    fun formatSession(totalSeconds: Long): String {
        val sec = totalSeconds.coerceAtLeast(0L)
        val h = sec / 3600L
        val m = (sec % 3600L) / 60L
        val s = sec % 60L
        return when {
            h > 0L -> "${h}h ${m}m"
            m > 0L -> "${m}m ${s}s"
            else -> "${s}s"
        }
    }
}
