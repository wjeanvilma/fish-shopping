package com.willio.jeanvilma.fishshopping.core.store

import com.willio.jeanvilma.fishshopping.core.sim.Analytics

/**
 * Phase 8 (post-1.0) — Play Console Data safety answers mirrored from
 * `shared/store/data-safety.json`. Must stay aligned with analytics consent,
 * Autobackup excludes, and privacy.html (no PII claims).
 */
object DataSafety {
    const val PHASE = 8
    const val SCHEMA = "fish.store.data_safety.v1"
    const val CATALOG = "shared/store/data-safety.json"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"

    const val COLLECTS_OR_SHARES_USER_DATA = true
    const val ENCRYPTION_IN_TRANSIT = true
    const val USERS_CAN_REQUEST_DELETION = true
    const val INDEPENDENT_SECURITY_REVIEW = false
    const val NO_PII_CLAIM = true
    const val DEVELOPER_COLLECTS_PAYMENT_CARD = false
    const val ANALYTICS_CONSENT_DEFAULT = false
    const val CLOUD_SYNC_DEFAULT_OFF = true
    const val AUTOBACKUP_EXCLUDES_SAVES = true

    val ANALYTICS_EVENT_NAMES: Set<String> = Analytics.EVENT_NAMES

    val FORBIDDEN_KEY_SAMPLES: Set<String> = setOf(
        "uid", "userId", "displayName", "phone", "deviceId", "ip", "ipAddress",
        "snapshot", "save", "bagContents",
    )

    val EXCLUDED_SHARED_PREFS: List<String> = listOf(
        "fish_shopping_entitlements.xml",
        "fish_shopping_pending_entitlements.xml",
    )

    val EXCLUDED_FILES: List<String> = listOf(
        "harbor_save_latest.json",
        "harbor_save_previous.json",
        "harbor_save_latest.json.new",
        "harbor_save_previous.json.new",
    )

    val COLLECTED_PLAY_TYPE_IDS: Set<String> = setOf(
        "app_interactions",
        "diagnostics",
        "device_or_other_ids",
        "other_actions",
    )

    fun forbiddenKeyCovered(key: String): Boolean =
        key in Analytics.FORBIDDEN_KEYS || key in FORBIDDEN_KEY_SAMPLES

    fun analyticsEventsMatchCore(): Boolean =
        ANALYTICS_EVENT_NAMES == Analytics.EVENT_NAMES
}
