package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.DailyObjectiveDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.Prng
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.min

/**
 * Finish 2.0 Phase 18 — local daily objectives + login streak (no network).
 *
 * Wall clock is pushed in via [syncClock] (host boot / resume / Goals open).
 * Day id, streak, board slots, baselines, and claims live in [GameState.stats]
 * so schema stays 23.
 */
object DailyGoalsSystem {

    const val WALL_MS = "stat.daily_goals_wall_ms"
    const val DAY_ID = "stat.daily_goals_day_id"
    const val STREAK = Stats.DAILY_LOGIN_STREAK
    const val LAST_STREAK_DAY = "stat.daily_goals_last_streak_day"

    fun boardSlotKey(index: Int) = "stat.daily_board_$index"
    fun baselineKey(stat: String) = "stat.daily_baseline.$stat"
    fun claimedDayKey(objectiveId: String) = "stat.daily_claimed_day.$objectiveId"

    fun wallClockEpochMs(state: GameState): Long = state.stat(WALL_MS)

    fun dayId(content: ContentPack, epochMs: Long): Long {
        val len = content.dailyGoals.dayLengthMs.coerceAtLeast(1L)
        return (epochMs.coerceAtLeast(0L) / len)
    }

    fun currentDayId(content: ContentPack, state: GameState): Long {
        val wall = wallClockEpochMs(state)
        if (wall <= 0L) return state.stat(DAY_ID)
        return dayId(content, wall)
    }

    fun streak(state: GameState): Int = state.stat(STREAK).toInt().coerceAtLeast(0)

    fun boardObjectives(content: ContentPack, state: GameState): List<DailyObjectiveDef> {
        val out = mutableListOf<DailyObjectiveDef>()
        val slots = content.dailyGoals.boardSlots
        for (i in 0 until slots) {
            val idx = state.stat(boardSlotKey(i)).toInt() - 1
            if (idx in content.dailyGoals.objectives.indices) {
                out += content.dailyGoals.objectives[idx]
            }
        }
        return out
    }

    fun progress(content: ContentPack, state: GameState, objective: DailyObjectiveDef): Long {
        val baseline = state.stat(baselineKey(objective.goal.stat))
        return (state.stat(objective.goal.stat) - baseline).coerceAtLeast(0L)
    }

    fun isComplete(content: ContentPack, state: GameState, objective: DailyObjectiveDef): Boolean =
        progress(content, state, objective) >= objective.goal.atLeast

    fun isClaimed(content: ContentPack, state: GameState, objective: DailyObjectiveDef): Boolean {
        val day = currentDayId(content, state)
        if (day <= 0L) return false
        return state.stat(claimedDayKey(objective.id)) == day
    }

    fun claimRewardCoins(content: ContentPack, state: GameState, objective: DailyObjectiveDef): Long {
        val streakBonus = min(streak(state), content.dailyGoals.maxStreakBonusDays)
            .toLong() * content.dailyGoals.streakBonusCoinsPerDay
        return objective.rewardCoins + streakBonus
    }

    /** Host wall-clock sync — rolls the local day, streak, board, and baselines. */
    fun syncClock(ctx: StepContext, epochMs: Long) {
        val s = ctx.state
        val clamped = epochMs.coerceAtLeast(0L)
        s.stats[WALL_MS] = clamped
        rolloverIfNeeded(ctx)
    }

    fun step(ctx: StepContext) {
        if (wallClockEpochMs(ctx.state) <= 0L) return
        rolloverIfNeeded(ctx)
    }

