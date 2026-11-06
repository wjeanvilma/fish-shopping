package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset

/**
 * Presentation-only frame timing (Phase 29). Tracks EMA frame ms and a soft
 * auto-downgrade signal when mid-device targets are missed. Never touches the 20 Hz sim.
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
        if (ms > targetMs * 1.15) overStreak += 1 else overStreak = 0
        if (overStreak >= downgradeStreak) {
            overStreak = 0
            return true
        }
        return false
    }

    companion object {
        /** Mid-device frame-time targets (ms). Medium/high aim for ~60 Hz; low allows ~45 Hz. */
        fun targetMs(quality: QualityPreset): Double = when (quality) {
            QualityPreset.LOW -> 22.2
            QualityPreset.MEDIUM, QualityPreset.HIGH -> 16.7
        }

        const val FRAME_DOWNGRADE_STREAK = 90

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
