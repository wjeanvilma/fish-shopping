package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 4 — systems.ts rivals/economy/staffTrees/workers split contracts from
 * `shared/ship/systems-split-3.json`.
 */
object SystemsSplit3 {
    const val PHASE = 4
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.systems_split_3.v1"
    const val CATALOG = "shared/ship/systems-split-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-systems-split-3.json"
    const val MARKER = "authored-finish-6.0-phase-4"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val CLOSES_GAP = "systemsSplit3Incomplete"

    const val SYSTEMS_PACKAGE_ROOT = "web/src/engine/systems"
    const val SYSTEMS_FACADE_PATH = "web/src/engine/systems.ts"
    const val SYSTEMS_FACADE_MAX_LINES = 2800
    const val EXTRACTED_FILE_MIN = 12

    val REQUIRED_FILES: List<String> = listOf(
        "rivals.ts",
        "economyBank.ts",
        "staffTrees.ts",
        "workers.ts",
    )

    val PRIOR_SPLIT_FILES: List<String> = listOf(
        "context.ts",
        "bridge.ts",
        "fishing.ts",
        "production.ts",
        "movement.ts",
        "customers.ts",
        "progression.ts",
        "contracts.ts",
    )

    val BRIDGE_REQUIRED_MODULES: List<String> = listOf(
        "staffTrees.ts",
        "workers.ts",
    )

    fun facadeSlim(lineCount: Int, maxLines: Int = SYSTEMS_FACADE_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
