package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 26 — Firestore rules snippet ship constants
 * (mirrors shared/ship/firestore-rules-snippet.json).
 *
 * Snippet-only: no deployable firestore.rules in repo. Deploy remains manual.
 */
object FirestoreRulesSnippet {
    const val PHASE = 26
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.firestore_rules_snippet.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val FIRESTORE_SNIPPET_MARKER = "authored-finish-2.0-phase-26"
    const val QA_SCENARIO_MIN = 4
    const val SNIPPET_PATH = "shared/cloud/snippets/firestore-harbor-save.rules"
    const val SNIPPET_MODE = "snippet_only_not_deployed"
    const val DOCUMENT_PATH = "users/{uid}/saves/harbor"
    const val CONFLICT_UI = "phase11_dual_snapshot_choice"
    const val OFFLINE_QUEUE_POLICY = "latest_snapshot_wins"
    const val PARITY_FIXTURE = "shared/fixtures/parity-firestore-rules-snippet.json"
    const val CATALOG = "shared/ship/firestore-rules-snippet.json"
    const val PRODUCTION_PATH_CATALOG = "shared/cloud/production-path.json"
    val DOCUMENT_FIELDS = listOf("snapshot", "savedAtEpochMs", "checksum")
    val FORBIDDEN_DEPLOYABLE_PATHS = listOf("firestore.rules", "firebase/firestore.rules")
}
