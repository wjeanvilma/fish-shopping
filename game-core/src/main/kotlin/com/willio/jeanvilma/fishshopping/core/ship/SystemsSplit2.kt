package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 3 — systems.ts customers/contracts/progression split contracts from
 * `shared/ship/systems-split-2.json`.
 */
object SystemsSplit2 {
    const val PHASE = 3
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.systems_split_2.v1"
    const val CATALOG = "shared/ship/systems-split-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-systems-split-2.json"
    const val MARKER = "authored-finish-4.0-phase-3"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val SYSTEMS_PACKAGE_ROOT = "web/src/engine/systems"
    const val SYSTEMS_FACADE_PATH = "web/src/engine/systems.ts"
    const val SYSTEMS_FACADE_MAX_LINES = 3800
    const val EXTRACTED_FILE_MIN = 8

    val REQUIRED_FILES: List<String> = listOf(
        "customers.ts",
        "progression.ts",
        "contracts.ts",
    )

    val PRIOR_SPLIT_FILES: List<String> = listOf(
        "context.ts",
        "bridge.ts",
        "fishing.ts",
        "production.ts",
        "movement.ts",
    )

    fun facadeSlim(lineCount: Int, maxLines: Int = SYSTEMS_FACADE_MAX_LINES): Boolean =
        lineCount in 1..maxLines

    fun extractedEnough(fileCount: Int, min: Int = EXTRACTED_FILE_MIN): Boolean =
        fileCount >= min
}
