package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness ship constants
 * (mirrors shared/ship/presenter-harness.json).
 */
object PresenterHarness {
    const val PHASE = 21
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.presenter_harness.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val PRESENTER_HARNESS_MARKER = "authored-finish-6.0-phase-21"
    const val CATALOG = "shared/ship/presenter-harness.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-presenter-harness.json"
    const val STAGE_MIN = 6
    const val SNAPSHOT_FIELD_MIN = 11
    const val SIM_HZ_INVARIANT = 20
    const val VALIDATE_SCRIPT = "presenterharness:validate"
    const val CLOSES_GAP = "presenterHarnessMissing"

    val STAGES: List<String> = listOf(
        "crowd",
        "fly",
        "burst",
        "locomotion",
        "qualityBind",
        "nestHud",
    )

    val SNAPSHOT_FIELDS: List<String> = listOf(
        "lastFrameMs",
        "emaFrameMs",
        "targetMs",
        "overBudget",
        "budgetAction",
        "quality",
        "harborCacheLimit",
        "sampleCount",
        "stageMs",
        "caps",
        "nestHudPressurePermille",
    )
}
