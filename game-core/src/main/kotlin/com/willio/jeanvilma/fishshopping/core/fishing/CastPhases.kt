package com.willio.jeanvilma.fishshopping.core.fishing

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.TimingTier

/**
 * Finish 5.0 Phase 2 — cast phase helpers (waiting → strike → fight).
 * Ephemeral overlay on fishing progress; no save-schema bump.
 */
enum class CastPhase {
    WAITING,
    STRIKE,
    FIGHT,
}

object CastPhases {
    const val WAITING_END_PERMILLE = 400
    const val STRIKE_END_PERMILLE = 580
    const val STRIKE_WIDEN_CAP_PERMILLE = 80

    fun strikeWidenPermille(content: ContentPack, state: GameState): Int {
        val w = MasterySystem.timingWindows(content, state)
        val width = (w.perfectEnd - w.perfectStart).coerceAtLeast(0)
        return (width / 2).coerceAtMost(STRIKE_WIDEN_CAP_PERMILLE)
    }

    fun strikeEndPermille(content: ContentPack, state: GameState): Int =
        (STRIKE_END_PERMILLE + strikeWidenPermille(content, state)).coerceAtMost(900)

    fun phaseAt(
        progress: Int,
        duration: Int,
        content: ContentPack,
        state: GameState,
    ): CastPhase {
        if (duration <= 0 || progress < 0) return CastPhase.WAITING
        val permille = (progress * 1000) / duration
        return when {
            permille < WAITING_END_PERMILLE -> CastPhase.WAITING
            permille < strikeEndPermille(content, state) -> CastPhase.STRIKE
            else -> CastPhase.FIGHT
        }
    }

    fun strikeXpMultPermille(phase: CastPhase, timingTier: TimingTier): Int {
        if (phase != CastPhase.STRIKE) return 1000
        return when (timingTier) {
            TimingTier.PERFECT -> 1250
            TimingTier.GOOD -> 1100
            TimingTier.MISS -> 1000
        }
    }

    fun wireName(phase: CastPhase): String = when (phase) {
        CastPhase.WAITING -> "waiting"
        CastPhase.STRIKE -> "strike"
        CastPhase.FIGHT -> "fight"
    }
}
