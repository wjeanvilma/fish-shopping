package com.willio.jeanvilma.fishshopping.cloud

import android.content.Context

/**
 * Phase 25 — offline cloud push queue (latest snapshot wins).
 * Finish 5.0 Phase 22 adds attempt / age sync diagnostics.
 * Local prefs only; not part of the sim parity save.
 */
data class CloudOfflineQueueEntry(
    val snapshot: String,
    val queuedAtEpochMs: Long,
    val uidHint: String?,
    /** Finish 5.0 Phase 22 — enqueue/retry attempts for sync diagnostics. */
    val attempts: Int = 1,
    val lastAttemptEpochMs: Long = queuedAtEpochMs,
)

data class CloudOfflineQueueDiagnostics(
    val queuePending: Boolean,
    val queueAgeMs: Long,
    val attempts: Int,
)

interface CloudOfflineQueueStore {
    fun load(): CloudOfflineQueueEntry?
    fun enqueue(snapshot: String, uidHint: String?, nowMs: Long = System.currentTimeMillis())
    fun clear()
    fun pending(): Boolean = load() != null
    fun diagnostics(nowMs: Long = System.currentTimeMillis()): CloudOfflineQueueDiagnostics {
        val entry = load() ?: return CloudOfflineQueueDiagnostics(false, 0L, 0)
        return CloudOfflineQueueDiagnostics(
            queuePending = true,
            queueAgeMs = (nowMs - entry.queuedAtEpochMs).coerceAtLeast(0L),
            attempts = entry.attempts,
        )
    }
}

class CloudOfflineQueue(context: Context) : CloudOfflineQueueStore {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun load(): CloudOfflineQueueEntry? {
        val snapshot = prefs.getString(KEY_SNAPSHOT, null) ?: return null
        if (snapshot.isBlank()) return null
        val queuedAt = prefs.getLong(KEY_QUEUED_AT, 0L)
        return CloudOfflineQueueEntry(
            snapshot = snapshot,
            queuedAtEpochMs = queuedAt,
            uidHint = prefs.getString(KEY_UID_HINT, null),
            attempts = prefs.getInt(KEY_ATTEMPTS, 1).coerceAtLeast(1),
            lastAttemptEpochMs = prefs.getLong(KEY_LAST_ATTEMPT, queuedAt),
        )
    }

    override fun enqueue(snapshot: String, uidHint: String?, nowMs: Long) {
        val prior = load()
        val queuedAt = prior?.queuedAtEpochMs ?: nowMs
        val attempts = (prior?.attempts ?: 0) + 1
        prefs.edit()
            .putString(KEY_SNAPSHOT, snapshot)
            .putLong(KEY_QUEUED_AT, queuedAt)
            .putInt(KEY_ATTEMPTS, attempts)
            .putLong(KEY_LAST_ATTEMPT, nowMs)
            .apply {
                if (uidHint.isNullOrBlank()) remove(KEY_UID_HINT) else putString(KEY_UID_HINT, uidHint)
            }
            .apply()
    }

    override fun clear() {
        prefs.edit()
            .remove(KEY_SNAPSHOT)
            .remove(KEY_QUEUED_AT)
            .remove(KEY_UID_HINT)
            .remove(KEY_ATTEMPTS)
            .remove(KEY_LAST_ATTEMPT)
            .apply()
    }

    companion object {
        const val PREFS = "fish_shopping_cloud_offline_queue"
        const val KEY_SNAPSHOT = "pending_snapshot"
        const val KEY_QUEUED_AT = "queued_at_epoch_ms"
        const val KEY_UID_HINT = "uid_hint"
        const val KEY_ATTEMPTS = "attempts"
        const val KEY_LAST_ATTEMPT = "last_attempt_epoch_ms"
    }
}

/** In-memory queue for unit tests (latest snapshot wins). */
class MemoryCloudOfflineQueue : CloudOfflineQueueStore {
    @Volatile private var entry: CloudOfflineQueueEntry? = null

    override fun load(): CloudOfflineQueueEntry? = entry

    override fun enqueue(snapshot: String, uidHint: String?, nowMs: Long) {
        val prior = entry
        entry = CloudOfflineQueueEntry(
            snapshot = snapshot,
            queuedAtEpochMs = prior?.queuedAtEpochMs ?: nowMs,
            uidHint = uidHint,
            attempts = (prior?.attempts ?: 0) + 1,
            lastAttemptEpochMs = nowMs,
        )
    }

    override fun clear() {
        entry = null
    }
}
