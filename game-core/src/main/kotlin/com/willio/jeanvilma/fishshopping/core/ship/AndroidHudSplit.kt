package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 2 — Android HUD panel decomposition contracts from
 * `shared/ship/android-hud-split.json`.
 */
object AndroidHudSplit {
    const val PHASE = 2
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.android_hud_split.v1"
    const val CATALOG = "shared/ship/android-hud-split.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-android-hud-split.json"
    const val MARKER = "authored-finish-3.0-phase-2"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val HUD_PACKAGE_ROOT =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud"
    const val GAME_SCREEN_PATH =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"
    const val GAME_SCREEN_MAX_LINES = 1000
    const val EXTRACTED_FILE_MIN = 14
    const val GAP_FLAG_CLOSED = "androidHudDecomposition"

    val REQUIRED_FILES: List<String> = listOf(
        "GameScreen.kt",
        "HudPrimitives.kt",
        "HudFormat.kt",
        "HudIntents.kt",
        "HudChrome.kt",
        "TitlePanels.kt",
        "PauseSettingsPanels.kt",
        "StationBagPanels.kt",
        "UpgradePanel.kt",
        "StaffPanel.kt",
        "ContractsPanel.kt",
        "BusinessDashboardPanel.kt",
        "SpeciesBookPanel.kt",
        "MapWarehousePanels.kt",
        "QuestLogPanel.kt",
        "OfflineSummaryPanel.kt",
    )

    fun gameScreenSlim(lineCount: Int, maxLines: Int = GAME_SCREEN_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
