package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.SpeciesDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.TimingTier
import com.willio.jeanvilma.fishshopping.core.sim.TrophyRecord
import kotlin.math.max

/**
 * Museum / trophy board (Phase 10): roll specimen size on each successful catch,
 * keep personal bests per species, and mark curated sets complete for prestige.
 */
object TrophySystem {
    /** Good reel size bump (permille points added before clamp). */
    const val GOOD_SIZE_BONUS = 50
    /** Perfect reel size bump (permille points added before clamp). */
    const val PERFECT_SIZE_BONUS = 100

    fun sizeBonusFor(tier: TimingTier): Int = when (tier) {
        TimingTier.PERFECT -> PERFECT_SIZE_BONUS
        TimingTier.GOOD -> GOOD_SIZE_BONUS
        TimingTier.MISS -> 0
    }

    fun rollSizePermille(content: ContentPack, state: GameState, timingTier: TimingTier): Int {
        val min = content.trophies.sizeMinPermille
        val max = content.trophies.sizeMaxPermille
        val span = max - min + 1
        val raw = min + state.rng.nextBelow(span) + sizeBonusFor(timingTier)
        return raw.coerceIn(min, max)
    }

    fun valueCoins(species: SpeciesDef, sizePermille: Int): Long =
        max(1L, (species.baseValue * sizePermille.toLong()) / 1000L)

    /**
     * Record a catch on the trophy board. Returns the rolled size/value and whether
     * it replaced the previous personal best.
     */
    fun record(
        ctx: StepContext,
        speciesId: String,
        timingTier: TimingTier = TimingTier.MISS,
    ): Triple<Int, Long, Boolean> {
        val content = ctx.content
        val s = ctx.state
        val species = content.speciesById[speciesId] ?: return Triple(0, 0L, false)
        val size = rollSizePermille(content, s, timingTier)
        val value = valueCoins(species, size)
        val prior = s.trophies[speciesId]
        val isBest = prior == null || size > prior.sizePermille ||
            (size == prior.sizePermille && value > prior.valueCoins)
        if (!isBest) return Triple(size, value, false)

        val firstOfSpecies = prior == null
        s.trophies[speciesId] = TrophyRecord(sizePermille = size, valueCoins = value, tick = s.tick)
        s.bumpStat(Stats.TROPHY_RECORDS)
        if (firstOfSpecies) s.bumpStat(Stats.TROPHY_SPECIES)
        ctx.emit(
            GameEvent.TrophyRecorded(
                tick = s.tick,
                speciesId = speciesId,
                sizePermille = size,
                valueCoins = value,
                personalBest = true,
            ),
        )
        refreshSets(ctx)
        return Triple(size, value, true)
    }

    fun refreshSets(ctx: StepContext) {
        val content = ctx.content
        val s = ctx.state
        var completedNow = 0
        for (set in content.trophies.sets) {
            val done = set.species.all { it in s.trophies }
            val was = s.stat(set.completeStat) >= 1
            if (done && !was) {
                s.stats[set.completeStat] = 1L
                completedNow++
                ctx.emit(GameEvent.TrophySetCompleted(s.tick, set.id))
            } else if (done && was) {
                s.stats[set.completeStat] = 1L
            } else if (!done) {
                s.stats.remove(set.completeStat)
            }
        }
        if (completedNow > 0) {
            s.stats[Stats.TROPHY_SETS_COMPLETE] = content.trophies.sets.count { s.stat(it.completeStat) >= 1 }.toLong()
        } else {
            // Keep the aggregate in sync after load / partial fills.
            val n = content.trophies.sets.count { s.stat(it.completeStat) >= 1 }.toLong()
            if (n > 0 || s.stats.containsKey(Stats.TROPHY_SETS_COMPLETE)) {
                s.stats[Stats.TROPHY_SETS_COMPLETE] = n
            }
        }
    }

    /** Rebuild set completion stats after snapshot load (no events). */
    fun rebuildSetStats(content: ContentPack, s: GameState) {
        for (set in content.trophies.sets) {
            val done = set.species.all { it in s.trophies }
            if (done) s.stats[set.completeStat] = 1L else s.stats.remove(set.completeStat)
        }
        val n = content.trophies.sets.count { s.stat(it.completeStat) >= 1 }.toLong()
        if (n > 0) s.stats[Stats.TROPHY_SETS_COMPLETE] = n else s.stats.remove(Stats.TROPHY_SETS_COMPLETE)
        val speciesCount = s.trophies.size.toLong()
        if (speciesCount > 0) s.stats[Stats.TROPHY_SPECIES] = speciesCount
        else s.stats.remove(Stats.TROPHY_SPECIES)
    }
}
