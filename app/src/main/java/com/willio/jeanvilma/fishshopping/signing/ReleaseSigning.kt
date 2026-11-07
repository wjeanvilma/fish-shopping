package com.willio.jeanvilma.fishshopping.signing

/**
 * Phase 4 (post-1.0) — release upload signing catalog
 * (mirrors shared/android/release-signing.json).
 */
object ReleaseSigning {
    const val PHASE = 4
    const val SCHEMA = "fish.android.release_signing.v1"
    const val SIGNING_CONFIG_NAME = "upload"
    const val RELEASE_DEFAULT = "upload_or_fail"
    const val DEBUG_FALLBACK = "explicit_opt_in_only"

    val ENV_KEYS = listOf(
        "FISH_UPLOAD_STORE_FILE",
        "FISH_UPLOAD_STORE_PASSWORD",
        "FISH_UPLOAD_KEY_ALIAS",
        "FISH_UPLOAD_KEY_PASSWORD",
        "FISH_UPLOAD_KEYSTORE_BASE64",
        "FISH_UPLOAD_ALLOW_DEBUG_FALLBACK",
    )

    val REQUIRED_ENV_KEYS = listOf(
        "FISH_UPLOAD_STORE_FILE",
        "FISH_UPLOAD_STORE_PASSWORD",
        "FISH_UPLOAD_KEY_ALIAS",
        "FISH_UPLOAD_KEY_PASSWORD",
    )

    val LOCAL_PROP_KEYS = listOf(
        "fish.upload.storeFile",
        "fish.upload.storePassword",
        "fish.upload.keyAlias",
        "fish.upload.keyPassword",
        "fish.upload.allowDebugFallback",
    )

    val CI_SECRETS = listOf(
        "FISH_UPLOAD_KEYSTORE_BASE64",
        "FISH_UPLOAD_STORE_PASSWORD",
        "FISH_UPLOAD_KEY_ALIAS",
        "FISH_UPLOAD_KEY_PASSWORD",
    )

    val GITIGNORE_GLOBS = listOf("*.jks", "*.keystore", "upload-keystore.jks")

    data class Readiness(
        val uploadConfigured: Boolean,
        val allowDebugFallback: Boolean,
        val missingKeys: List<String>,
        val signingConfigName: String,
    )

    fun readiness(
        storeFile: String?,
        storePassword: String?,
        keyAlias: String?,
        keyPassword: String?,
        allowDebugFallback: Boolean,
    ): Readiness {
        val missing = buildList {
            if (storeFile.isNullOrBlank()) add("FISH_UPLOAD_STORE_FILE|fish.upload.storeFile")
            if (storePassword.isNullOrBlank()) add("FISH_UPLOAD_STORE_PASSWORD|fish.upload.storePassword")
            if (keyAlias.isNullOrBlank()) add("FISH_UPLOAD_KEY_ALIAS|fish.upload.keyAlias")
            if (keyPassword.isNullOrBlank()) add("FISH_UPLOAD_KEY_PASSWORD|fish.upload.keyPassword")
        }
        return Readiness(
            uploadConfigured = missing.isEmpty(),
            allowDebugFallback = allowDebugFallback,
            missingKeys = missing,
            signingConfigName = SIGNING_CONFIG_NAME,
        )
    }
}
