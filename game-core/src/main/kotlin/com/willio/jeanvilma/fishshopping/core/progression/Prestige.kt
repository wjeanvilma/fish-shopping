package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.PrestigeMilestoneDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Prestige-lite (Phase 20): permanent milestone bonuses and cosmetics without wiping
 * the save. Effects are rebuilt from [GameState.completedPrestige] on load.
 */
object PrestigeSystem {

    fun boardUnlocked(content: ContentPack, s: GameState): Boolean =
        content.prestige.requires.all {
            it in s.ownedUpgrades || it in s.completedQuests || it in s.completedPrestige
        }

    fun missingBoardRequirement(content: ContentPack, s: GameState): String? {
        val missing = content.prestige.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests && it !in s.completedPrestige
        } ?: return null
        return content.upgradesById[missing]?.name
            ?: content.questsById[missing]?.name
            ?: content.prestigeMilestonesById[missing]?.name
            ?: missing
    }

    fun requirementsMet(s: GameState, m: PrestigeMilestoneDef): Boolean =
        m.requires.all { it in s.ownedUpgrades || it in s.completedQuests || it in s.completedPrestige }

    fun missingRequirement(content: ContentPack, s: GameState, m: PrestigeMilestoneDef): String? {
        val missing = m.requires.firstOrNull {
            it !in s.ownedUpgrades && it !in s.completedQuests && it !in s.completedPrestige
        } ?: return null
        return content.upgradesById[missing]?.name
            ?: content.questsById[missing]?.name
            ?: content.prestigeMilestonesById[missing]?.name
            ?: missing
    }

    /** Harbor rating stars 0..5 from lifetime revenue vs content thresholds. */
    fun harborRating(content: ContentPack, s: GameState): Int {
        val revenue = s.stat(Stats.REVENUE)
        var stars = 0
        for (threshold in content.prestige.ratingThresholds) {
            if (revenue >= threshold) stars++ else break
        }
        return stars.coerceIn(0, 5)
    }

    fun step(ctx: StepContext) {
        if (!boardUnlocked(ctx.content, ctx.state)) return
        for (m in ctx.content.prestige.milestones) {
            if (m.id in ctx.state.completedPrestige) continue
            if (!requirementsMet(ctx.state, m)) continue
            if (ctx.state.stat(m.goal.stat) < m.goal.atLeast) continue
            complete(ctx, m)
        }
    }

    fun applyReward(s: GameState, m: PrestigeMilestoneDef) {
        val r = m.reward
        if (r.catchSpeedPermille > 0) {
            s.prestigeCatchSpeedPermille = maxOf(s.prestigeCatchSpeedPermille, r.catchSpeedPermille)
        }
        if (r.priceBonusPermille > 0) {
            s.prestigePriceBonusPermille = maxOf(s.prestigePriceBonusPermille, r.priceBonusPermille)
        }
        r.cosmetic?.let { s.unlockedCosmetics += it }
    }

    private fun complete(ctx: StepContext, m: PrestigeMilestoneDef) {
        val s = ctx.state
        s.completedPrestige += m.id
        s.bumpStat(Stats.PRESTIGE_COMPLETED)
        val reward = m.reward
        if (reward.coins > 0) {
            s.coins = SafeMath.creditCoins(s.coins, reward.coins)
            val receipt = Receipt(s.newId("prestige"), "prestige_reward", reward.coins, s.tick, m.id)
            s.record(receipt)
        }
        applyReward(s, m)
        ctx.emit(
            GameEvent.PrestigeUnlocked(
                s.tick, m.id, reward.coins, reward.cosmetic,
                catchSpeedPermille = reward.catchSpeedPermille,
                priceBonusPermille = reward.priceBonusPermille,
            ),
        )
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "prestige"))
    }
}
