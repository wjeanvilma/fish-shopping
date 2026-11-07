package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset

/**
 * Presentation-only frame timing (Phase 26 device matrix). Tracks EMA frame ms
 * and soft auto-downgrade when Android mid-tier 30 FPS budgets are missed.
 * Never touches the 20 Hz sim. Mirrors shared/perf/device-matrix.json (android).
 */
class FrameTiming(
    private val emaAlpha: Double = 0.08,
    private val downgradeStreak: Int = FRAME_DOWNGRADE_STREAK,
) {
    var emaFrameMs: Double = 0.0
        private set
    var lastFrameMs: Double = 0.0
        private set
    private var overStreak = 0

    fun reset() {
        emaFrameMs = 0.0
        lastFrameMs = 0.0
        overStreak = 0
    }

    /**
     * Sample one display frame. [dtSeconds] is clamped presentation dt.
     * Returns true when a soft quality downgrade should be applied.
     */
    fun sample(dtSeconds: Double, targetMs: Double): Boolean {
        val ms = maxOf(0.0, dtSeconds) * 1000.0
        lastFrameMs = ms
        emaFrameMs = if (emaFrameMs == 0.0) ms else emaFrameMs + (ms - emaFrameMs) * emaAlpha
        if (ms > targetMs * OVER_BUDGET_MULT) overStreak += 1 else overStreak = 0
        if (overStreak >= downgradeStreak) {
            overStreak = 0
            return true
        }
        return false
    }

    companion object {
        /** Android mid-tier: ~30 FPS for medium/high; low allows ~25 FPS. */
        fun targetMs(quality: QualityPreset): Double = when (quality) {
            QualityPreset.LOW -> 40.0
            QualityPreset.MEDIUM, QualityPreset.HIGH -> 33.3
        }

        /** ~1.5 s of sustained over-budget frames at 30 Hz. */
        const val FRAME_DOWNGRADE_STREAK = 45

        const val OVER_BUDGET_MULT = 1.15

        /** Harbor GLB LRU size (matches web / device-matrix.json). */
        const val HARBOR_CACHE_LIMIT = 2

        fun downgrade(quality: QualityPreset): QualityPreset = when (quality) {
            QualityPreset.HIGH -> QualityPreset.MEDIUM
            QualityPreset.MEDIUM -> QualityPreset.LOW
            QualityPreset.LOW -> QualityPreset.LOW
        }

        fun toPresenterQuality(quality: QualityPreset): PresenterQuality = when (quality) {
            QualityPreset.LOW -> PresenterQuality.LOW
            QualityPreset.MEDIUM -> PresenterQuality.MEDIUM
            QualityPreset.HIGH -> PresenterQuality.HIGH
        }
    }
}
