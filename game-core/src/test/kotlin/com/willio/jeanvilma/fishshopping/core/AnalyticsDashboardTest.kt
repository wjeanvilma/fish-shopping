package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.AnalyticsDashboard
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 26 (post-1.0) — analytics dashboard + crash-free session alert. */
class AnalyticsDashboardTest {
    @Test
    fun catalogMatchesSharedOpsJson() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/ops/analytics-dashboard.json").isFile }
        }
        val text = File(root, "shared/ops/analytics-dashboard.json").readText()
        val json = Json.parseToJsonElement(text).jsonObject
        assertEquals(26, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AnalyticsDashboard.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(21, json.getValue("schemaVersion").jsonPrimitive.content.toInt())
        assertEquals(Analytics.SCHEMA, json.getValue("analyticsSchema").jsonPrimitive.content)
        assertTrue(json.getValue("consentRequired").jsonPrimitive.content.toBoolean())
        val alerts = json.getValue("alerts").jsonArray
        assertTrue(alerts.size >= 1)
        val crash = alerts[0].jsonObject
        assertEquals(AnalyticsDashboard.CRASH_FREE_ALERT_ID, crash.getValue("id").jsonPrimitive.content)
        assertEquals(
            AnalyticsDashboard.CRASH_FREE_THRESHOLD_PERMILLE,
            crash.getValue("thresholdPermille").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun crashFreeAlertFiresBelowThreshold() {
        val samples = listOf(
            AnalyticsDashboard.CrashFreeSample(true),
            AnalyticsDashboard.CrashFreeSample(true),
            AnalyticsDashboard.CrashFreeSample(false),
            AnalyticsDashboard.CrashFreeSample(true),
            AnalyticsDashboard.CrashFreeSample(true),
        )
        val snap = AnalyticsDashboard.buildSnapshot(
            consent = true,
            counters = mapOf("session_start" to 5, "crash_free_session" to 5),
            crashFreeSamples = samples,
        )
        val rate = snap.metrics.first { it.id == "crash_free_rate_permille" }
        assertEquals(800, rate.value)
        assertEquals(5, rate.samples)
        assertTrue(snap.alerts.first().active)
        assertEquals(1, snap.activeAlertCount)
        assertTrue(AnalyticsDashboard.encodeSnapshot(snap).contains("crash_free_session_rate"))
    }

    @Test
    fun analyticsIncludesSessionEvents() {
        assertTrue(Analytics.EVENT_NAMES.contains("session_start"))
        assertTrue(Analytics.EVENT_NAMES.contains("crash_free_session"))
        assertEquals("web", Analytics.sessionStart("web").props["platform"])
        assertEquals(true, Analytics.crashFreeSession(true, "android").props["clean"])
        assertFalse(Analytics.FORBIDDEN_KEYS.contains("platform"))
    }
}
