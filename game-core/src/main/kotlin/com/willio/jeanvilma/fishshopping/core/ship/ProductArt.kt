package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 10 — product/cosmetic art presentation pass contracts from
 * `shared/ship/product-art.json`.
 */
object ProductArt {
    const val PHASE = 10
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.product_art.v1"
    const val CATALOG = "shared/ship/product-art.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-product-art.json"
    const val MARKER = "authored-finish-4.0-phase-10"
    const val COSMETIC_BANNER_MARKER = "cosmetic-banner-phase-10"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val AUTHORED_PRODUCT_TARGET = 40
    const val COSMETIC_BANNER_TARGET = 18
    const val MIN_PRODUCT_ART_NODES = 4
    const val MIN_COSMETIC_ART_NODES = 4
    const val GAP_CLOSED = "productArtIncomplete"
    const val VALIDATE_SCRIPT = "productart:validate"
    const val COSMETIC_PRESENTATION_CATALOG = "shared/content/cosmetic-presentation.json"

    fun productsEnough(count: Int, target: Int = AUTHORED_PRODUCT_TARGET): Boolean =
        count >= target

    fun bannersEnough(count: Int, target: Int = COSMETIC_BANNER_TARGET): Boolean =
        count >= target

    fun productNodesEnough(count: Int, min: Int = MIN_PRODUCT_ART_NODES): Boolean =
        count >= min
}
