package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.MasteryTechniqueDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.TimingTier
import kotlin.math.max
import kotlin.math.min

/**
 * Finish 2.0 Phase 14 — per-species fishing mastery XP, rod techniques, coaching hooks.
 */
object MasterySystem {
    data class TimingWindows(
        val goodStart: Int,
        val goodEnd: Int,
        val perfectStart: Int,
        val perfectEnd: Int,
    )

    fun xpOf(state: GameState, speciesId: String): Int =
        state.speciesMasteryXp[speciesId] ?: 0

    fun levelOf(content: ContentPack, state: GameState, speciesId: String): Int =
        levelForXp(content, xpOf(state, speciesId))

    fun levelForXp(content: ContentPack, xp: Int): Int {
        val thresholds = content.fishingMastery.xpThresholds
        var level = 1
        for (i in thresholds.indices) {
            if (xp >= thresholds[i]) level = i + 1
            else break
        }
        return level.coerceIn(1, content.fishingMastery.maxLevel)
    }

    fun xpToNext(content: ContentPack, xp: Int): Int? {
        val thresholds = content.fishingMastery.xpThresholds
        val level = levelForXp(content, xp)
        if (level >= content.fishingMastery.maxLevel) return null
        return thresholds[level] - xp
    }

    /** Highest species mastery level on the save (gates techniques). */
    fun globalLevel(content: ContentPack, state: GameState): Int {
        if (state.speciesMasteryXp.isEmpty()) return 0
        return state.speciesMasteryXp.keys.maxOf { levelOf(content, state, it) }
    }

    fun technique(content: ContentPack, state: GameState): MasteryTechniqueDef {
        val active = state.activeTechniqueId
        if (active != null) {
            content.techniquesById[active]?.let { tech ->
                if (isUnlocked(content, state, tech)) return tech
            }
        }
        return content.fishingMastery.techniques.first { isUnlocked(content, state, it) }
    }

    fun isUnlocked(content: ContentPack, state: GameState, tech: MasteryTechniqueDef): Boolean =
        globalLevel(content, state) >= tech.requiresMasteryLevel

    fun select(state: GameState, content: ContentPack, techniqueId: String?) {
        if (techniqueId == null) {
            state.activeTechniqueId = null
            return
        }
        val tech = content.techniquesById[techniqueId] ?: return
        if (!isUnlocked(content, state, tech)) return
        state.activeTechniqueId = techniqueId
    }

    fun catchSpeedMultPermille(content: ContentPack, state: GameState, speciesId: String?): Int {
        val tech = technique(content, state)
        var mult = tech.catchSpeedMultPermille.toLong()
        if (speciesId != null) {
            val level = levelOf(content, state, speciesId)
            val per = content.fishingMastery.catchSpeedPermillePerLevel.toLong()
            mult = (mult * (1000L + per * (level - 1).toLong())) / 1000L
        }
        return mult.toInt().coerceAtLeast(1)
    }

    fun rareChanceBonusPermille(content: ContentPack, state: GameState, speciesId: String?): Int {
        val tech = technique(content, state)
        var bonus = tech.rareChanceBonusPermille
        if (speciesId != null) {
            val level = levelOf(content, state, speciesId)
            bonus += content.fishingMastery.rareChanceBonusPermillePerLevel * (level - 1)
        }
        return bonus.coerceIn(0, 1000)
    }

    fun timingWindows(content: ContentPack, state: GameState): TimingWindows {
        val p = state.player
        val tech = technique(content, state)
        var goodStart = (p.timingWindowStartPermille + tech.windowStartDeltaPermille).coerceIn(0, 999)
        var goodEnd = (p.timingWindowEndPermille + tech.windowEndDeltaPermille).coerceIn(1, 1000)
        if (goodStart >= goodEnd) {
            goodStart = p.timingWindowStartPermille
            goodEnd = p.timingWindowEndPermille
        }
        var perfectStart = (p.timingPerfectStartPermille + tech.perfectStartDeltaPermille).coerceIn(0, 999)
        var perfectEnd = (p.timingPerfectEndPermille + tech.perfectEndDeltaPermille).coerceIn(1, 1000)
        if (perfectStart >= perfectEnd) {
            perfectStart = p.timingPerfectStartPermille
            perfectEnd = p.timingPerfectEndPermille
        }
        perfectStart = max(perfectStart, goodStart)
        perfectEnd = min(perfectEnd, goodEnd)
        if (perfectStart >= perfectEnd) {
            perfectStart = p.timingPerfectStartPermille
            perfectEnd = p.timingPerfectEndPermille
        }
        return TimingWindows(goodStart, goodEnd, perfectStart, perfectEnd)
    }

    fun timingBonusPermille(content: ContentPack, state: GameState, tier: TimingTier): Int {
        val base = FishingSystem.timingBonusPermille(content, tier)
        if (tier != TimingTier.PERFECT) return base
        return base + technique(content, state).perfectBonusPermille
    }

    fun grantCatchXp(
        ctx: StepContext,
        speciesId: String,
        timingTier: TimingTier,
        rare: Boolean,
    ) {
        val s = ctx.state
        val m = ctx.content.fishingMastery
        var gain = m.xpCatch
        when (timingTier) {
            TimingTier.PERFECT -> gain += m.xpPerfectReel
            TimingTier.GOOD -> gain += m.xpGoodReel
            TimingTier.MISS -> Unit
        }
        if (rare) gain += m.xpRareCatch
        if (gain <= 0) return

        val before = xpOf(s, speciesId)
        val beforeLevel = levelForXp(ctx.content, before)
        val after = before + gain
        s.speciesMasteryXp[speciesId] = after
        s.bumpStat(Stats.MASTERY_XP, gain.toLong())
        val afterLevel = levelForXp(ctx.content, after)
        ctx.emit(GameEvent.MasteryXpGained(s.tick, speciesId, gain, after, afterLevel))
        if (afterLevel > beforeLevel) {
            s.bumpStat(Stats.MASTERY_LEVEL_UPS)
            ctx.emit(GameEvent.MasteryLevelUp(s.tick, speciesId, afterLevel))
        }
    }

    fun coachingTip(content: ContentPack, state: GameState): String? {
        val global = globalLevel(content, state)
        val maxSpecies = if (state.speciesMasteryXp.isEmpty()) 0
        else state.speciesMasteryXp.keys.maxOf { levelOf(content, state, it) }
        return content.fishingMastery.coachingTips
            .firstOrNull { tip ->
                global in tip.minGlobalLevel..tip.maxGlobalLevel && maxSpecies >= tip.minSpeciesLevel
            }
            ?.text
    }
}
