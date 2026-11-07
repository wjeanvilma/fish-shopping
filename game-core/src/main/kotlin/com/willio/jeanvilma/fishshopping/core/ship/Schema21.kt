package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 7 — schema 21 kickoff contracts from
 * `shared/ship/schema-21.json`.
 */
object Schema21 {
    const val PHASE = 7
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.schema_21.v1"
    const val CATALOG = "shared/ship/schema-21.json"
    const val FROM_SCHEMA = 20
    const val TO_SCHEMA = 21
    const val MIGRATION_FIELD = "unlockedAchievements"
    const val CONTENT_VERSION = "1.0.1"
    const val LEGACY_V20_FIXTURE = "shared/fixtures/legacy/snapshot-v20-starter-line-t2500.json"
}
