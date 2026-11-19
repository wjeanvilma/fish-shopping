package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 4 — Android VM/intent depth ship contracts from
 * `shared/ship/android-vm-depth.json`.
 */
object AndroidVmDepth {
    const val PHASE = 4
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.android_vm_depth.v1"
    const val CATALOG = "shared/ship/android-vm-depth.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-android-vm-depth.json"
    const val MARKER = "authored-finish-5.0-phase-4"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val VIEW_FIELD_MIN = 10
    const val REQUIRED_FILE_MIN = 2
    const val HUD_BINDING_SURFACES = 3
    const val VALIDATE_SCRIPT = "androidvmdepth:validate"

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
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/VmFishingIntents.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/LoopHudSnapshot.kt",
    )

    val HUD_SURFACES: List<String> = listOf(
        "GameScreen.kt",
        "StationBagPanels.kt",
        "ContractsPanel.kt",
    )
}
