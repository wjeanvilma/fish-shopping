package com.willio.jeanvilma.fishshopping.analytics

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Bundle
import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.RemoteAnalyticsPolicy
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Finish 3.0 Phase 26 — consent-gated remote analytics sink (Android).
 * Queues sanitized events and POSTs batches when fish.analytics.apiBase is set.
 */
class RemoteAnalyticsSink(
    private val baseUrl: String?,
    private val platform: String = "android",
    private val nowMs: () -> Long = { System.currentTimeMillis() },
    private val poster: (String, String) -> Boolean = ::defaultPoster,
) : AnalyticsTrackSink {
    private val queue = mutableListOf<RemoteAnalyticsPolicy.QueuedEvent>()
    private val lock = Any()
    private val flushing = AtomicBoolean(false)
    @Volatile private var consent: Boolean = false
    @Volatile var lastFlushOk: Boolean = true
        private set
    var batchesSent: Int = 0
        private set
    var eventsAccepted: Int = 0
        private set
    var flushFailures: Int = 0
        private set

    private val executor = Executors.newSingleThreadExecutor { r ->
        Thread(r, "fish-remote-analytics").apply { isDaemon = true }
    }
    private val retryLock = Any()
    @Volatile private var retryScheduled: Boolean = false

    fun enabled(): Boolean = RemoteAnalyticsPolicy.normalizeBaseUrl(baseUrl) != null

    fun setConsent(value: Boolean) {
        consent = value
        if (!value) {
            synchronized(lock) { queue.clear() }
        }
    }

    override fun track(event: Analytics.Event?) {
        if (!consent || event == null || !enabled()) return
        synchronized(lock) {
            RemoteAnalyticsPolicy.enqueue(queue, event, nowMs())
            eventsAccepted += 1
            if (queue.size >= RemoteAnalyticsPolicy.MAX_EVENTS) {
                scheduleFlush()
            }
        }
    }

    fun scheduleFlush() {
        if (!enabled()) return
        executor.execute { flushBlocking() }
    }

    fun flushBlocking(): Boolean {
        if (!enabled() || !flushing.compareAndSet(false, true)) return true
        var taken: List<RemoteAnalyticsPolicy.QueuedEvent> = emptyList()
        return try {
            val slice = synchronized(lock) {
                RemoteAnalyticsPolicy.takeFlushSliceDetailed(queue, nowMs(), platform)
            } ?: return true
            taken = slice.taken
            val body = encodeEnvelope(slice.envelope)
            val url = RemoteAnalyticsPolicy.batchUrl(baseUrl!!)
            val ok = poster(url, body)
            lastFlushOk = ok
            if (ok) {
                batchesSent += 1
                flushFailures = 0
            } else if (RemoteAnalyticsPolicy.REQUEUE_ON_FLUSH_FAILURE) {
                // Finish 4.0 Phase 21 — requeue failed slice and schedule retry.
                synchronized(lock) {
                    RemoteAnalyticsPolicy.requeueFlushSlice(queue, taken)
                }
                scheduleRetry()
            }
            ok
        } catch (_: Exception) {
            lastFlushOk = false
            if (RemoteAnalyticsPolicy.REQUEUE_ON_FLUSH_FAILURE && taken.isNotEmpty()) {
                synchronized(lock) {
                    RemoteAnalyticsPolicy.requeueFlushSlice(queue, taken)
                }
                scheduleRetry()
            }
            false
        } finally {
            flushing.set(false)
        }
    }

    private fun scheduleRetry() {
        if (flushFailures >= RemoteAnalyticsPolicy.MAX_FLUSH_RETRIES) return
        synchronized(retryLock) {
            if (retryScheduled) return
            retryScheduled = true
            flushFailures += 1
            val delay = RemoteAnalyticsPolicy.RETRY_BACKOFF_MS * flushFailures
            executor.execute {
                try {
                    Thread.sleep(delay)
                } catch (_: InterruptedException) {
                    Thread.currentThread().interrupt()
                    return@execute
                } finally {
                    synchronized(retryLock) { retryScheduled = false }
                }
                flushBlocking()
            }
        }
    }

    fun onSessionEnd() {
        if (RemoteAnalyticsPolicy.FLUSH_ON_SESSION_END) {
            flushBlocking()
        }
        shutdown()
    }

    fun shutdown() {
        executor.shutdownNow()
    }

    fun queuedCount(): Int = synchronized(lock) { queue.size }

    companion object {
        fun fromContext(context: Context): RemoteAnalyticsSink {
            val base = readMetaBaseUrl(context)
            return RemoteAnalyticsSink(baseUrl = base)
        }

        fun readMetaBaseUrl(context: Context): String? {
            return try {
                val ai: ApplicationInfo = context.packageManager.getApplicationInfo(
                    context.packageName,
                    PackageManager.GET_META_DATA,
                )
                val bundle: Bundle = ai.metaData ?: return null
                RemoteAnalyticsPolicy.normalizeBaseUrl(
                    bundle.getString(RemoteAnalyticsPolicy.ANDROID_META_KEY),
                )
            } catch (_: Exception) {
                null
            }
        }

        private fun encodeEnvelope(envelope: RemoteAnalyticsPolicy.BatchEnvelope): String {
            val root = JSONObject()
            root.put("schema", envelope.schema)
            root.put("platform", envelope.platform)
            root.put("sentAtMs", envelope.sentAtMs)
            val arr = JSONArray()
            for (ev in envelope.events) {
                val obj = JSONObject()
                obj.put("name", ev["name"])
                obj.put("schema", ev["schema"])
                obj.put("clientTsMs", ev["clientTsMs"])
                val props = JSONObject()
                @Suppress("UNCHECKED_CAST")
                val map = ev["props"] as? Map<String, Any?> ?: emptyMap()
                for ((k, v) in map) {
                    when (v) {
                        null -> Unit
                        is Boolean, is Int, is Long, is Float, is Double, is String -> props.put(k, v)
                        else -> Unit
                    }
                }
                obj.put("props", props)
                arr.put(obj)
            }
            root.put("events", arr)
            return root.toString()
        }

        private fun defaultPoster(url: String, body: String): Boolean {
            var conn: HttpURLConnection? = null
            return try {
                conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 8_000
                    readTimeout = 8_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("Accept", "application/json")
                }
                BufferedOutputStream(conn.outputStream).use { out ->
                    out.write(body.toByteArray(Charsets.UTF_8))
                    out.flush()
                }
                val code = conn.responseCode
                code in 200..299
            } catch (_: Exception) {
                false
            } finally {
                conn?.disconnect()
            }
        }
    }
}

/** Forwards to every sink (local + remote). */
class FanoutAnalyticsSink(
    private val sinks: List<AnalyticsTrackSink>,
) : AnalyticsTrackSink {
    override fun track(event: Analytics.Event?) {
        for (sink in sinks) sink.track(event)
    }
}
