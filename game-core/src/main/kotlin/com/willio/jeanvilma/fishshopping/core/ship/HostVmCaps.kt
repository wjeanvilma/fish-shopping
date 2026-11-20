package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 5 — GameViewModel ≤1200 + GameHost ≤1100 contracts from
 * `shared/ship/host-vm-caps.json`.
 */
object HostVmCaps {
    const val PHASE = 5
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.host_vm_caps.v1"
    const val CATALOG = "shared/ship/host-vm-caps.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-host-vm-caps.json"
    const val MARKER = "authored-finish-6.0-phase-5"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val CLOSES_GAP = "hostVmCapsIncomplete"

    const val VIEW_MODEL_PATH =
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"
    const val VIEW_MODEL_MAX_LINES = 1200
    const val GAME_HOST_PATH = "web/src/game/GameHost.ts"
    const val GAME_HOST_MAX_LINES = 1100
    const val EXTRACTED_FILE_MIN = 4

    val REQUIRED_FILES: List<String> = listOf(
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/VmStepBus.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/VmCloudBoot.kt",
        "web/src/game/host/hostCloudBoot.ts",
        "web/src/game/host/hostEntitlements.ts",
    )

    fun viewModelSlim(lineCount: Int, maxLines: Int = VIEW_MODEL_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun gameHostSlim(lineCount: Int, maxLines: Int = GAME_HOST_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
