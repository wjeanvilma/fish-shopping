package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 2 — engine depth 1 ship contracts from
 * `shared/ship/engine-depth-1.json`.
 */
object EngineDepth1 {
    const val PHASE = 2
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.engine_depth_1.v1"
    const val CATALOG = "shared/ship/engine-depth-1.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-engine-depth-1.json"
    const val MARKER = "authored-finish-5.0-phase-2"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val CAST_PHASE_MIN = 3
    const val VIEW_FIELD_COUNT = 5
    const val STRIKE_XP_PERFECT_PERMILLE = 1250
    const val STRIKE_XP_GOOD_PERMILLE = 1100
    const val WAITING_END_PERMILLE = 400
    const val STRIKE_END_PERMILLE = 580
    const val VALIDATE_SCRIPT = "enginedepth1:validate"

    val CAST_PHASES: List<String> = listOf("waiting", "strike", "fight")

    val REQUIRED_STATS: List<String> = listOf(
        "stat.cast_phase_transitions",
        "stat.cast_strike_reels",
    )

    val REQUIRED_EVENTS: List<String> = listOf(
        "cast_phase_changed",
        "cast_strike_reel",
    )

    val VIEW_FIELDS: List<String> = listOf(
        "castPhase",
        "castStrikeStart01",
        "castStrikeEnd01",
        "ticksUntilBagSpoil",
        "bagSpoilPressurePermille",
    )
}
