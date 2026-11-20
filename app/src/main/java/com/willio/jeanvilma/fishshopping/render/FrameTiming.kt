package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset

/**
 * Presentation-only frame timing (Phase 26 device matrix).
 * Finish 4.0 Phase 27 — tighter streaks/mult + soft auto-upgrade toward requested preset.
 * Finish 5.0 Phase 27 — harbor LRU 4 for 12-harbor travel.
 * Never touches the 20 Hz sim. Mirrors shared/perf/device-matrix.json (android).
 */
enum class FrameBudgetAction {
    HOLD,
    DOWNGRADE,
    UPGRADE,
}

class FrameTiming(
    private val emaAlpha: Double = 0.08,
    private val downgradeStreak: Int = FRAME_DOWNGRADE_STREAK,
    private val upgradeStreak: Int = FRAME_UPGRADE_STREAK,
) {
    var emaFrameMs: Double = 0.0
        private set
    var lastFrameMs: Double = 0.0
        private set
    private var overStreak = 0
    private var underStreak = 0

    fun reset() {
        emaFrameMs = 0.0
        lastFrameMs = 0.0
        overStreak = 0
        underStreak = 0
    }

    /**
     * Sample one display frame. [dtSeconds] is clamped presentation dt.
     * Returns budget action for soft quality step (never exceeds caller-requested cap).
     */
    fun sample(dtSeconds: Double, targetMs: Double): FrameBudgetAction {
        val ms = maxOf(0.0, dtSeconds) * 1000.0
        lastFrameMs = ms
        emaFrameMs = if (emaFrameMs == 0.0) ms else emaFrameMs + (ms - emaFrameMs) * emaAlpha
        if (ms > targetMs * OVER_BUDGET_MULT) {
            overStreak += 1
            underStreak = 0
            if (overStreak >= downgradeStreak) {
                overStreak = 0
                return FrameBudgetAction.DOWNGRADE
            }
            return FrameBudgetAction.HOLD
        }
        overStreak = 0
        if (ms < targetMs * UNDER_BUDGET_MULT) {
            underStreak += 1
            if (underStreak >= upgradeStreak) {
                underStreak = 0
                return FrameBudgetAction.UPGRADE
            }
            return FrameBudgetAction.HOLD
        }
        underStreak = 0
        return FrameBudgetAction.HOLD
    }

    companion object {
        /** Android mid-tier: ~30 FPS for medium/high; low allows ~25 FPS. */
        fun targetMs(quality: QualityPreset): Double = when (quality) {
            QualityPreset.LOW -> 40.0
            QualityPreset.MEDIUM, QualityPreset.HIGH -> 33.3
        }

        /** ~1.33 s of sustained over-budget frames at 30 Hz (Finish 4.0 Phase 27). */
        const val FRAME_DOWNGRADE_STREAK = 40

        /** ~2 s of sustained under-budget frames before soft upgrade. */
        const val FRAME_UPGRADE_STREAK = 60

        const val OVER_BUDGET_MULT = 1.12
        const val UNDER_BUDGET_MULT = 0.85

        /** Harbor GLB LRU size (matches web / device-matrix.json). Finish 5.0 → 4. */
        /** Finish 6.0 Phase 28 — harbor GLB LRU for 14-harbor nest travel. */
        const val HARBOR_CACHE_LIMIT = 5

        fun downgrade(quality: QualityPreset): QualityPreset = when (quality) {
            QualityPreset.HIGH -> QualityPreset.MEDIUM
            QualityPreset.MEDIUM -> QualityPreset.LOW
            QualityPreset.LOW -> QualityPreset.LOW
        }

        fun upgrade(quality: QualityPreset): QualityPreset = when (quality) {
            QualityPreset.LOW -> QualityPreset.MEDIUM
            QualityPreset.MEDIUM -> QualityPreset.HIGH
            QualityPreset.HIGH -> QualityPreset.HIGH
        }

        fun toPresenterQuality(quality: QualityPreset): PresenterQuality = when (quality) {
            QualityPreset.LOW -> PresenterQuality.LOW
            QualityPreset.MEDIUM -> PresenterQuality.MEDIUM
            QualityPreset.HIGH -> PresenterQuality.HIGH
        }
    }
}
