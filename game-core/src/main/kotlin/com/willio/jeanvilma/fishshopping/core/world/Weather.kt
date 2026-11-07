package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.TidePhaseDef
import com.willio.jeanvilma.fishshopping.core.content.WeatherPatternDef
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Finish 2.0 Phase 13 — deterministic weather cycle + tide phases that modify
 * catch speed, spot regen, customer crowds, and rare-upgrade odds.
 */
object WeatherSystem {

    fun weatherAt(content: ContentPack, tick: Long): WeatherPatternDef {
        val patterns = content.weather.patterns
        val total = patterns.sumOf { it.durationTicks.toLong() }.coerceAtLeast(1L)
        var t = ((tick % total) + total) % total
        for (p in patterns) {
            if (t < p.durationTicks) return p
            t -= p.durationTicks
        }
        return patterns.last()
    }

    fun tidePhaseAt(content: ContentPack, tick: Long): TidePhaseDef {
        val tide = content.weather.tide
        val phase = ((tick % tide.periodTicks.toLong()) * 1000L / tide.periodTicks.toLong()).toInt()
        return tide.phases.first { phase < it.endPermille }
    }

    fun ticksUntilWeatherChange(content: ContentPack, tick: Long): Int {
        val patterns = content.weather.patterns
        val total = patterns.sumOf { it.durationTicks.toLong() }.coerceAtLeast(1L)
        var t = ((tick % total) + total) % total
        for (p in patterns) {
            if (t < p.durationTicks) return (p.durationTicks - t).toInt().coerceAtLeast(1)
            t -= p.durationTicks
        }
        return patterns.last().durationTicks
    }

    fun ticksUntilTideChange(content: ContentPack, tick: Long): Int {
        val tide = content.weather.tide
        val period = tide.periodTicks.toLong()
        val phasePermille = ((tick % period) * 1000L / period).toInt()
        val current = tide.phases.first { phasePermille < it.endPermille }
        val endTickInPeriod = (current.endPermille.toLong() * period) / 1000L
        val pos = tick % period
        val left = endTickInPeriod - pos
        return left.coerceAtLeast(1L).toInt()
    }

    fun catchSpeedMultPermille(content: ContentPack, state: GameState): Int {
        val weather = weatherAt(content, state.tick)
        val tide = tideCatchMultPermille(content, state)
        return ((weather.catchSpeedMultPermille.toLong() * tide) / 1000L).toInt().coerceAtLeast(1)
    }

    fun regenMultPermille(content: ContentPack, state: GameState): Int {
        val weather = weatherAt(content, state.tick)
        var tide = tidePhaseAt(content, state.tick).regenMultPermille
        if (FishingSystem.hasTideChart(state) && tide > 1000) {
            val ease = content.weather.tide.chartRegenEasePermille
            tide = 1000 + (((tide - 1000).toLong() * (1000 - ease)) / 1000L).toInt()
        }
        return ((weather.regenMultPermille.toLong() * tide) / 1000L).toInt().coerceAtLeast(1)
    }

    fun customerSpawnMultPermille(content: ContentPack, state: GameState): Int {
        val weather = weatherAt(content, state.tick)
        var tide = tidePhaseAt(content, state.tick).customerSpawnMultPermille
        if (FishingSystem.hasTideChart(state)) {
            tide += content.weather.tide.chartCrowdBonusPermille
        }
        return ((weather.customerSpawnMultPermille.toLong() * tide) / 1000L).toInt().coerceAtLeast(1)
    }

    fun rareChanceBonusPermille(content: ContentPack, tick: Long): Int =
        weatherAt(content, tick).rareChanceBonusPermille

    private fun tideCatchMultPermille(content: ContentPack, state: GameState): Int {
        var mult = tidePhaseAt(content, state.tick).catchSpeedMultPermille
        if (FishingSystem.hasTideChart(state)) {
            mult += content.weather.tide.chartCatchBonusPermille
        }
        return mult.coerceAtLeast(1)
    }

    fun step(ctx: StepContext) {
        val tick = ctx.state.tick
        if (tick <= 0L) return
        val prevWeather = weatherAt(ctx.content, tick - 1)
        val curWeather = weatherAt(ctx.content, tick)
        if (prevWeather.id != curWeather.id) {
            ctx.emit(GameEvent.WeatherChanged(tick, curWeather.id, curWeather.name))
        }
        val prevTide = tidePhaseAt(ctx.content, tick - 1)
        val curTide = tidePhaseAt(ctx.content, tick)
        if (prevTide.id != curTide.id) {
            ctx.emit(GameEvent.TideChanged(tick, curTide.id, curTide.name))
        }
    }
}
