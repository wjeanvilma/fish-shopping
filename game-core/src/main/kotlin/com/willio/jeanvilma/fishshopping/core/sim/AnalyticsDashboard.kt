package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Phase 26 (post-1.0) — consent-gated analytics dashboard + crash-free alert contracts
 * from `shared/ops/analytics-dashboard.json`. Presentation clients own persistence.
 */
object AnalyticsDashboard {
    const val PHASE = 26
    const val SCHEMA = "fish.ops.analytics_dashboard.v1"
    const val CATALOG = "shared/ops/analytics-dashboard.json"
    const val ANALYTICS_SCHEMA = Analytics.SCHEMA
    const val MAX_CRASH_FREE_SAMPLES = 50
    const val CRASH_FREE_ALERT_ID = "crash_free_session_rate"
    const val CRASH_FREE_THRESHOLD_PERMILLE = 990
    const val CRASH_FREE_MIN_SAMPLES = 5

    data class MetricDef(
        val id: String,
        val event: String,
        val aggregation: String,
    )

    data class PanelDef(
        val id: String,
        val title: String,
        val metrics: List<MetricDef>,
    )

    data class AlertDef(
        val id: String,
        val metricId: String,
        val comparator: String,
        val thresholdPermille: Int,
        val minSamples: Int,
        val severity: String,
        val message: String,
    )

    val PANELS: List<PanelDef> = listOf(
        PanelDef(
            "funnel",
            "Funnel",
            listOf(
                MetricDef("tutorial_steps", "tutorial_step_completed", "count"),
                MetricDef("first_sales", "first_sale", "count"),
                MetricDef("harbors", "harbor_unlocked", "count"),
            ),
        ),
        PanelDef(
            "recovery",
            "Recovery",
            listOf(
                MetricDef("offline_claims", "offline_claimed", "count"),
                MetricDef("save_recoveries", "save_recovery", "count"),
            ),
        ),
        PanelDef(
            "performance",
            "Performance",
            listOf(MetricDef("frame_summaries", "frame_time_summary", "count")),
        ),
        PanelDef(
            "stability",
            "Stability",
            listOf(
                MetricDef("sessions", "session_start", "count"),
                MetricDef("crash_free_reports", "crash_free_session", "count"),
                MetricDef("crash_free_rate_permille", "crash_free_session", "clean_rate_permille"),
            ),
        ),
    )

    val ALERTS: List<AlertDef> = listOf(
        AlertDef(
            id = CRASH_FREE_ALERT_ID,
            metricId = "crash_free_rate_permille",
            comparator = "lt",
            thresholdPermille = CRASH_FREE_THRESHOLD_PERMILLE,
            minSamples = CRASH_FREE_MIN_SAMPLES,
            severity = "warn",
            message = "Crash-free session rate below 99%",
        ),
    )

    data class CrashFreeSample(val clean: Boolean)

    data class MetricValue(
        val id: String,
        val value: Int,
        val samples: Int? = null,
    )

    data class AlertState(
        val id: String,
        val active: Boolean,
        val severity: String,
        val message: String,
        val metricValue: Int,
        val samples: Int,
    )

    data class Snapshot(
        val schema: String = SCHEMA,
        val analyticsSchema: String = ANALYTICS_SCHEMA,
        val consent: Boolean,
        val counters: Map<String, Int>,
        val metrics: List<MetricValue>,
        val alerts: List<AlertState>,
        val activeAlertCount: Int,
    )

    fun crashFreeRatePermille(samples: List<CrashFreeSample>): Pair<Int, Int> {
        if (samples.isEmpty()) return 1000 to 0
        val clean = samples.count { it.clean }
        val rate = kotlin.math.round((clean * 1000.0) / samples.size).toInt()
        return rate to samples.size
    }

    fun appendCrashFreeSample(
        samples: List<CrashFreeSample>,
        clean: Boolean,
        maxSamples: Int = MAX_CRASH_FREE_SAMPLES,
    ): List<CrashFreeSample> {
        val next = samples + CrashFreeSample(clean)
        return if (next.size <= maxSamples) next else next.takeLast(maxSamples)
    }

    fun recordCounter(counters: Map<String, Int>, eventName: String): Map<String, Int> {
        if (eventName !in Analytics.EVENT_NAMES) return counters
        val next = counters.toMutableMap()
        next[eventName] = (next[eventName] ?: 0) + 1
        return next
    }

    fun buildSnapshot(
        consent: Boolean,
        counters: Map<String, Int>,
        crashFreeSamples: List<CrashFreeSample>,
    ): Snapshot {
        val (ratePermille, sampleCount) = crashFreeRatePermille(crashFreeSamples)
        val metrics = mutableListOf<MetricValue>()
        for (panel in PANELS) {
            for (metric in panel.metrics) {
                if (metric.aggregation == "clean_rate_permille") {
                    metrics += MetricValue(metric.id, ratePermille, sampleCount)
                } else {
                    metrics += MetricValue(metric.id, counters[metric.event] ?: 0)
                }
            }
        }
        val alerts = ALERTS.map { alert ->
            val metric = metrics.firstOrNull { it.id == alert.metricId }
            val metricValue = metric?.value ?: 0
            val metricSamples = metric?.samples ?: 0
            val active = if (metricSamples >= alert.minSamples) {
                when (alert.comparator) {
                    "lt" -> metricValue < alert.thresholdPermille
                    "gt" -> metricValue > alert.thresholdPermille
                    else -> false
                }
            } else {
                false
            }
            AlertState(
                id = alert.id,
                active = active,
                severity = alert.severity,
                message = alert.message,
                metricValue = metricValue,
                samples = metricSamples,
            )
        }
        return Snapshot(
            consent = consent,
            counters = counters,
            metrics = metrics,
            alerts = alerts,
            activeAlertCount = alerts.count { it.active },
        )
    }

    fun encodeSnapshot(snapshot: Snapshot): String {
        val countersJson = snapshot.counters.entries.joinToString(",") { (k, v) ->
            "\"${escape(k)}\":$v"
        }
        val metricsJson = snapshot.metrics.joinToString(",") { m ->
            val samples = m.samples?.let { ",\"samples\":$it" } ?: ""
            "{\"id\":\"${escape(m.id)}\",\"value\":${m.value}$samples}"
        }
        val alertsJson = snapshot.alerts.joinToString(",") { a ->
            "{\"id\":\"${escape(a.id)}\",\"active\":${a.active},\"severity\":\"${escape(a.severity)}\"," +
                "\"message\":\"${escape(a.message)}\",\"metricValue\":${a.metricValue},\"samples\":${a.samples}}"
        }
        return "{" +
            "\"schema\":\"$SCHEMA\"," +
            "\"analyticsSchema\":\"$ANALYTICS_SCHEMA\"," +
            "\"consent\":${snapshot.consent}," +
            "\"counters\":{$countersJson}," +
            "\"metrics\":[$metricsJson]," +
            "\"alerts\":[$alertsJson]," +
            "\"activeAlertCount\":${snapshot.activeAlertCount}" +
            "}"
    }

    private fun escape(s: String): String =
        s.replace("\\", "\\\\").replace("\"", "\\\"")
}
