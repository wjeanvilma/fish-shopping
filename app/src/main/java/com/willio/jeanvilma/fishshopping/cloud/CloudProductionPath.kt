package com.willio.jeanvilma.fishshopping.cloud

/**
 * Phase 25 (post-1.0) — cloud save production cutover catalog
 * (mirrors shared/cloud/production-path.json).
 * Finish 2.0 Phase 26: reviewed rules snippet path only — never deployable firestore.rules.
 */
object CloudProductionPath {
    const val PHASE = 25
    const val SCHEMA = "fish.cloud.production_path.v1"
    const val CATALOG = "shared/cloud/production-path.json"
    const val AUTH_MODE = "identity_toolkit_anonymous"
    const val DOCUMENT_PATH = "users/{uid}/saves/harbor"
    val DOCUMENT_FIELDS = listOf("snapshot", "savedAtEpochMs", "checksum")
    const val CONFLICT_UI = "phase11_dual_snapshot_choice"
    const val FIRESTORE_RULES = "shared/cloud/snippets/firestore-harbor-save.rules"
    const val FIRESTORE_RULES_SNIPPET = "shared/cloud/snippets/firestore-harbor-save.rules"
    const val FIRESTORE_RULES_MODE = "snippet_only_not_deployed"
    const val FINISH2_FIRESTORE_SNIPPET_PHASE = 26
    const val OFFLINE_QUEUE_POLICY = "latest_snapshot_wins"
    const val OFFLINE_QUEUE_PREFS = "fish_shopping_cloud_offline_queue"

    val WEB_ENV_KEYS = listOf("VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID")
    val ANDROID_PROP_KEYS = listOf("fish.firebase.apiKey", "fish.firebase.projectId")
    val GUEST_RECOVERY_PERSISTED = listOf("cloudAccountId", "cloudRefreshToken")
    val FLUSH_ON = listOf("save_retry", "app_resume", "online_event", "settings_enable")

    fun documentPathFor(uid: String): String = DOCUMENT_PATH.replace("{uid}", uid)

    fun keysConfigured(apiKey: String?, projectId: String?): Boolean =
        !apiKey.isNullOrBlank() && !projectId.isNullOrBlank()

    fun missingAndroidKeys(apiKey: String?, projectId: String?): List<String> = buildList {
        if (apiKey.isNullOrBlank()) add("fish.firebase.apiKey")
        if (projectId.isNullOrBlank()) add("fish.firebase.projectId")
    }

    data class Readiness(
        val keysConfigured: Boolean,
        val missingKeys: List<String>,
        val conflictUiShipped: Boolean,
        val authMode: String,
        val documentPath: String,
        /** Always false — deployable firestore.rules are never committed. */
        val firestoreRulesInRepo: Boolean,
        /** Finish 2.0 Phase 26: reviewed snippet path is present. */
        val firestoreRulesSnippetShipped: Boolean,
        val offlineQueueEnabled: Boolean,
    )

    fun readiness(apiKey: String?, projectId: String?): Readiness {
        val missing = missingAndroidKeys(apiKey, projectId)
        val snippetShipped =
            FIRESTORE_RULES != "not_shipped_ask_for_snippet" &&
                FIRESTORE_RULES.contains("shared/cloud/snippets/") &&
                FIRESTORE_RULES_MODE == "snippet_only_not_deployed"
        return Readiness(
            keysConfigured = missing.isEmpty(),
            missingKeys = missing,
            conflictUiShipped = CONFLICT_UI.contains("phase11"),
            authMode = AUTH_MODE,
            documentPath = DOCUMENT_PATH,
            firestoreRulesInRepo = false,
            firestoreRulesSnippetShipped = snippetShipped,
            offlineQueueEnabled = true,
        )
    }
}
