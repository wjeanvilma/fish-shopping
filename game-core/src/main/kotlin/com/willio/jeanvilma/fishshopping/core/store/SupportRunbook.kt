package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 28 (post-1.0) — support / refund / restore runbook contracts from
 * `shared/ops/support-runbook.json`. Presentation clients open [SUPPORT_URL].
 */
object SupportRunbook {
    const val PHASE = 28
    const val SCHEMA = "fish.ops.support_runbook.v1"
    const val CATALOG = "shared/ops/support-runbook.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 20
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val SUPPORT_URL = StoreListing.SUPPORT_URL
    const val PRIVACY_URL = StoreListing.PRIVACY_POLICY_URL
    const val ISSUES_URL = "https://github.com/wjeanvilma/fish-shopping/issues/new"
    const val EMAIL = "fish-shopping-support@jeanvilma.com"
    const val MAILTO =
        "mailto:fish-shopping-support@jeanvilma.com?subject=%5BFish%20Shopping%5D%20Support"
    const val RESTORE_IN_APP_LABEL = "Restore purchases"
    const val RESTORE_HELP_LINE =
        "Lost an unlock? Restore purchases in Goals, or open Support for refund steps."
    const val SETTINGS_SUPPORT_LABEL = "Support"
    const val RUNBOOK_ANCHOR = "#refunds"
    const val RESTORE_ANCHOR = "#restore"
    const val SUPPORT_RESTORE_URL = SUPPORT_URL + RESTORE_ANCHOR

    val RESTORE_SKUS: List<String> = listOf(
        "fish.full_harbor_unlock",
        "fish.cosmetic.sunset_bunting",
        "fish.cosmetic.pearl_string",
        "fish.cosmetic.captain_crest",
    )

    val KNOWN_ISSUE_IDS: List<String> = listOf(
        "storage_private_mode",
        "corrupt_latest_slot",
        "cloud_keys_missing",
        "restore_wrong_account",
        "perf_stutter",
    )

    val FAQ_IDS: List<String> = listOf(
        "first_session",
        "saves",
        "purchases",
        "refunds",
        "performance",
    )

    val TRIAGE_REQUIRED_FIELDS: List<String> = listOf(
        "platform",
        "appVersion",
        "packageName",
        "shortDescription",
        "purchaseOrderIdIfAny",
    )
}
