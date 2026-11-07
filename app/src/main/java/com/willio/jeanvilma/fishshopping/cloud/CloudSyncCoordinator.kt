package com.willio.jeanvilma.fishshopping.cloud

import android.content.Context
import com.willio.jeanvilma.fishshopping.BuildConfig
import com.willio.jeanvilma.fishshopping.core.persistence.CloudConflictOffer
import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.SyncDecision
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.persistence.GameSettings

data class CloudPullResult(
    val settings: GameSettings,
    val decision: SyncDecision,
    /** Dual-snapshot choice when both sides are valid and differ; null = auto-apply decision. */
    val conflict: CloudConflictOffer? = null,
)

data class CloudPushResult(
    val settings: GameSettings,
    val uploaded: Boolean,
    val queued: Boolean,
)

/**
 * Pull/push helper around [CloudBackend] + [CloudSync]. Failures are soft —
 * local slots remain authoritative when the network or backend is unavailable.
 *
 * Phase 11: dual-snapshot conflict offer.
 * Phase 22/25: anonymous refresh-token guest recovery.
 * Phase 25: offline push queue (latest snapshot wins).
 */
class CloudSyncCoordinator(
    private val backend: CloudBackend = CloudBackends.create(
        BuildConfig.FIREBASE_API_KEY.ifBlank { null },
        BuildConfig.FIREBASE_PROJECT_ID.ifBlank { null },
    ),
    private val offlineQueue: CloudOfflineQueueStore? = null,
) {
    constructor(context: Context) : this(
        offlineQueue = CloudOfflineQueue(context),
    )
    val available: Boolean get() = backend.available
    val kind: String get() = backend.kind

    fun hasPendingOfflinePush(): Boolean = offlineQueue?.pending() == true

    fun ensureAccount(settings: GameSettings): Pair<GameSettings, String> {
        val session = backend.ensureAccount(settings.cloudAccountId, settings.cloudRefreshToken)
        val next = if (
            settings.cloudAccountId == session.uid &&
            settings.cloudRefreshToken == session.refreshToken
        ) {
            settings
        } else {
            settings.copy(cloudAccountId = session.uid, cloudRefreshToken = session.refreshToken)
        }
        return next to session.uid
    }

    /** Merge local latest text with remote; returns updated settings + the chosen envelope. */
    fun pullMerge(settings: GameSettings, localLatest: String?): CloudPullResult {
        if (!settings.cloudSyncEnabled) {
            return CloudPullResult(
                settings,
                SyncDecision(localLatest, if (localLatest != null) SyncSource.LOCAL else SyncSource.NONE, "cloud sync off"),
                conflict = null,
            )
        }
        return try {
            val (next, uid) = ensureAccount(settings)
            val remote = backend.get(uid)
            CloudPullResult(
                next,
                CloudSync.choose(localLatest, remote),
                conflict = CloudSync.conflictOffer(localLatest, remote),
            )
        } catch (_: Exception) {
            CloudPullResult(
                settings,
                SyncDecision(localLatest, if (localLatest != null) SyncSource.LOCAL else SyncSource.NONE, "cloud pull failed; keep local"),
                conflict = null,
            )
        }
    }

    fun push(settings: GameSettings, snapshot: String): CloudPushResult {
        if (!settings.cloudSyncEnabled) {
            return CloudPushResult(settings, uploaded = false, queued = false)
        }
        if (!backend.available) {
            offlineQueue?.enqueue(snapshot, settings.cloudAccountId)
            return CloudPushResult(settings, uploaded = false, queued = offlineQueue != null)
        }
        return try {
            val (next, uid) = ensureAccount(settings)
            backend.put(uid, snapshot)
            offlineQueue?.clear()
            CloudPushResult(next, uploaded = true, queued = false)
        } catch (_: Exception) {
            offlineQueue?.enqueue(snapshot, settings.cloudAccountId)
            CloudPushResult(settings, uploaded = false, queued = offlineQueue != null)
        }
    }

    fun flushOfflineQueue(settings: GameSettings): CloudPushResult {
        if (!settings.cloudSyncEnabled) {
            return CloudPushResult(settings, uploaded = false, queued = false)
        }
        val pending = offlineQueue?.load()
            ?: return CloudPushResult(settings, uploaded = false, queued = false)
        if (!backend.available) {
            return CloudPushResult(settings, uploaded = false, queued = true)
        }
        return try {
            val (next, uid) = ensureAccount(settings)
            backend.put(uid, pending.snapshot)
            offlineQueue.clear()
            CloudPushResult(next, uploaded = true, queued = false)
        } catch (_: Exception) {
            CloudPushResult(settings, uploaded = false, queued = true)
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
