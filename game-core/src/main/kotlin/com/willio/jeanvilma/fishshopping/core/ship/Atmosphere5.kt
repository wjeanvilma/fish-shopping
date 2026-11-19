package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 11 — atmosphere/cozy render depth 5 contracts from
 * `shared/ship/atmosphere-5.json`.
 */
object Atmosphere5 {
    const val PHASE = 11
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.atmosphere_5.v1"
    const val CATALOG = "shared/ship/atmosphere-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-atmosphere-5.json"
    const val MARKER = "authored-finish-5.0-phase-11"
    const val FINISH5_MARKER = "atmosphere-5"
    const val COZY_ART_MARKER = "cozy-art-5"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val FINISH5_HARBOR_TARGET = 10
    const val VALIDATE_SCRIPT = "atmosphere5:validate"
    const val GAP_CLOSED = "atmosphere5Incomplete"

    val RENDER_MODULES: List<String> = listOf(
        "web/src/render/atmosphere.ts",
        "web/src/render/cozyScene.ts",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Atmosphere.kt",
        "app/src/main/java/com/willio/jeanvilma/fishshopping/render/CozyAtmospherePass.kt",
    )
}
