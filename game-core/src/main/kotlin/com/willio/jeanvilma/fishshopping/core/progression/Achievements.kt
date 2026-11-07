package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.content.AchievementDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Finish 2.0 Phase 11 — content-driven achievements granted into
 * [com.willio.jeanvilma.fishshopping.core.sim.GameState.unlockedAchievements].
 */
object AchievementSystem {
    fun step(ctx: StepContext) {
        for (a in ctx.content.achievements.entries) {
            if (a.id in ctx.state.unlockedAchievements) continue
            if (ctx.state.stat(a.goal.stat) < a.goal.atLeast) continue
            unlock(ctx, a)
        }
    }

    private fun unlock(ctx: StepContext, a: AchievementDef) {
        val s = ctx.state
        s.unlockedAchievements += a.id
        s.bumpStat(Stats.ACHIEVEMENTS_UNLOCKED)
        if (a.rewardCoins > 0) {
            s.coins = SafeMath.creditCoins(s.coins, a.rewardCoins)
            s.record(Receipt(s.newId("achieve"), "achievement_reward", a.rewardCoins, s.tick, a.id))
        }
        ctx.emit(GameEvent.AchievementUnlocked(s.tick, a.id, a.rewardCoins))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "achievement"))
    }
}
