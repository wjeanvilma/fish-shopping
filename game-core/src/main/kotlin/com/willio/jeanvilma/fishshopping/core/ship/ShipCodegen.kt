package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 3 — ship catalog codegen from
 * `shared/ship/ship-codegen.json`.
 */
object ShipCodegen {
    const val PHASE = 3
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.ship_codegen.v1"
    const val CATALOG = "shared/ship/ship-codegen.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-ship-codegen.json"
    const val MARKER = "authored-finish-6.0-phase-3"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val CATALOG_MIN = 3
    const val FEATURE_MIN = 4
    const val VALIDATE_SCRIPT = "shipcodegen:validate"
    const val NPM_SCRIPT = "ship:codegen"
    const val MODULE_ROOT = "shared/tools/ship_codegen/"
    const val TS_OUT_DIR = "web/src/ship/generated"
    const val KT_OUT_DIR =
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/generated"
    const val CLOSES_GAP = "shipCodegenMissing"

    val FEATURES: List<String> = listOf("list", "check", "write", "finish6-only")

    val CATALOG_IDS: List<String> = listOf(
        "finish6-kickoff",
        "schema-6",
        "ship-codegen",
    )

    val GENERATED_TS: List<String> = listOf(
        "web/src/ship/generated/finish6Kickoff.gen.ts",
        "web/src/ship/generated/schema6.gen.ts",
        "web/src/ship/generated/shipCodegen.gen.ts",
    )

    val GENERATED_KT: List<String> = listOf(
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/generated/Finish6KickoffGen.kt",
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/generated/Schema6Gen.kt",
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/generated/ShipCodegenGen.kt",
    )
}
