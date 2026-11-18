package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 3 — web HUD panel decomposition contracts from
 * `shared/ship/web-hud-split.json`.
 */
object WebHudSplit {
    const val PHASE = 3
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.web_hud_split.v1"
    const val CATALOG = "shared/ship/web-hud-split.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-web-hud-split.json"
    const val MARKER = "authored-finish-3.0-phase-3"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val UI_PACKAGE_ROOT = "web/src/ui"
    const val APP_PATH = "web/src/ui/App.tsx"
    const val APP_MAX_LINES = 900
    const val EXTRACTED_FILE_MIN = 12
    const val GAP_FLAG_CLOSED = "webHudDecomposition"

    val REQUIRED_FILES: List<String> = listOf(
        "App.tsx",
        "hudFormat.ts",
        "HudPrimitives.tsx",
        "HudChrome.tsx",
        "TitlePanels.tsx",
        "PauseSettingsPanels.tsx",
        "StationBagPanels.tsx",
        "UpgradePanel.tsx",
        "StaffPanel.tsx",
        "ContractsPanel.tsx",
        "BusinessDashboardPanel.tsx",
        "SpeciesBookPanel.tsx",
        "MapWarehousePanels.tsx",
        "QuestLogPanel.tsx",
        "OfflineSummaryPanel.tsx",
    )

    fun appSlim(lineCount: Int, maxLines: Int = APP_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
