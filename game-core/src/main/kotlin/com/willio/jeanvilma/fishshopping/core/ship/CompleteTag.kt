package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 4 — v1.0-complete tag cut contracts from
 * `shared/ship/complete-tag.json`.
 */
object CompleteTag {
    const val PHASE = 4
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.complete_tag.v1"
    const val CATALOG = "shared/ship/complete-tag.json"
    const val TAG = "v1.0-complete"
    const val TAG_MESSAGE = "Fish Shopping post-1.0 Definition of Done 100% closeout"
    const val CLOSEOUT_STATUS_AFTER = "archived"
    const val HASH_ALGORITHM = "sha256"
    const val SCHEMA_VERSION = 20
    const val CONTENT_VERSION = "1.0.1"

    val ARTIFACT_SLOTS: Map<String, String> = mapOf(
        "androidAab" to "app/build/outputs/bundle/release/app-release.aab",
        "androidMapping" to "app/build/outputs/mapping/release/mapping.txt",
        "webDistIndex" to "web/dist/index.html",
        "pagesPlayIndex" to "web/dist-legal/play/index.html",
    )
}
