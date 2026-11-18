package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 4 — shared shell controller ship contracts from
 * `shared/ship/shell-controller.json`.
 */
object ShellController {
    const val PHASE = 4
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.shell_controller.v1"
    const val CATALOG = "shared/ship/shell-controller.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-shell-controller.json"
    const val MARKER = "authored-finish-3.0-phase-4"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val PANEL_COUNT = 12
    const val HUD_PUBLISH_INTERVAL_MS = 100
    const val ANDROID_HOST_MAX_LINES = 1550
    const val WEB_HOST_MAX_LINES = 1520

    const val ANDROID_HOST_PATH =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"
    const val WEB_HOST_PATH = "web/src/game/GameHost.ts"

    val PANEL_WIRES: List<String> = listOf(
        "upgrades",
        "staff",
        "quests",
        "contracts",
        "map",
        "warehouse",
        "speciesBook",
        "dashboard",
        "pause",
        "settings",
        "bag",
        "station",
    )
}
