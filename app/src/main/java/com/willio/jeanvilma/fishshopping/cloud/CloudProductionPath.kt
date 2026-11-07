package com.willio.jeanvilma.fishshopping.cloud

/**
 * Phase 22 — cloud production path catalog (mirrors shared/cloud/production-path.json).
 * Firestore security rules are not shipped in-repo — ask for a snippet when needed.
 */
object CloudProductionPath {
    const val PHASE = 22
    const val AUTH_MODE = "identity_toolkit_anonymous"
    const val DOCUMENT_PATH = "users/{uid}/saves/harbor"
    val DOCUMENT_FIELDS = listOf("snapshot", "savedAtEpochMs", "checksum")
    const val CONFLICT_UI = "phase11_dual_snapshot_choice"
    const val FIRESTORE_RULES = "not_shipped_ask_for_snippet"

    val WEB_ENV_KEYS = listOf("VITE_FIREBASE_API_KEY", "VITE_FIREBASE_PROJECT_ID")
    val ANDROID_PROP_KEYS = listOf("fish.firebase.apiKey", "fish.firebase.projectId")
    val GUEST_RECOVERY_PERSISTED = listOf("cloudAccountId", "cloudRefreshToken")

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
        val firestoreRulesInRepo: Boolean,
    )

    fun readiness(apiKey: String?, projectId: String?): Readiness {
        val missing = missingAndroidKeys(apiKey, projectId)
        return Readiness(
            keysConfigured = missing.isEmpty(),
            missingKeys = missing,
            conflictUiShipped = CONFLICT_UI.contains("phase11"),
            authMode = AUTH_MODE,
            documentPath = DOCUMENT_PATH,
            firestoreRulesInRepo = FIRESTORE_RULES != "not_shipped_ask_for_snippet",
        )
    }
}
