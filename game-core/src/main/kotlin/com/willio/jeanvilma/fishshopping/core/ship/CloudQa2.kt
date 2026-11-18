package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 17 — cloud production QA harness 2
 * (mirrors shared/ship/cloud-qa-2.json).
 */
object CloudQa2 {
    const val PHASE = 17
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.cloud_qa_2.v1"
    const val CATALOG = "shared/ship/cloud-qa-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-cloud-qa-2.json"
    const val MARKER = "authored-finish-3.0-phase-17"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val PRIOR_FIRESTORE_QA_PHASE = 26
    const val QA_SCENARIO_MIN = 8
    const val QA_SCENARIO_TOTAL_MIN = 12
    const val BASELINE_SCENARIO_COUNT = 4
    const val WAVE2_SCENARIO_COUNT = 8
    const val VALIDATE_SCRIPT = "npm run cloudqa2:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val PRODUCTION_PATH_CATALOG = "shared/cloud/production-path.json"
    const val SNIPPET_PATH = "shared/cloud/snippets/firestore-harbor-save.rules"
    const val SNIPPET_MODE = "snippet_only_not_deployed"

    val WAVE2_SCENARIO_IDS: List<String> = listOf(
        "conflict_local_newer_recommends_local",
        "corrupt_remote_keeps_local",
        "push_unavailable_queues",
        "sync_disabled_skips_network",
        "pull_remote_fills_empty_local",
        "flush_stays_queued_when_unavailable",
        "schema24_snapshot_roundtrip",
        "guest_uid_preserved_on_ensure",
    )

    val BASELINE_SCENARIO_IDS: List<String> = listOf(
        "conflict_dual_valid_differs",
        "conflict_identical_no_offer",
        "offline_enqueue_latest_wins",
        "offline_flush_uploads",
    )
}
