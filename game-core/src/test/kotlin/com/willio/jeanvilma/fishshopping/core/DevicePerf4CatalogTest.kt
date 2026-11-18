package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.DevicePerf4
import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 27 — Device/browser/perf matrix tighten. */
class DevicePerf4CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, DevicePerf4.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, DevicePerf4.CATALOG).readText()).jsonObject
        assertEquals(DevicePerf4.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DevicePerf4.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            DevicePerf4.DEVICE_PERF_4_MARKER,
            json.getValue("devicePerf4Marker").jsonPrimitive.content,
        )
        assertEquals(DevicePerf4.HARBOR_CACHE_FLOOR, json.getValue("harborCacheFloor").jsonPrimitive.int)
        assertEquals(DevicePerf4.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(DevicePerf4.VALIDATE_SCRIPT, "deviceperf4:validate")

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(27, listing.getValue("devicePerf4Phase").jsonPrimitive.content.toInt())
        assertEquals(DevicePerf4.CATALOG, listing.getValue("devicePerf4Catalog").jsonPrimitive.content)

        val matrix = Json.parseToJsonElement(File(root, "shared/perf/device-matrix.json").readText()).jsonObject
        assertTrue(matrix.getValue("harborCacheLimit").jsonPrimitive.content.toInt() >= DevicePerf4.HARBOR_CACHE_FLOOR)
    }

    @Test
    fun closesDevicePerfGap() {
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains(DevicePerf4.CLOSES_GAP))
        assertTrue(Finish4Kickoff.PHASES.any { it.phase == 27 && it.validate == DevicePerf4.VALIDATE_SCRIPT })
        assertEquals(2, Finish4Kickoff.OPEN_GAP_FLAGS.size)
    }
}
