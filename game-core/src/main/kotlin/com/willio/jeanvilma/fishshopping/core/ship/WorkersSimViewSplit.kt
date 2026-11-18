package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 5 — Workers.kt + SimView.kt split + AI hooks contracts from
 * `shared/ship/workers-simview-split.json`.
 */
object WorkersSimViewSplit {
    const val PHASE = 5
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.workers_simview_split.v1"
    const val CATALOG = "shared/ship/workers-simview-split.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-workers-simview-split.json"
    const val MARKER = "authored-finish-4.0-phase-5"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val WORKERS_PATH =
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/Workers.kt"
    const val SIM_VIEW_PATH =
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimView.kt"
    const val WORKERS_MAX_LINES = 600
    const val SIM_VIEW_MAX_LINES = 800
    const val EXTRACTED_FILE_MIN = 5
    const val GAP_FLAG_CLOSED = "workersSimViewSplitIncomplete"

    val REQUIRED_FILES: List<String> = listOf(
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerDecisionHooks.kt",
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt",
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewBuilders.kt",
        "web/src/engine/systems/workerDecisionHooks.ts",
    )

    fun workersSlim(lineCount: Int, maxLines: Int = WORKERS_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun simViewSlim(lineCount: Int, maxLines: Int = SIM_VIEW_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
