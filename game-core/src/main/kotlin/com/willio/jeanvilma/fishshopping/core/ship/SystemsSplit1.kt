package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 2 — systems.ts fishing/production/inventory split contracts from
 * `shared/ship/systems-split-1.json`.
 */
object SystemsSplit1 {
    const val PHASE = 2
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.systems_split_1.v1"
    const val CATALOG = "shared/ship/systems-split-1.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-systems-split-1.json"
    const val MARKER = "authored-finish-4.0-phase-2"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val SYSTEMS_PACKAGE_ROOT = "web/src/engine/systems"
    const val SYSTEMS_FACADE_PATH = "web/src/engine/systems.ts"
    const val SYSTEMS_FACADE_MAX_LINES = 4700
    const val EXTRACTED_FILE_MIN = 5
    const val GAP_FLAG_CLOSED = "systemsSplitIncomplete"

    val REQUIRED_FILES: List<String> = listOf(
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
