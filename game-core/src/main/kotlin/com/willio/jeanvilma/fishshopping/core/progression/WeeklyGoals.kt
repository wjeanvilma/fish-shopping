package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Prng
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.min

/**
 * Finish 5.0 Phase 19 — weekly retention objectives (stats-backed, no schema bump).
 *
 * Week id, board slots, baselines, and claims live in [GameState.stats].
 * Catalog: shared/content/weekly-retention.json (mirrored constants below).
 */
object WeeklyGoalsSystem {

    const val WEEK_ID = "stat.weekly_goals_week_id"
    const val CLAIMED = Stats.WEEKLY_GOALS_CLAIMED
    const val WEEK_LENGTH_DAYS = 7
    const val BOARD_SLOTS = 3
    const val WEEK_BONUS_COINS = 50L

    data class WeeklyObjectiveDef(
        val id: String,
        val name: String,
        val description: String,
        val goalStat: String,
        val atLeast: Long,
        val rewardCoins: Long,
        val weight: Int,
    )

    val OBJECTIVES: List<WeeklyObjectiveDef> = listOf(
        WeeklyObjectiveDef(
            "weekly.rival_week", "Rival week", "Beat 3 rival markets this week.",
            Stats.RIVAL_BEATS, 3, 90, 40,
        ),
        WeeklyObjectiveDef(
            "weekly.chain_week", "Chain week", "Complete 2 delivery chains this week.",
            Stats.CONTRACT_CHAINS_COMPLETED, 2, 100, 35,
        ),
        WeeklyObjectiveDef(
            "weekly.harbor_circuit", "Harbor circuit", "Travel between harbors 4 times this week.",
            Stats.HARBORS_TRAVELED, 4, 85, 35,
        ),
        WeeklyObjectiveDef(
            "weekly.quest_surge", "Quest surge", "Complete 5 quests this week.",
            Stats.QUESTS_COMPLETED, 5, 110, 30,
        ),
        WeeklyObjectiveDef(
            "weekly.nest_ember", "Nest ember week", "Earn 2 endgame sigils this week.",
            Stats.ENDGAME_SIGILS_EARNED, 2, 120, 28,
        ),
        WeeklyObjectiveDef(
            "weekly.saffron_circuit", "Saffron circuit", "Travel between harbors 6 times this week.",
            Stats.HARBORS_TRAVELED, 6, 115, 28,
        ),
    )

    fun boardSlotKey(index: Int) = "stat.weekly_board_$index"
    fun baselineKey(stat: String) = "stat.weekly_baseline.$stat"
    fun claimedWeekKey(objectiveId: String) = "stat.weekly_claimed_week.$objectiveId"

    fun weekId(content: ContentPack, state: GameState): Long {
        val day = DailyGoalsSystem.currentDayId(content, state)
        if (day <= 0L) return state.stat(WEEK_ID)
        return day / WEEK_LENGTH_DAYS.toLong().coerceAtLeast(1L)
    }

    fun boardObjectives(state: GameState): List<WeeklyObjectiveDef> {
        val out = mutableListOf<WeeklyObjectiveDef>()
        for (i in 0 until BOARD_SLOTS) {
            val idx = state.stat(boardSlotKey(i)).toInt() - 1
            if (idx in OBJECTIVES.indices) out += OBJECTIVES[idx]
        }
        return out
    }

    fun progress(state: GameState, objective: WeeklyObjectiveDef): Long {
        val baseline = state.stat(baselineKey(objective.goalStat))
        return (state.stat(objective.goalStat) - baseline).coerceAtLeast(0L)
    }

    fun isComplete(state: GameState, objective: WeeklyObjectiveDef): Boolean =
        progress(state, objective) >= objective.atLeast

    fun isClaimed(content: ContentPack, state: GameState, objective: WeeklyObjectiveDef): Boolean {
        val week = weekId(content, state)
        if (week <= 0L) return false
        return state.stat(claimedWeekKey(objective.id)) == week
    }

    fun claimRewardCoins(objective: WeeklyObjectiveDef): Long =
        objective.rewardCoins + WEEK_BONUS_COINS

    fun step(ctx: StepContext) {
        if (DailyGoalsSystem.wallClockEpochMs(ctx.state) <= 0L) return
        rolloverIfNeeded(ctx)
    }

    fun claim(ctx: StepContext, objectiveId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { existing ->
            ctx.emit(
                GameEvent.WeeklyGoalClaimed(
                    s.tick, objectiveId, existing.coinDelta, existing, replayed = true,
                ),
            )
            return
        }
        val reject = { reason: String ->
            ctx.emit(GameEvent.WeeklyGoalRejected(s.tick, objectiveId, requestId, reason))
        }
        if (DailyGoalsSystem.wallClockEpochMs(s) <= 0L) {
            reject("Wall clock not synced")
            return
        }
        rolloverIfNeeded(ctx)
        val objective = OBJECTIVES.firstOrNull { it.id == objectiveId }
        if (objective == null) {
            reject("Unknown weekly objective")
            return
        }
        if (boardObjectives(s).none { it.id == objectiveId }) {
            reject("Not on this week's board")
            return
        }
        if (isClaimed(ctx.content, s, objective)) {
            reject("Already claimed this week")
            return
        }
        if (!isComplete(s, objective)) {
            reject("Objective not complete")
            return
        }
        val payout = claimRewardCoins(objective)
        val week = weekId(ctx.content, s)
        s.stats[claimedWeekKey(objectiveId)] = week
        if (payout > 0L) s.coins = SafeMath.creditCoins(s.coins, payout)
        s.bumpStat(CLAIMED)
        val receipt = Receipt(s.newId("weekly"), "weekly_goal_reward", payout, s.tick, objectiveId)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.WeeklyGoalClaimed(s.tick, objectiveId, payout, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "weekly_goal"))
    }

    private fun rolloverIfNeeded(ctx: StepContext) {
        val s = ctx.state
        val content = ctx.content
        val newWeek = weekId(content, s)
        val oldWeek = s.stat(WEEK_ID)
        if (oldWeek == newWeek && boardObjectives(s).isNotEmpty()) return

        s.stats[WEEK_ID] = newWeek
        for (stat in OBJECTIVES.map { it.goalStat }.toSet()) {
            s.stats[baselineKey(stat)] = s.stat(stat)
        }
        refreshBoard(s, newWeek)
        if (oldWeek != 0L && oldWeek != newWeek) {
            ctx.emit(GameEvent.WeeklyGoalsRolled(s.tick, newWeek))
        }
    }

    private fun refreshBoard(state: GameState, week: Long) {
        val pool = OBJECTIVES.toMutableList()
        val rng = Prng((week xor 0x7EE7L).toInt())
        val slots = min(BOARD_SLOTS, pool.size)
        for (i in 0 until BOARD_SLOTS) {
            state.stats.remove(boardSlotKey(i))
        }
        for (i in 0 until slots) {
            if (pool.isEmpty()) break
            val idxInPool = rng.pickWeighted(pool.map { it.weight })
            val picked = pool.removeAt(idxInPool)
            val contentIndex = OBJECTIVES.indexOfFirst { it.id == picked.id }
            if (contentIndex >= 0) {
                state.stats[boardSlotKey(i)] = (contentIndex + 1).toLong()
            }
        }
    }
}
