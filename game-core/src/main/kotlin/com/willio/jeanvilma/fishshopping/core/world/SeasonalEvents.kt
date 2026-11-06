package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.SeasonalEventDef
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlin.math.max

/**
 * Phase 24 content-driven seasonal overlays. Windows repeat on the sim clock
 * (no live server). Active events boost catch weights, unlock banner cosmetics,
 * and gate event-only contract templates.
 */
object SeasonalEventSystem {

    fun active(content: ContentPack, tick: Long): SeasonalEventDef? {
        if (tick <= 0L) return null
        for (e in content.seasonalEvents.events) {
            val phase = (tick % e.periodTicks.toLong()).toInt()
            if (phase >= e.startTick && phase < e.endTick) return e
        }
        return null
    }

    fun ticksRemaining(event: SeasonalEventDef, tick: Long): Int {
        val phase = (tick % event.periodTicks.toLong()).toInt()
        return (event.endTick - phase).coerceAtLeast(0)
    }

    fun speciesWeightMultPermille(content: ContentPack, tick: Long, speciesId: String): Int =
        active(content, tick)?.speciesWeightMultPermille?.get(speciesId) ?: 1000

    /** Scale a catch weight by the active seasonal species multiplier. */
    fun scaledWeight(base: Int, content: ContentPack, tick: Long, speciesId: String): Int {
        val mult = speciesWeightMultPermille(content, tick, speciesId)
        return max(1, ((base.toLong() * mult) / 1000L).toInt())
    }

    fun step(ctx: StepContext) {
        val s = ctx.state
        val cur = active(ctx.content, s.tick)
        val prev = if (s.tick <= 1L) null else active(ctx.content, s.tick - 1)
        if (prev?.id == cur?.id) return
        if (prev != null) {
            ctx.emit(GameEvent.SeasonalEventEnded(s.tick, prev.id, prev.name))
        }
        if (cur != null) {
            cur.banner?.let { s.unlockedCosmetics += it }
            ctx.emit(GameEvent.SeasonalEventStarted(s.tick, cur.id, cur.name))
        }
        // Re-roll the contract board so event templates appear/disappear promptly.
        if (s.contractBoardRefreshAt > 0L) {
            s.contractBoardRefreshAt = s.tick
        }
    }
}
