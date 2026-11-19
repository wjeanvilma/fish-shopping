package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 5 — GameHost + presenter/HUD depth ship contracts from
 * `shared/ship/host-presenter-depth.json`.
 */
object HostPresenterDepth {
    const val PHASE = 5
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.host_presenter_depth.v1"
    const val CATALOG = "shared/ship/host-presenter-depth.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-host-presenter-depth.json"
    const val MARKER = "authored-finish-5.0-phase-5"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val VIEW_FIELD_MIN = 10
    const val REQUIRED_FILE_MIN = 2
    const val HUD_BINDING_SURFACES = 4
    const val VALIDATE_SCRIPT = "hostpresenterdepth:validate"

    val VIEW_FIELDS: List<String> = listOf(
        "castPhase",
        "castStrikeStart01",
        "castStrikeEnd01",
        "ticksUntilBagSpoil",
        "bagSpoilPressurePermille",
        "serviceQueuePressurePermille",
        "minPatienceTicksLeft",
        "ticksUntilNearestContractDeadline",
        "contractBoardPressurePermille",
        "nextQuestProgressPermille",
    )

    val REQUIRED_FILES: List<String> = listOf(
        "web/src/game/host/hostFishingIntents.ts",
        "web/src/game/loopHudSnapshot.ts",
    )

    val HUD_SURFACES: List<String> = listOf(
        "App.tsx",
        "StationBagPanels.tsx",
        "ContractsPanel.tsx",
        "HudChrome.tsx",
    )
}
