package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.DayPartDef
import com.willio.jeanvilma.fishshopping.core.content.FishingSpotDef
import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.PlayerState
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.TimingTier

/**
 * Automatic fishing while standing in an unlocked fishing zone.
 * Catch speed upgrades shorten cast duration. Reel timing has Perfect / Good / Miss
 * tiers with distinct tip bonuses; timing_window upgrades widen the windows.
 * Spot stock uses a deplete/regen curve (empty spots restock slower) scaled by
 * fishRegenPermille and day-part ecology. Tide chart eases night penalties and
 * applies day-part catch-speed bonuses.
 */
object FishingSystem {
    const val TIDE_CHART_UPGRADE = "upgrade.tide_chart"

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
            p.fishingCatchTicks = catchTicksFor(effectiveCatchSpeed(ctx.content, ctx.state), pick.catchTicks)
            p.reelAttemptedThisCast = false
        }

        val species = ctx.content.speciesById.getValue(p.fishingSpecies!!)
        val duration = if (p.fishingCatchTicks > 0) {
            p.fishingCatchTicks
        } else {
            catchTicksFor(effectiveCatchSpeed(ctx.content, ctx.state), species.catchTicks)
        }
        p.fishingCatchTicks = duration

        var reelTier = TimingTier.MISS
        if (p.reelRequested) {
            p.reelRequested = false
            if (!p.reelAttemptedThisCast) {
                p.reelAttemptedThisCast = true
                reelTier = timingTierAt(p, p.fishingProgress, duration)
                if (reelTier != TimingTier.MISS) {
                    // Finish the cast immediately on a Good or Perfect reel.
                    p.fishingProgress = duration
                }
            }
        }

        if (reelTier == TimingTier.MISS) p.fishingProgress++
        if (p.fishingProgress < duration) return

        commitCatch(ctx, zone.id, spot.zoneId, species.id, reelTier)
        clearCast(p)
    }

    fun isUnlocked(def: FishingSpotDef, state: GameState): Boolean =
        def.requiresUpgrade == null || def.requiresUpgrade in state.ownedUpgrades

    fun hasTideChart(state: GameState): Boolean =
        TIDE_CHART_UPGRADE in state.ownedUpgrades || state.player.fishRegenPermille > 1000

    /** Current day-part from absolute sim tick. */
    fun dayPartAt(content: ContentPack, tick: Long): DayPartDef {
        val eco = content.ecology
        val phase = ((tick % eco.dayLengthTicks.toLong()) * 1000L / eco.dayLengthTicks.toLong()).toInt()
        return eco.parts.first { phase < it.endPermille }
    }

    /**
     * Spot regen duration multiplier for the current day-part.
     * Tide chart halves penalties above 1000 (slow night restock eases).
     */
    fun effectiveDayPartRegenMult(content: ContentPack, state: GameState, def: FishingSpotDef, part: DayPartDef): Int {
        var mult = def.dayPartRegenMultPermille[part.id] ?: part.regenMultPermille
        if (hasTideChart(state) && mult > 1000) {
            mult = 1000 + (mult - 1000) / 2
        }
        return mult.coerceAtLeast(1)
    }

    /** Player upgrades, prestige floors, and (with tide chart) day-part catch bonuses. */
    fun effectiveCatchSpeed(content: ContentPack, state: GameState): Int {
        val base = maxOf(state.player.catchSpeedPermille, state.prestigeCatchSpeedPermille)
        if (!hasTideChart(state)) return base
        val part = dayPartAt(content, state.tick)
        return ((base.toLong() * part.catchSpeedMultPermille) / 1000L).toInt().coerceAtLeast(1)
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

    /** Perfect > Good > Miss using the player's live (upgrade-widened) windows. */
    fun timingTierAt(player: PlayerState, progress: Int, duration: Int): TimingTier {
        if (duration <= 0) return TimingTier.MISS
        if (inTimingWindow(progress, duration, player.timingPerfectStartPermille, player.timingPerfectEndPermille)) {
            return TimingTier.PERFECT
        }
        if (inTimingWindow(progress, duration, player.timingWindowStartPermille, player.timingWindowEndPermille)) {
            return TimingTier.GOOD
        }
        return TimingTier.MISS
    }

    fun timingBonusPermille(content: ContentPack, tier: TimingTier): Int = when (tier) {
        TimingTier.PERFECT -> content.player.timingPerfectBonusPermille
        TimingTier.GOOD -> content.player.timingGoodBonusPermille
        TimingTier.MISS -> 0
    }

    /** Curve × day-part, then scale by fishRegenPermille. */
    fun regenTicksFor(
        def: FishingSpotDef,
        stock: Int,
        fishRegenPermille: Int,
        dayPartRegenMultPermille: Int = 1000,
    ): Int {
        require(fishRegenPermille > 0)
        require(dayPartRegenMultPermille > 0)
        val mult = curveMultPermille(def.regenCurvePermille, stock, def.stockMax)
        val base = (def.regenTicks.toLong() * mult) / 1000L
        val withDay = (base * dayPartRegenMultPermille) / 1000L
        return ((withDay * 1000L) / fishRegenPermille.toLong()).toInt().coerceAtLeast(1)
    }

    fun regenTicksFor(content: ContentPack, state: GameState, def: FishingSpotDef, stock: Int): Int {
        val part = dayPartAt(content, state.tick)
        val dayMult = effectiveDayPartRegenMult(content, state, def, part)
        return regenTicksFor(def, stock, state.player.fishRegenPermille, dayMult)
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
        timingTier: TimingTier,
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
            val bonusMult = timingBonusPermille(ctx.content, timingTier)
            var bonusCoins = 0L
            if (bonusMult > 0) {
                bonusCoins = (finalSpecies.baseValue * bonusMult.toLong()) / 1000L
                if (bonusCoins > 0) {
                    s.coins = SafeMath.creditCoins(s.coins, bonusCoins)
                    s.bumpStat(Stats.TIMING_BONUSES)
                    s.bumpStat(Stats.REVENUE, bonusCoins)
                }
                when (timingTier) {
                    TimingTier.PERFECT -> s.bumpStat(Stats.PERFECT_REELS)
                    TimingTier.GOOD -> s.bumpStat(Stats.GOOD_REELS)
                    TimingTier.MISS -> Unit
                }
            }
            val timingBonus = timingTier != TimingTier.MISS
            ctx.emit(
                GameEvent.FishCaught(
                    s.tick, finalSpecies.id, zoneId,
                    timingBonus = timingBonus, timingTier = timingTier, rareUpgrade = rare,
                ),
            )
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
            val needed = regenTicksFor(ctx.content, ctx.state, def, spot.stock)
            if (++spot.regenProgress >= needed) {
                spot.stock++
                spot.regenProgress = 0
            }
        }
    }
}
