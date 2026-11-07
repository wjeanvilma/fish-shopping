package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Phase 25/26 — privacy-safe analytics events (blueprint live-ops).
 *
 * Consent is enforced by presentation clients. This module only validates
 * allowlisted event names/props and refuses PII / full-save keys.
 * Phase 26 adds session_start + crash_free_session for the ops dashboard.
 */
object Analytics {
    const val SCHEMA = "fish.analytics.v1"

    val EVENT_NAMES: Set<String> = setOf(
        "tutorial_step_completed",
        "first_sale",
        "harbor_unlocked",
        "offline_claimed",
        "save_recovery",
        "frame_time_summary",
        "session_start",
        "crash_free_session",
    )

    /** Keys that must never appear in an analytics payload. */
    val FORBIDDEN_KEYS: Set<String> = Telemetry.FORBIDDEN_KEYS + setOf(
        "snapshot", "save", "saveJson", "saveText", "payload", "bagContents",
        "uid", "userId", "displayName", "phone", "deviceId", "ip", "ipAddress",
    )

    /** Allowed property keys per event (extras are dropped). */
    val ALLOWED_PROPS: Map<String, Set<String>> = mapOf(
        "tutorial_step_completed" to setOf("stepIndex"),
        "first_sale" to setOf("coins"),
        "harbor_unlocked" to setOf("harborId", "mode"),
        "offline_claimed" to setOf("elapsedMillis", "ticksCredited", "coinsDelta", "capped"),
        "save_recovery" to setOf("source"),
        "frame_time_summary" to setOf("emaMs", "quality", "samples", "platform"),
        "session_start" to setOf("platform"),
        "crash_free_session" to setOf("clean", "platform"),
    )

    data class Event(
        val name: String,
        val props: Map<String, Any?>,
        val schema: String = SCHEMA,
    )

    fun sanitize(name: String, props: Map<String, Any?>): Event? {
        if (name !in EVENT_NAMES) return null
        val allowed = ALLOWED_PROPS[name] ?: emptySet()
        val clean = linkedMapOf<String, Any?>()
        for ((k, v) in props) {
            if (k in FORBIDDEN_KEYS) continue
            if (k !in allowed) continue
            when (v) {
                null -> Unit
                is Boolean, is Int, is Long, is Float, is Double, is String -> clean[k] = v
                else -> Unit
            }
        }
        return Event(name, clean)
    }

    fun tutorialStepCompleted(stepIndex: Int): Event =
        sanitize("tutorial_step_completed", mapOf("stepIndex" to stepIndex))!!

    fun firstSale(coins: Long): Event =
        sanitize("first_sale", mapOf("coins" to coins))!!

    fun harborUnlocked(harborId: String): Event =
        sanitize("harbor_unlocked", mapOf("harborId" to harborId, "mode" to "travel"))!!

    fun harborUnlockedFull(): Event =
        sanitize("harbor_unlocked", mapOf("mode" to "full"))!!

    fun offlineClaimed(
        elapsedMillis: Long,
        ticksCredited: Long,
        coinsDelta: Long,
        capped: Boolean,
    ): Event = sanitize(
        "offline_claimed",
        mapOf(
            "elapsedMillis" to elapsedMillis,
            "ticksCredited" to ticksCredited,
            "coinsDelta" to coinsDelta,
            "capped" to capped,
        ),
    )!!

    fun saveRecovery(source: String): Event =
        sanitize("save_recovery", mapOf("source" to source))!!

    fun frameTimeSummary(emaMs: Double, quality: String, samples: Int, platform: String): Event =
        sanitize(
            "frame_time_summary",
            mapOf(
                "emaMs" to kotlin.math.round(emaMs * 10.0) / 10.0,
                "quality" to quality,
                "samples" to samples,
                "platform" to platform,
            ),
        )!!

    /** Phase 26: consent-gated session open (platform only). */
    fun sessionStart(platform: String): Event =
        sanitize("session_start", mapOf("platform" to platform))!!

    /** Phase 26: clean=true when the prior/current session ended without unclean exit. */
    fun crashFreeSession(clean: Boolean, platform: String): Event =
        sanitize("crash_free_session", mapOf("clean" to clean, "platform" to platform))!!
}

/** In-memory sink for unit tests / local inspection. */
class MemoryAnalyticsSink {
    val events = mutableListOf<Analytics.Event>()

    fun track(event: Analytics.Event?) {
        if (event != null) events += event
    }

    fun clear() {
        events.clear()
    }

    fun names(): List<String> = events.map { it.name }
}
