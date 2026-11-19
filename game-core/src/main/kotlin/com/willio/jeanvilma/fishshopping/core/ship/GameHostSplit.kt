package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 6 — GameHost + renderer presenter split contracts from
 * `shared/ship/gamehost-split.json`.
 */
object GameHostSplit {
    const val PHASE = 6
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.gamehost_split.v1"
    const val CATALOG = "shared/ship/gamehost-split.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-gamehost-split.json"
    const val MARKER = "authored-finish-4.0-phase-6"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val GAME_HOST_PATH = "web/src/game/GameHost.ts"
    const val GAME_HOST_MAX_LINES = 1400
    const val HARBOR_RENDERER_PATH =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRenderer.kt"
    const val HARBOR_RENDERER_MAX_LINES = 780
    const val EXTRACTED_FILE_MIN = 13
    const val EXTRACTED_FILE_HISTORICAL_MIN = 12
    const val GAP_FLAG_CLOSED = "gameHostSplitIncomplete"

    val REQUIRED_FILES: List<String> = listOf(
        "web/src/game/host/hostState.ts",
        "web/src/game/host/hostIntentHost.ts",
        "web/src/game/host/hostShellIntents.ts",
        "web/src/game/host/hostEconomyIntents.ts",
        "web/src/game/host/hostFishingIntents.ts",
        "web/src/game/host/hostTravelIntents.ts",
        "web/src/game/host/hostIapIntents.ts",
        "web/src/game/host/hostStepBus.ts",
        "web/src/render/presenters/quality.ts",
        "web/src/render/presenters/locomotion.ts",
        "web/src/render/presenters/crowd.ts",
        "web/src/render/presenters/vfx.ts",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersQuality.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersLocomotion.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersCrowd.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersVfx.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRendererMath.kt",
    )

    fun gameHostSlim(lineCount: Int, maxLines: Int = GAME_HOST_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun harborRendererSlim(lineCount: Int, maxLines: Int = HARBOR_RENDERER_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
