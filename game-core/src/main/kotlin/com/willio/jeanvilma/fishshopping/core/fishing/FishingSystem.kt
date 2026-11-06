package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.FishingSpotDef
import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Automatic fishing while standing in an unlocked fishing zone.
 * Catch speed upgrades shorten cast duration. Reel in the timing window pays a bonus.
 * Spot stock uses a deplete/regen curve (empty spots restock slower) scaled by fishRegenPermille.
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

        if (!isUnlocked(spotDef, ctx.state)) {
            clearCast(p)
            p.reelRequested = false
            return
        }

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

    fun isUnlocked(def: FishingSpotDef, state: GameState): Boolean =
        def.requiresUpgrade == null || def.requiresUpgrade in state.ownedUpgrades

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

    /** Linear interpolation of [curve] across stock/stockMax, then scale by fishRegenPermille. */
    fun regenTicksFor(def: FishingSpotDef, stock: Int, fishRegenPermille: Int): Int {
        require(fishRegenPermille > 0)
        val mult = curveMultPermille(def.regenCurvePermille, stock, def.stockMax)
        val base = (def.regenTicks.toLong() * mult) / 1000L
        return ((base * 1000L) / fishRegenPermille.toLong()).toInt().coerceAtLeast(1)
    }

    fun curveMultPermille(curve: List<Int>, stock: Int, stockMax: Int): Int {
        require(curve.size >= 2)
        if (stockMax <= 0) return curve.first()
        val stockC = stock.coerceIn(0, stockMax)
        val t = (stockC.toLong() * 1000L) / stockMax.toLong() // 0..1000
        val last = curve.size - 1
        val scaled = t * last // 0 .. 1000*last
        val i0 = (scaled / 1000L).toInt().coerceIn(0, last - 1)
        val frac = (scaled % 1000L).toInt()
        val a = curve[i0]
        val b = curve[i0 + 1]
        return a + ((b - a) * frac) / 1000
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
            if (spot.stock == 0) {
                ctx.emit(GameEvent.FishingSpotDepleted(s.tick, zoneId))
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
            val needed = regenTicksFor(def, spot.stock, ctx.state.player.fishRegenPermille)
            if (++spot.regenProgress >= needed) {
                spot.stock++
                spot.regenProgress = 0
            }
        }
    }
}
