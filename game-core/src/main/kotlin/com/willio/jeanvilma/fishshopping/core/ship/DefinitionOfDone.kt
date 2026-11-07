package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Phase 30 (post-1.0) — Definition of Done 100% closeout contracts from
 * `shared/ship/definition-of-done.json`.
 */
object DefinitionOfDone {
    const val PHASE = 30
    const val SCHEMA = "fish.ship.definition_of_done.v1"
    const val CATALOG = "shared/ship/definition-of-done.json"
    const val RELEASE_TAG = "v1.0.1"
    const val COMPLETE_TAG = "v1.0-complete"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 20
    const val CLOSEOUT_STATUS = "archived"
    const val HARBOR_QUOTA = 5
    const val SPECIES_MIN = 20
    const val MACHINE_CLASSES = 6

    val REQUIRED_CHECKS: List<String> = listOf(
        "blueprint_quotas",
        "objectives_reachable",
        "inventories_reconcile",
        "rewards_idempotent",
        "latest_and_previous_restore",
        "store_urls_filled",
        "release_pin_matches",
        "post_1_0_phase_gates",
        "real_iap_catalogs",
        "real_screenshots",
        "authored_audio",
        "legal_urls_pages_ready",
        "closed_test_signoff_path",
        "hotfix_lane_ready",
    )

    val PHASE_GATE_CATALOGS: List<String> = listOf(
        "shared/billing/play-billing.json",
        "shared/billing/web-billing.json",
        "shared/billing/entitlement-reconcile.json",
        "shared/android/release-signing.json",
        "shared/android/aab-ci.json",
        "shared/billing/store-catalog-sync.json",
        "shared/store/legal-pages.json",
        "shared/store/data-safety.json",
        "shared/store/screenshot-capture.json",
        "shared/store/icon-pack.json",
        "shared/store/listing-copy.json",
        "shared/store/licenses.json",
        "shared/lifecycle/android-device-matrix.json",
        "shared/lifecycle/browser-matrix.json",
        "shared/perf/budget-gate.json",
        "shared/a11y/accessibility-sweep.json",
        "shared/android/closed-testing.json",
        "shared/ship/public-ship.json",
        "shared/audio/sfx-pack.json",
        "shared/audio/music-pack.json",
        "shared/perf/vfx-juice.json",
        "shared/content/tutorial-friction.json",
        "shared/content/balance-patch-1.0.1.json",
        "shared/content/cosmetic-presentation.json",
        "shared/cloud/production-path.json",
        "shared/ops/analytics-dashboard.json",
        "shared/fixtures/parity-lock.json",
        "shared/ops/support-runbook.json",
        "shared/ship/hotfix-lane.json",
    )

    fun isCloseoutReady(status: String): Boolean =
        status == "ready_for_complete_tag" || status == "tag_cut" || status == "archived"
}
