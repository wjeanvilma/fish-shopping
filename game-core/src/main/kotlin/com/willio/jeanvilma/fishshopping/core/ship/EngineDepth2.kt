package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 3 — engine depth 2 ship contracts from
 * `shared/ship/engine-depth-2.json`.
 */
object EngineDepth2 {
    const val PHASE = 3
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.engine_depth_2.v1"
    const val CATALOG = "shared/ship/engine-depth-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-engine-depth-2.json"
    const val MARKER = "authored-finish-5.0-phase-3"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val VIEW_FIELD_MIN = 5
    const val COACHING_CONTEXT_MIN = 5
    const val QUEUE_PRESSURE_TIP_PERMILLE = 700
    const val IMPATIENT_PATIENCE_MAX_TICKS = 40
    const val CONTRACT_DEADLINE_WARN_TICKS = 200
    const val QUEST_NEAR_COMPLETE_PERMILLE = 800
    const val VALIDATE_SCRIPT = "enginedepth2:validate"

    val VIEW_FIELDS: List<String> = listOf(
        "serviceQueuePressurePermille",
        "minPatienceTicksLeft",
        "ticksUntilNearestContractDeadline",
        "contractBoardPressurePermille",
        "nextQuestProgressPermille",
    )

    val COACHING_CONTEXTS: List<String> = listOf(
        "rush_queue",
        "impatient_front",
        "contract_fail_streak",
        "contract_deadline",
        "quest_near_complete",
    )
}
