package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.WebE2e
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

/** Finish 3.0 Phase 22 — web E2E catalog lock. */
class WebE2eCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, WebE2e.CATALOG).isFile }

    @Test
    fun catalogMirrorsAndGapClosed() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, WebE2e.CATALOG).readText()).jsonObject
        assertEquals(WebE2e.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(WebE2e.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(WebE2e.MARKER, json.getValue("webE2eMarker").jsonPrimitive.content)
        assertEquals(WebE2e.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(WebE2e.MIN_ID_COUNT, json.getValue("minIdCount").jsonPrimitive.content.toInt())
        assertEquals(24, SimConstants.SCHEMA_VERSION)

        assertTrue(File(root, WebE2e.IDS_MODULE).isFile)
        assertTrue(File(root, WebE2e.SMOKE_SPEC).isFile)
        assertTrue(File(root, WebE2e.PLAYWRIGHT_CONFIG).isFile)
        val ids = File(root, WebE2e.IDS_MODULE).readText()
        assertTrue(ids.contains("TITLE_PLAY"))
        assertTrue(ids.contains("NAV_PAUSE"))
        val smoke = File(root, WebE2e.SMOKE_SPEC).readText()
        assertTrue(smoke.contains("getByTestId"))
        val config = File(root, WebE2e.PLAYWRIGHT_CONFIG).readText()
        assertTrue(config.contains("swiftshader"))

        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("webE2eMissing").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 22,
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains(WebE2e.CLOSES_GAP))
        val phase22 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 22 }
        assertEquals("web-e2e", phase22.getValue("id").jsonPrimitive.content)
        assertEquals("webe2e:validate", phase22.getValue("validate").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(22, listing.getValue("webE2ePhase").jsonPrimitive.content.toInt())
    }
}
