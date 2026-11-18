package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.RemoteAnalytics
import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.sim.RemoteAnalyticsPolicy
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 26 — remote analytics sink. */
class RemoteAnalyticsTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, RemoteAnalytics.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, RemoteAnalytics.CATALOG).readText()).jsonObject
        assertEquals(RemoteAnalytics.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(RemoteAnalytics.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(RemoteAnalytics.REMOTE_ANALYTICS_MARKER, json.getValue("remoteAnalyticsMarker").jsonPrimitive.content)
        assertEquals(RemoteAnalytics.POLICY_CATALOG, json.getValue("policyCatalog").jsonPrimitive.content)
        assertEquals(RemoteAnalytics.CLIENT_ENV_KEY, json.getValue("clientEnvKey").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(26, listing.getValue("remoteAnalyticsPhase").jsonPrimitive.content.toInt())
        assertEquals(RemoteAnalytics.CATALOG, listing.getValue("remoteAnalyticsCatalog").jsonPrimitive.content)
    }

    @Test
    fun policyBatchAndFlush() {
        val root = repoRoot()
        val policy = Json.parseToJsonElement(File(root, RemoteAnalytics.POLICY_CATALOG).readText()).jsonObject
        assertEquals(RemoteAnalyticsPolicy.BATCH_SCHEMA, policy.getValue("batchSchema").jsonPrimitive.content)
        val batch = policy.getValue("batch").jsonObject
        assertEquals(RemoteAnalyticsPolicy.MAX_EVENTS, batch.getValue("maxEvents").jsonPrimitive.int)
        assertEquals(RemoteAnalyticsPolicy.MAX_QUEUE, batch.getValue("maxQueue").jsonPrimitive.int)

        assertNull(RemoteAnalyticsPolicy.normalizeBaseUrl("  "))
        assertEquals("http://localhost:8788", RemoteAnalyticsPolicy.normalizeBaseUrl("http://localhost:8788/"))
        assertTrue(
            RemoteAnalyticsPolicy.batchUrl("http://localhost:8788")
                .endsWith(RemoteAnalyticsPolicy.ENDPOINT_PATH),
        )

        val queue = mutableListOf<RemoteAnalyticsPolicy.QueuedEvent>()
        RemoteAnalyticsPolicy.enqueue(queue, Analytics.sessionStart("android"), 1L)
        RemoteAnalyticsPolicy.enqueue(queue, Analytics.firstSale(12L), 2L)
        val detailed = RemoteAnalyticsPolicy.takeFlushSliceDetailed(queue, 3L, "android")
        assertNotNull(detailed)
        assertEquals(2, detailed!!.envelope.events.size)
        assertEquals(RemoteAnalyticsPolicy.BATCH_SCHEMA, detailed.envelope.schema)
        assertEquals("android", detailed.envelope.platform)
        assertEquals(2, detailed.taken.size)
        assertTrue(queue.isEmpty())
        // Finish 4.0 Phase 21 — requeue failed flush slice.
        assertTrue(RemoteAnalyticsPolicy.REQUEUE_ON_FLUSH_FAILURE)
        RemoteAnalyticsPolicy.requeueFlushSlice(queue, detailed.taken)
        assertEquals(2, queue.size)
        val envelope = RemoteAnalyticsPolicy.takeFlushSlice(queue, 4L, "android")
        assertNotNull(envelope)
        assertEquals(2, envelope!!.events.size)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(RemoteAnalytics.CATALOG, pin.getValue("remoteAnalytics").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.content == "parity-remote-analytics.json"
            },
        )
    }
}
