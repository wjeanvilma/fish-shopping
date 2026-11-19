package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 4 — Android GameViewModel intent/handler split contracts from
 * `shared/ship/viewmodel-split.json`.
 */
object ViewModelSplit {
    const val PHASE = 4
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.viewmodel_split.v1"
    const val CATALOG = "shared/ship/viewmodel-split.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-viewmodel-split.json"
    const val MARKER = "authored-finish-4.0-phase-4"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val VIEW_MODEL_PACKAGE_ROOT =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game"
    const val VIEW_MODEL_PATH =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"
    const val VIEW_MODEL_MAX_LINES = 1600
    const val EXTRACTED_FILE_MIN = 7
    const val EXTRACTED_FILE_HISTORICAL_MIN = 6
    const val VIEW_MODEL_MAX_LINES_HISTORICAL = 1500
    const val GAP_FLAG_CLOSED = "viewModelSplitIncomplete"

    val REQUIRED_FILES: List<String> = listOf(
        "GameUiState.kt",
        "vm/VmIntentHost.kt",
        "vm/VmShellIntents.kt",
        "vm/VmEconomyIntents.kt",
        "vm/VmFishingIntents.kt",
        "vm/VmTravelIntents.kt",
        "vm/VmIapIntents.kt",
    )

    fun viewModelSlim(lineCount: Int, maxLines: Int = VIEW_MODEL_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
