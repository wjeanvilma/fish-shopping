package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.DevicePerf5
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 27 — Device/browser/perf matrix 5. */
class DevicePerf5CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, DevicePerf5.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, DevicePerf5.CATALOG).readText()).jsonObject
        assertEquals(DevicePerf5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DevicePerf5.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            DevicePerf5.DEVICE_PERF_5_MARKER,
            json.getValue("devicePerf5Marker").jsonPrimitive.content,
        )
        assertEquals(DevicePerf5.HARBOR_CACHE_FLOOR, json.getValue("harborCacheFloor").jsonPrimitive.int)
        assertEquals(
            DevicePerf5.ANDROID_DEVICE_CLASS_FLOOR,
            json.getValue("androidDeviceClassFloor").jsonPrimitive.int,
        )
        assertEquals(
            DevicePerf5.BROWSER_TARGET_FLOOR,
            json.getValue("browserTargetFloor").jsonPrimitive.int,
        )
        assertEquals(DevicePerf5.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(DevicePerf5.VALIDATE_SCRIPT, "deviceperf5:validate")
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)

        val matrix = Json.parseToJsonElement(File(root, "shared/perf/device-matrix.json").readText()).jsonObject
        assertTrue(matrix.getValue("harborCacheLimit").jsonPrimitive.content.toInt() >= DevicePerf5.HARBOR_CACHE_FLOOR)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(27, listing.getValue("devicePerf5Phase").jsonPrimitive.content.toInt())
        assertEquals(DevicePerf5.CATALOG, listing.getValue("devicePerf5Catalog").jsonPrimitive.content)
    }

    @Test
    fun closesDevicePerf5Gap() {
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(DevicePerf5.CLOSES_GAP))
        assertTrue(
            Finish5Kickoff.PHASES.any {
                it.phase == 27 && it.validate == DevicePerf5.VALIDATE_SCRIPT
            },
        )
        // Soft-floor: later phases may close more gaps after Phase 27.
        assertTrue(Finish5Kickoff.OPEN_GAP_FLAGS.size <= 2)

        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("devicePerf5Incomplete").jsonPrimitive.boolean,
        )
        val phase27 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 27 }
        assertEquals("device-perf-5", phase27.getValue("id").jsonPrimitive.content)
        assertEquals("deviceperf5:validate", phase27.getValue("validate").jsonPrimitive.content)
    }
}
