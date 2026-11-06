package com.willio.jeanvilma.fishshopping.cloud

import com.willio.jeanvilma.fishshopping.BuildConfig
import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.SyncDecision
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.persistence.GameSettings

data class CloudPullResult(
    val settings: GameSettings,
    val decision: SyncDecision,
)

/**
 * Pull/push helper around [CloudBackend] + [CloudSync]. Failures are soft —
 * local slots remain authoritative when the network or backend is unavailable.
 */
class CloudSyncCoordinator(
    private val backend: CloudBackend = CloudBackends.create(
        BuildConfig.FIREBASE_API_KEY.ifBlank { null },
        BuildConfig.FIREBASE_PROJECT_ID.ifBlank { null },
    ),
) {
    val available: Boolean get() = backend.available
    val kind: String get() = backend.kind

    fun ensureAccount(settings: GameSettings): Pair<GameSettings, String> {
        val uid = backend.ensureAccount(settings.cloudAccountId)
        val next = if (settings.cloudAccountId == uid) settings else settings.copy(cloudAccountId = uid)
        return next to uid
    }

    /** Merge local latest text with remote; returns updated settings + the chosen envelope. */
    fun pullMerge(settings: GameSettings, localLatest: String?): CloudPullResult {
        if (!settings.cloudSyncEnabled) {
            return CloudPullResult(
                settings,
                SyncDecision(localLatest, if (localLatest != null) SyncSource.LOCAL else SyncSource.NONE, "cloud sync off"),
            )
        }
        return try {
            val (next, uid) = ensureAccount(settings)
            val remote = backend.get(uid)
            CloudPullResult(next, CloudSync.choose(localLatest, remote))
        } catch (_: Exception) {
            CloudPullResult(
                settings,
                SyncDecision(localLatest, if (localLatest != null) SyncSource.LOCAL else SyncSource.NONE, "cloud pull failed; keep local"),
            )
        }
    }

    fun push(settings: GameSettings, snapshot: String): GameSettings {
        if (!settings.cloudSyncEnabled) return settings
        return try {
            val (next, uid) = ensureAccount(settings)
            backend.put(uid, snapshot)
            next
        } catch (_: Exception) {
            settings
        }
    }

    fun clearRemote(settings: GameSettings) {
        if (!settings.cloudSyncEnabled) return
        val uid = settings.cloudAccountId ?: return
        try {
            backend.clear(uid)
        } catch (_: Exception) {
            // Soft failure.
        }
    }
}
