package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 28 — Support/ops 2.0 ship constants
 * (mirrors shared/ship/support-ops-2.0.json + shared/ops/support-ops-2.0.json).
 */
object SupportOps2 {
    const val PHASE = 28
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.support_ops_2.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val SUPPORT_OPS_2_MARKER = "authored-finish-2.0-phase-28"
    const val FEATURE_FAQ_MIN = 6
    const val REFUND_MATRIX_ROW_MIN = 4
    const val KNOWN_ISSUE_2_MIN = 4
    const val SUPPORT_HTML_SECTION_MIN = 3
    const val CATALOG = "shared/ship/support-ops-2.0.json"
    const val OPS_CATALOG = "shared/ops/support-ops-2.0.json"
    const val EXTENDS_RUNBOOK = "shared/ops/support-runbook.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-support-ops-2.0.json"

    val FEATURE_FAQ_IDS = listOf(
        "weather_tide",
        "festivals",
        "achievements_codex",
        "mastery_staff",
        "contracts_daily",
        "language_a11y",
        "cloud_offline_2",
        "web_checkout_local",
    )

    val REFUND_MATRIX_IDS = listOf(
        "android_full_unlock",
        "android_cosmetic",
        "web_full_unlock",
        "web_cosmetic",
    )

    val KNOWN_ISSUE_2_IDS = listOf(
        "cloud_pending_upload",
        "locale_partial_content",
        "billing_api_unset",
        "festival_stack_confusion",
    )

    val SUPPORT_HTML_SECTIONS = listOf(
        "features-2",
        "refund-matrix",
        "ops2-known",
    )
}
