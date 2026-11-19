package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import android.os.SystemClock

/**
 * Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness.
 * Presentation-only; never touches the 20 Hz sim. Mirrors web presenterCpuSnapshot.ts.
 */
enum class PresenterCpuStage {
    CROWD,
    FLY,
    BURST,
    LOCOMOTION,
    QUALITY_BIND,
    NEST_HUD,
}

data class PresenterCpuStageMs(
    val crowd: Double = 0.0,
    val fly: Double = 0.0,
    val burst: Double = 0.0,
    val locomotion: Double = 0.0,
    val qualityBind: Double = 0.0,
    val nestHud: Double = 0.0,
) {
    fun with(stage: PresenterCpuStage, ms: Double): PresenterCpuStageMs = when (stage) {
        PresenterCpuStage.CROWD -> copy(crowd = ms)
        PresenterCpuStage.FLY -> copy(fly = ms)
        PresenterCpuStage.BURST -> copy(burst = ms)
        PresenterCpuStage.LOCOMOTION -> copy(locomotion = ms)
        PresenterCpuStage.QUALITY_BIND -> copy(qualityBind = ms)
        PresenterCpuStage.NEST_HUD -> copy(nestHud = ms)
    }

    fun get(stage: PresenterCpuStage): Double = when (stage) {
        PresenterCpuStage.CROWD -> crowd
        PresenterCpuStage.FLY -> fly
        PresenterCpuStage.BURST -> burst
        PresenterCpuStage.LOCOMOTION -> locomotion
        PresenterCpuStage.QUALITY_BIND -> qualityBind
        PresenterCpuStage.NEST_HUD -> nestHud
    }
}

data class PresenterCpuCaps(
    val crowd: Int,
    val fly: Int,
    val burst: Int,
)

data class PresenterCpuSnapshot(
    val lastFrameMs: Double,
    val emaFrameMs: Double,
    val targetMs: Double,
    val overBudget: Boolean,
    val budgetAction: FrameBudgetAction,
    val quality: QualityPreset,
    val harborCacheLimit: Int,
    val sampleCount: Int,
    val stageMs: PresenterCpuStageMs,
    val caps: PresenterCpuCaps,
    val nestHudPressurePermille: Int,
)

object PresenterCpuSnapshots {
    val STAGES: List<PresenterCpuStage> = PresenterCpuStage.entries

    fun capsFor(quality: PresenterQuality): PresenterCpuCaps = PresenterCpuCaps(
        crowd = when (quality) {
            PresenterQuality.LOW -> 4
            PresenterQuality.MEDIUM -> 8
            PresenterQuality.HIGH -> 12
        },
        fly = flyingTransferPoolForQuality(quality),
        burst = worldBurstPoolForQuality(quality),
    )

    fun from(
        lastFrameMs: Double,
        emaFrameMs: Double,
        targetMs: Double,
        budgetAction: FrameBudgetAction,
        quality: QualityPreset,
        sampleCount: Int,
        stageMs: PresenterCpuStageMs = PresenterCpuStageMs(),
        nestHudPressurePermille: Int = 0,
    ): PresenterCpuSnapshot {
        val overBudget = lastFrameMs > targetMs * FrameTiming.OVER_BUDGET_MULT
        return PresenterCpuSnapshot(
            lastFrameMs = lastFrameMs,
            emaFrameMs = emaFrameMs,
            targetMs = targetMs,
            overBudget = overBudget,
            budgetAction = budgetAction,
            quality = quality,
            harborCacheLimit = FrameTiming.HARBOR_CACHE_LIMIT,
            sampleCount = sampleCount,
            stageMs = stageMs,
            caps = capsFor(FrameTiming.toPresenterQuality(quality)),
            nestHudPressurePermille = nestHudPressurePermille.coerceIn(0, 1000),
        )
    }
}

/**
 * Live harness: times presenter stages and mirrors FrameTiming into a CPU snapshot.
 */
class PresenterCpuHarness(
    private val timing: FrameTiming = FrameTiming(),
    private val nowMs: () -> Long = { SystemClock.elapsedRealtime() },
) {
    private var stageMs = PresenterCpuStageMs()
    private val stageStarts = mutableMapOf<PresenterCpuStage, Long>()
    private var sampleCount = 0
    private var lastAction: FrameBudgetAction = FrameBudgetAction.HOLD
    private var quality: QualityPreset = QualityPreset.MEDIUM
    private var nestHudPressurePermille = 0

    fun beginStage(stage: PresenterCpuStage) {
        stageStarts[stage] = nowMs()
    }

    fun endStage(stage: PresenterCpuStage) {
        val start = stageStarts.remove(stage) ?: return
        val elapsed = maxOf(0.0, (nowMs() - start).toDouble())
        stageMs = stageMs.with(stage, elapsed)
    }

    fun recordStageMs(stage: PresenterCpuStage, ms: Double) {
        stageMs = stageMs.with(stage, maxOf(0.0, ms))
    }

    fun setNestHudPressurePermille(permille: Int) {
        nestHudPressurePermille = permille.coerceIn(0, 1000)
    }

    fun sampleFrame(dtSeconds: Double, quality: QualityPreset): FrameBudgetAction {
        this.quality = quality
        val target = FrameTiming.targetMs(quality)
        lastAction = timing.sample(dtSeconds, target)
        sampleCount += 1
        return lastAction
    }

    fun snapshot(): PresenterCpuSnapshot = PresenterCpuSnapshots.from(
        lastFrameMs = timing.lastFrameMs,
        emaFrameMs = timing.emaFrameMs,
        targetMs = FrameTiming.targetMs(quality),
        budgetAction = lastAction,
        quality = quality,
        sampleCount = sampleCount,
        stageMs = stageMs,
        nestHudPressurePermille = nestHudPressurePermille,
    )

    fun reset() {
        timing.reset()
        stageMs = PresenterCpuStageMs()
        stageStarts.clear()
        sampleCount = 0
        lastAction = FrameBudgetAction.HOLD
        nestHudPressurePermille = 0
    }
}
