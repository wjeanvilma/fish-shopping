package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.EndgameChallengeDef
import com.willio.jeanvilma.fishshopping.core.content.EndgameTierDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.max

/**
 * Finish 3.0 Phase 15 / schema 24 — endgame deepen board.
 * Tiers + challenges unlock after prestige; bonuses rebuild from unlockedEndgameTiers.
 */
object EndgameSystem {
    fun boardUnlocked(content: ContentPack, s: GameState): Boolean =
        s.completedPrestige.size >= content.endgame.requiresPrestigeCount

    fun missingBoardRequirement(content: ContentPack, s: GameState): String? {
        if (boardUnlocked(content, s)) return null
        val need = content.endgame.requiresPrestigeCount
        return "Prestige milestones (${s.completedPrestige.size}/$need)"
    }

    fun tierRequirementsMet(s: GameState, tier: EndgameTierDef): Boolean =
        s.completedPrestige.size >= tier.requiresPrestigeCount &&
            s.beatenRivalIds.size >= tier.requiresRivalBeats &&
            s.completedEndgameChallenges.size >= tier.requiresChallenges

    fun step(ctx: StepContext) {
        if (!boardUnlocked(ctx.content, ctx.state)) return
        for (ch in ctx.content.endgame.challenges) {
            if (ch.id in ctx.state.completedEndgameChallenges) continue
            if (ctx.state.stat(ch.stat) < ch.atLeast) continue
            completeChallenge(ctx, ch)
        }
        for (tier in ctx.content.endgame.tiers) {
            if (tier.id in ctx.state.unlockedEndgameTiers) continue
            if (!tierRequirementsMet(ctx.state, tier)) continue
            unlockTier(ctx, tier)
        }
    }

    fun applyTierReward(s: GameState, tier: EndgameTierDef) {
        if (tier.catchSpeedPermille > 0) {
            s.endgameCatchSpeedPermille = max(s.endgameCatchSpeedPermille, tier.catchSpeedPermille)
        }
        if (tier.priceBonusPermille > 0) {
            s.endgamePriceBonusPermille = max(s.endgamePriceBonusPermille, tier.priceBonusPermille)
        }
    }

    private fun completeChallenge(ctx: StepContext, ch: EndgameChallengeDef) {
        val s = ctx.state
        s.completedEndgameChallenges += ch.id
        s.bumpStat(Stats.ENDGAME_CHALLENGES_COMPLETED)
        if (ch.rewardCoins > 0L) {
            s.coins = SafeMath.creditCoins(s.coins, ch.rewardCoins)
            s.record(
                Receipt(
                    id = s.newId("endgame_challenge"),
                    type = "endgame_challenge_reward",
                    coinDelta = ch.rewardCoins,
                    tick = s.tick,
                    reference = ch.id,
                ),
            )
        }
        ctx.emit(GameEvent.EndgameChallengeCompleted(s.tick, ch.id, ch.rewardCoins))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "endgame_challenge"))
    }

    private fun unlockTier(ctx: StepContext, tier: EndgameTierDef) {
        val s = ctx.state
        s.unlockedEndgameTiers += tier.id
        s.bumpStat(Stats.ENDGAME_TIERS_UNLOCKED)
        if (tier.coins > 0L) {
            s.coins = SafeMath.creditCoins(s.coins, tier.coins)
            s.record(
                Receipt(
                    id = s.newId("endgame_tier"),
                    type = "endgame_tier_reward",
                    coinDelta = tier.coins,
                    tick = s.tick,
                    reference = tier.id,
                ),
            )
        }
        applyTierReward(s, tier)
        ctx.emit(GameEvent.EndgameTierUnlocked(s.tick, tier.id, tier.coins))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "endgame_tier"))
    }
}