    fun claim(ctx: StepContext, objectiveId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { existing ->
            ctx.emit(
                GameEvent.DailyGoalClaimed(
                    s.tick, objectiveId, existing.coinDelta, streak(s), existing, replayed = true,
                ),
            )
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.DailyGoalRejected(s.tick, objectiveId, requestId, reason))
        }
        if (wallClockEpochMs(s) <= 0L) {
            reject("Wall clock not synced")
            return
        }
        rolloverIfNeeded(ctx)
        val objective = ctx.content.dailyObjectivesById[objectiveId]
        if (objective == null) {
            reject("Unknown daily objective")
            return
        }
        if (boardObjectives(ctx.content, s).none { it.id == objectiveId }) {
            reject("Not on today's board")
            return
        }
        if (isClaimed(ctx.content, s, objective)) {
            reject("Already claimed today")
            return
        }
        if (!isComplete(ctx.content, s, objective)) {
            reject("Objective not complete")
            return
        }
        val payout = claimRewardCoins(ctx.content, s, objective)
        val day = currentDayId(ctx.content, s)
        s.stats[claimedDayKey(objectiveId)] = day
        if (payout > 0L) {
            s.coins = SafeMath.creditCoins(s.coins, payout)
        }
        s.bumpStat(Stats.DAILY_GOALS_CLAIMED)
        val receipt = Receipt(s.newId("daily"), "daily_goal_reward", payout, s.tick, objectiveId)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.DailyGoalClaimed(s.tick, objectiveId, payout, streak(s), receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "daily_goal"))
    }

    fun journalLines(content: ContentPack, state: GameState, report: OfflineReport): List<String> {
        val lines = mutableListOf<String>()
        if (report.capped) {
            lines += "Away time hit the ${content.offline.capHours}h catch-up cap."
        }
        if (report.fishCaught > 0L) {
            lines += "Crew landed ${report.fishCaught} fish while you were out."
        }
        if (report.sales > 0L) {
            lines += "Counters rang up ${report.sales} sales offline."
        }
        if (report.workerFishCaught > 0L || report.workerItemsMoved > 0L) {
            lines += "Staff kept the harbor moving (catch ${report.workerFishCaught}, hauls ${report.workerItemsMoved})."
        }
        if (report.coinsDelta > 0L) {
            lines += "Harbor purse grew by ${report.coinsDelta} coins."
        } else if (report.coinsDelta < 0L) {
            lines += "Away-time upkeep cost ${-report.coinsDelta} coins."
        }
        val streak = streak(state)
        if (streak > 0) {
            lines += "Harbor streak: $streak day${if (streak == 1) "" else "s"}."
        }
        val board = boardObjectives(content, state)
        val claimable = board.count { isComplete(content, state, it) && !isClaimed(content, state, it) }
        if (claimable > 0) {
            lines += "$claimable daily objective${if (claimable == 1) "" else "s"} ready to claim."
        }
        if (lines.isEmpty() && report.hadActivity) {
            lines += "Harbor kept a quiet watch while you were away."
        }
        return lines
    }

    private fun rolloverIfNeeded(ctx: StepContext) {
        val s = ctx.state
        val content = ctx.content
        val wall = wallClockEpochMs(s)
        if (wall <= 0L) return
        val newDay = dayId(content, wall)
        val oldDay = s.stat(DAY_ID)
        if (oldDay == newDay && boardObjectives(content, s).isNotEmpty()) return

        val previousStreakDay = s.stat(LAST_STREAK_DAY)
        val nextStreak = when {
            previousStreakDay <= 0L -> 1L
            previousStreakDay == newDay -> streak(s).toLong().coerceAtLeast(1L)
            previousStreakDay == newDay - 1L -> streak(s).toLong() + 1L
            else -> 1L
        }
        s.stats[DAY_ID] = newDay
        s.stats[STREAK] = nextStreak
        s.stats[LAST_STREAK_DAY] = newDay

        for (stat in content.dailyGoals.objectives.map { it.goal.stat }.toSet()) {
            s.stats[baselineKey(stat)] = s.stat(stat)
        }
        refreshBoard(content, s, newDay)
        if (oldDay != 0L && oldDay != newDay) {
            ctx.emit(GameEvent.DailyGoalsRolled(s.tick, newDay, nextStreak.toInt()))
        }
    }

    private fun refreshBoard(content: ContentPack, state: GameState, day: Long) {
        val def = content.dailyGoals
        val pool = def.objectives.toMutableList()
        val rng = Prng((day xor 0x5A1EDA11L).toInt())
        val slots = min(def.boardSlots, pool.size)
        for (i in 0 until def.boardSlots) {
            state.stats.remove(boardSlotKey(i))
        }
        for (i in 0 until slots) {
            if (pool.isEmpty()) break
            val idxInPool = rng.pickWeighted(pool.map { it.weight })
            val picked = pool.removeAt(idxInPool)
            val contentIndex = def.objectives.indexOfFirst { it.id == picked.id }
            if (contentIndex >= 0) {
                state.stats[boardSlotKey(i)] = (contentIndex + 1).toLong()
            }
        }
    }
}
