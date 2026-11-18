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
    ): BatchEnvelope? {
        if (queue.isEmpty()) return null
        val slice = mutableListOf<Map<String, Any?>>()
        var taken = 0
        while (queue.isNotEmpty() && taken < maxEvents) {
            val head = queue.removeAt(0)
            val clean = if (RESYNC_SANITIZE_ON_FLUSH) {
                Analytics.sanitize(head.event.name, head.event.props) ?: continue
            } else {
                head.event
            }
            slice += mapOf(
                "name" to clean.name,
                "props" to clean.props,
                "schema" to clean.schema,
                "clientTsMs" to head.clientTsMs,
            )
            taken += 1
        }
        if (slice.isEmpty()) return null
        return BatchEnvelope(
            platform = platform,
            sentAtMs = nowMs,
            events = slice,
        )
    }

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
