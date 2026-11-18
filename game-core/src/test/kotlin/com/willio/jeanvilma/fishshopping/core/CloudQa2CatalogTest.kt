package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.CloudQa2
import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 17 — cloud QA harness 2 catalog lock. */
class CloudQa2CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, CloudQa2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, CloudQa2.CATALOG).readText()).jsonObject
        assertEquals(CloudQa2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(CloudQa2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(CloudQa2.MARKER, json.getValue("cloudQa2Marker").jsonPrimitive.content)
        assertEquals(CloudQa2.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(CloudQa2.QA_SCENARIO_MIN, json.getValue("qaScenarioMin").jsonPrimitive.int)
        assertEquals(CloudQa2.QA_SCENARIO_TOTAL_MIN, json.getValue("qaScenarioTotalMin").jsonPrimitive.int)
        assertEquals(24, SimConstants.SCHEMA_VERSION)

        val wave2 = json.getValue("wave2ScenarioIds").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(CloudQa2.WAVE2_SCENARIO_IDS, wave2)
        assertEquals(CloudQa2.WAVE2_SCENARIO_COUNT, wave2.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(17, listing.getValue("cloudQa2Phase").jsonPrimitive.content.toInt())
        assertEquals(CloudQa2.CATALOG, listing.getValue("cloudQa2Catalog").jsonPrimitive.content)
    }

    @Test
    fun kickoffPhase17WiredAndSnippetOnly() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 17,
        )
        val phase17 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 17 }
        assertEquals("cloud-qa-2", phase17.getValue("id").jsonPrimitive.content)
        assertEquals("cloudqa2:validate", phase17.getValue("validate").jsonPrimitive.content)

        assertTrue(!File(root, "firestore.rules").exists())
        assertTrue(!File(root, "firebase/firestore.rules").exists())
        assertTrue(File(root, CloudQa2.SNIPPET_PATH).isFile)
    }
}
