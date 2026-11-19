package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Finish 3.0 Phase 26 — remote analytics batch policy
 * (mirrors shared/ops/remote-analytics-sink.json).
 */
object RemoteAnalyticsPolicy {
    const val ANALYTICS_SCHEMA = Analytics.SCHEMA
    const val BATCH_SCHEMA = "fish.analytics.batch.v1"
    const val ENDPOINT_PATH = "/v1/analytics/batch"
    const val HEALTH_PATH = "/health"
    const val METHOD = "POST"

    const val MAX_EVENTS = 20
    const val MAX_QUEUE = 100
    const val FLUSH_INTERVAL_MS = 15_000L
    const val DROP_OLDEST_ON_OVERFLOW = true
    const val FLUSH_ON_SESSION_END = true
    const val RESYNC_SANITIZE_ON_FLUSH = true
    /** Finish 4.0 Phase 21 — requeue failed flush slices instead of dropping. */
    const val REQUEUE_ON_FLUSH_FAILURE = true
    /** Finish 5.0 Phase 22 — deeper retry / dead-letter policy. */
    const val MAX_FLUSH_RETRIES = 5
    const val RETRY_BACKOFF_MS = 2_000L
    const val RETRY_JITTER_MS = 500L
    const val DEAD_LETTER_AFTER_MAX_RETRIES = true

    const val WEB_ENV_KEY = "VITE_ANALYTICS_API_BASE"
    const val ANDROID_META_KEY = "fish.analytics.apiBase"
    const val LOCAL_EMULATOR_DEFAULT_BASE = "http://localhost:8788"

    val PLATFORMS = listOf("web", "android")

    data class QueuedEvent(
        val event: Analytics.Event,
        val clientTsMs: Long,
    )

    data class BatchEnvelope(
        val schema: String = BATCH_SCHEMA,
        val platform: String,
        val sentAtMs: Long,
        val events: List<Map<String, Any?>>,
    )

    /** Finish 4.0 Phase 21 — flush take that retains originals for requeue. */
    data class FlushSlice(
        val envelope: BatchEnvelope,
        val taken: List<QueuedEvent>,
    )

    fun normalizeBaseUrl(raw: String?): String? {
        val trimmed = raw?.trim()?.trimEnd('/') ?: return null
        if (trimmed.isEmpty()) return null
        return trimmed
    }

    fun batchUrl(baseUrl: String): String = "${normalizeBaseUrl(baseUrl)}$ENDPOINT_PATH"

    fun healthUrl(baseUrl: String): String = "${normalizeBaseUrl(baseUrl)}$HEALTH_PATH"

    /** Build a flush slice from the front of [queue], re-sanitizing each event. */
    fun takeFlushSlice(
        queue: MutableList<QueuedEvent>,
        nowMs: Long,
        platform: String,
        maxEvents: Int = MAX_EVENTS,
    ): BatchEnvelope? = takeFlushSliceDetailed(queue, nowMs, platform, maxEvents)?.envelope

    /** Finish 4.0 Phase 21 — take with retained queue items for failed-flush requeue. */
    fun takeFlushSliceDetailed(
        queue: MutableList<QueuedEvent>,
        nowMs: Long,
        platform: String,
        maxEvents: Int = MAX_EVENTS,
    ): FlushSlice? {
        if (queue.isEmpty()) return null
        val slice = mutableListOf<Map<String, Any?>>()
        val takenEvents = mutableListOf<QueuedEvent>()
        var taken = 0
        while (queue.isNotEmpty() && taken < maxEvents) {
            val head = queue.removeAt(0)
            val clean = if (RESYNC_SANITIZE_ON_FLUSH) {
                Analytics.sanitize(head.event.name, head.event.props) ?: continue
            } else {
                head.event
            }
            takenEvents += head
            slice += mapOf(
                "name" to clean.name,
                "props" to clean.props,
                "schema" to clean.schema,
                "clientTsMs" to head.clientTsMs,
            )
            taken += 1
        }
        if (slice.isEmpty()) return null
        return FlushSlice(
            envelope = BatchEnvelope(
                platform = platform,
                sentAtMs = nowMs,
                events = slice,
            ),
            taken = takenEvents,
        )
    }

    /** Finish 4.0 Phase 21 — prepend failed flush items back onto the queue. */
    fun requeueFlushSlice(
        queue: MutableList<QueuedEvent>,
        taken: List<QueuedEvent>,
        maxQueue: Int = MAX_QUEUE,
        dropOldest: Boolean = DROP_OLDEST_ON_OVERFLOW,
    ) {
        if (taken.isEmpty()) return
        queue.addAll(0, taken)
        while (queue.size > maxQueue) {
            if (!dropOldest) {
                queue.removeAt(queue.lastIndex)
            } else {
                queue.removeAt(0)
            }
        }
    }

    /** Finish 5.0 Phase 22 — backoff with optional jitter. */
    fun retryDelayMs(flushFailures: Int, jitterMs: Long = 0L): Long {
        val base = RETRY_BACKOFF_MS * flushFailures.coerceAtLeast(1)
        return base + jitterMs.coerceIn(0L, RETRY_JITTER_MS)
    }

    /** Finish 5.0 Phase 22 — drop failed slice once retries are exhausted. */
    fun shouldDeadLetter(flushFailures: Int): Boolean =
        DEAD_LETTER_AFTER_MAX_RETRIES && flushFailures >= MAX_FLUSH_RETRIES

    fun enqueue(
        queue: MutableList<QueuedEvent>,
        event: Analytics.Event,
        clientTsMs: Long,
        maxQueue: Int = MAX_QUEUE,
        dropOldest: Boolean = DROP_OLDEST_ON_OVERFLOW,
    ) {
        val clean = Analytics.sanitize(event.name, event.props) ?: return
        queue += QueuedEvent(clean, clientTsMs)
        while (queue.size > maxQueue) {
            if (!dropOldest) {
                queue.removeAt(queue.lastIndex)
            } else {
                queue.removeAt(0)
            }
        }
    }
}
