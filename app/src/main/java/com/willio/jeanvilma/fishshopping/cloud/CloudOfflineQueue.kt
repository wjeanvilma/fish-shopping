package com.willio.jeanvilma.fishshopping.cloud

import android.content.Context

/**
 * Phase 25 — offline cloud push queue (latest snapshot wins).
 * Local prefs only; not part of the sim parity save.
 */
data class CloudOfflineQueueEntry(
    val snapshot: String,
    val queuedAtEpochMs: Long,
    val uidHint: String?,
)

interface CloudOfflineQueueStore {
    fun load(): CloudOfflineQueueEntry?
    fun enqueue(snapshot: String, uidHint: String?, nowMs: Long = System.currentTimeMillis())
    fun clear()
    fun pending(): Boolean = load() != null
}

class CloudOfflineQueue(context: Context) : CloudOfflineQueueStore {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun load(): CloudOfflineQueueEntry? {
        val snapshot = prefs.getString(KEY_SNAPSHOT, null) ?: return null
        if (snapshot.isBlank()) return null
        return CloudOfflineQueueEntry(
            snapshot = snapshot,
            queuedAtEpochMs = prefs.getLong(KEY_QUEUED_AT, 0L),
            uidHint = prefs.getString(KEY_UID_HINT, null),
        )
    }

    override fun enqueue(snapshot: String, uidHint: String?, nowMs: Long) {
        prefs.edit()
            .putString(KEY_SNAPSHOT, snapshot)
            .putLong(KEY_QUEUED_AT, nowMs)
            .apply {
                if (uidHint.isNullOrBlank()) remove(KEY_UID_HINT) else putString(KEY_UID_HINT, uidHint)
            }
            .apply()
    }

    override fun clear() {
        prefs.edit().remove(KEY_SNAPSHOT).remove(KEY_QUEUED_AT).remove(KEY_UID_HINT).apply()
    }

    companion object {
        const val PREFS = "fish_shopping_cloud_offline_queue"
        const val KEY_SNAPSHOT = "pending_snapshot"
        const val KEY_QUEUED_AT = "queued_at_epoch_ms"
        const val KEY_UID_HINT = "uid_hint"
    }
}

/** In-memory queue for unit tests (latest snapshot wins). */
class MemoryCloudOfflineQueue : CloudOfflineQueueStore {
    @Volatile private var entry: CloudOfflineQueueEntry? = null

    override fun load(): CloudOfflineQueueEntry? = entry

    override fun enqueue(snapshot: String, uidHint: String?, nowMs: Long) {
        entry = CloudOfflineQueueEntry(snapshot, nowMs, uidHint)
    }

    override fun clear() {
        entry = null
    }
}
