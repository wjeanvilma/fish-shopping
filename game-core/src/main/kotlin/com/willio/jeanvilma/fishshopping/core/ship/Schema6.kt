package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 2 — schema foundations from
 * `shared/ship/schema-6.json`.
 *
 * Locks formal JSON Schema paths for ship/billing/ops contracts and the
 * schema-index entry point used by Ajv validators on the web side.
 */
object Schema6 {
    const val PHASE = 2
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.schema_6.v1"
    const val CATALOG = "shared/ship/schema-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-schema-6.json"
    const val MARKER = "authored-finish-6.0-phase-2"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val SCHEMA_MIN = 4
    const val SAMPLE_SHIP_MIN = 5
    const val SAMPLE_BILLING_MIN = 5
    const val SAMPLE_OPS_MIN = 5
    const val VALIDATE_SCRIPT = "schema6:validate"
    const val SCHEMA_INDEX = "shared/schema/schema-index.json"

    const val CONTENT_PACK_SCHEMA = "shared/schema/content-pack.schema.json"
    const val SHIP_CATALOG_SCHEMA = "shared/schema/ship-catalog.schema.json"
    const val BILLING_CONTRACT_SCHEMA = "shared/schema/billing-contract.schema.json"
    const val OPS_CATALOG_SCHEMA = "shared/schema/ops-catalog.schema.json"

    val SCHEMA_PATHS: List<String> = listOf(
        CONTENT_PACK_SCHEMA,
        SHIP_CATALOG_SCHEMA,
        BILLING_CONTRACT_SCHEMA,
        OPS_CATALOG_SCHEMA,
    )

    val INDEX_IDS: List<String> = listOf(
        "billing-contract",
        "content-pack",
        "ops-catalog",
        "ship-catalog",
    )

    val SAMPLE_SHIP: List<String> = listOf(
        "shared/ship/finish-6.0-kickoff.json",
        "shared/ship/loc-floors.json",
        "shared/ship/freeze-5.0.0.json",
        "shared/ship/engine-depth-1.json",
        "shared/ship/schema-6.json",
    )

    val SAMPLE_BILLING: List<String> = listOf(
        "shared/billing/play-billing.json",
        "shared/billing/web-billing.json",
        "shared/billing/entitlements.json",
        "shared/billing/entitlement-reconcile.json",
        "shared/billing/store-catalog-sync.json",
    )

    val SAMPLE_OPS: List<String> = listOf(
        "shared/ops/stripe-ops-5.json",
        "shared/ops/stripe-ops-4.json",
        "shared/ops/support-runbook.json",
        "shared/ops/analytics-dashboard.json",
        "shared/ops/remote-analytics-sink.json",
    )
}
