package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Automatic fishing while standing in a fishing zone (blueprint "Fishing flow").
 * Requires zone stock and free carry capacity. Zone stock replenishes predictably.
 *
 * Catch speed upgrades shorten cast duration. During a cast, [Command.Reel] in the
 * timing window finishes early and pays a coin bonus equal to the caught species'
 * base value. Rare upgrades may replace the rolled species at commit.
 */
object FishingSystem {
    fun step(ctx: StepContext) {
        regenerate(ctx)

        val p = ctx.state.player
        val zone = p.zoneId?.let { ctx.harbor.zonesById[it] }
        if (zone == null || zone.kind != ZoneKind.FISHING) {
            clearCast(p)
            p.reelRequested = false
            return
        }
        val spotDef = ctx.harbor.fishingSpots.first { it.zone == zone.id }
        val spot = ctx.state.fishingSpots.first { it.zoneId == zone.id }

        if (p.fishingSpecies == null) {
            if (spot.stock <= 0) {
                p.reelRequested = false
                return
            }
            // Only species that fit the bag are candidates, so a full bag never consumes a roll.
            val candidates = spotDef.species.map { ctx.content.speciesById.getValue(it) }
                .filter { p.bag.roomFor(it.id) >= 1 }
            if (candidates.isEmpty()) {
                p.reelRequested = false
                return
            }
            val pick = candidates[ctx.state.rng.pickWeighted(candidates.map { it.rarityWeight })]
            p.fishingSpecies = pick.id
            p.fishingProgress = 0
            p.fishingCatchTicks = catchTicksFor(p.catchSpeedPermille, pick.catchTicks)
            p.reelAttemptedThisCast = false
        }

        val species = ctx.content.speciesById.getValue(p.fishingSpecies!!)
        val duration = if (p.fishingCatchTicks > 0) p.fishingCatchTicks else catchTicksFor(p.catchSpeedPermille, species.catchTicks)
        p.fishingCatchTicks = duration

        var timingBonus = false
        if (p.reelRequested) {
            p.reelRequested = false
            if (!p.reelAttemptedThisCast) {
                p.reelAttemptedThisCast = true
                if (inTimingWindow(
                        p.fishingProgress, duration,
                        ctx.content.player.timingWindowStartPermille,
                        ctx.content.player.timingWindowEndPermille,
                    )
                ) {
                    timingBonus = true
                    // Finish the cast immediately on a perfect reel.
                    p.fishingProgress = duration
                }
            }
        }

        if (!timingBonus) p.fishingProgress++
        if (p.fishingProgress < duration) return

        commitCatch(ctx, zone.id, spot.zoneId, species.id, timingBonus)
        clearCast(p)
    }

    fun catchTicksFor(catchSpeedPermille: Int, baseCatchTicks: Int): Int {
        require(catchSpeedPermille > 0)
        val scaled = (baseCatchTicks.toLong() * 1000L) / catchSpeedPermille.toLong()
        return scaled.toInt().coerceAtLeast(1)
    }

    fun inTimingWindow(progress: Int, duration: Int, startPermille: Int, endPermille: Int): Boolean {
        if (duration <= 0) return false
        val permille = (progress.toLong() * 1000L) / duration.toLong()
        return permille >= startPermille && permille < endPermille
    }

    private fun commitCatch(
        ctx: StepContext,
        zoneId: String,
        spotZoneId: String,
        rolledSpeciesId: String,
        timingBonus: Boolean,
    ) {
        val s = ctx.state
        val p = s.player
        val spot = s.fishingSpots.first { it.zoneId == spotZoneId }
        val rolled = ctx.content.speciesById.getValue(rolledSpeciesId)

        // Rare upgrade roll happens at commit, then bag-fit is re-checked for the final species.
        var finalId = rolledSpeciesId
        var rare = false
        rolled.rareUpgrade?.let { ru ->
            if (s.rng.nextBelow(1000) < ru.chancePermille) {
                finalId = ru.to
                rare = true
            }
        }
        val finalSpecies = ctx.content.speciesById.getValue(finalId)

        if (p.bag.roomFor(finalSpecies.id) >= 1 && spot.stock > 0) {
            p.bag.add(finalSpecies.id, 1)
            spot.stock--
            s.bumpStat(Stats.FISH_CAUGHT)
            if (rare) s.bumpStat(Stats.RARE_CATCHES)
            var bonusCoins = 0L
            if (timingBonus) {
                bonusCoins = finalSpecies.baseValue
                s.coins = SafeMath.creditCoins(s.coins, bonusCoins)
                s.bumpStat(Stats.TIMING_BONUSES)
                s.bumpStat(Stats.REVENUE, bonusCoins)
            }
            ctx.emit(GameEvent.FishCaught(s.tick, finalSpecies.id, zoneId, timingBonus = timingBonus, rareUpgrade = rare))
            if (bonusCoins > 0) {
                s.record(
                    com.willio.jeanvilma.fishshopping.core.sim.Receipt(
                        s.newId("tip"), "timing_bonus", bonusCoins, s.tick, finalSpecies.id,
                    ),
                )
            }
        }
    }

    private fun clearCast(p: com.willio.jeanvilma.fishshopping.core.sim.PlayerState) {
        p.fishingSpecies = null
        p.fishingProgress = 0
        p.fishingCatchTicks = 0
        p.reelAttemptedThisCast = false
    }

    private fun regenerate(ctx: StepContext) {
        for (spot in ctx.state.fishingSpots) {
            val def = ctx.harbor.fishingSpots.first { it.zone == spot.zoneId }
            if (spot.stock >= def.stockMax) {
                spot.regenProgress = 0
                continue
            }
            if (++spot.regenProgress >= def.regenTicks) {
                spot.stock++
                spot.regenProgress = 0
            }
        }
    }
}
