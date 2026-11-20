package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Atmosphere6
import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class Atmosphere6Test {
    private fun repoRoot(): File = generateSequence(File(".").canonicalFile) { it.parentFile }
        .first { File(it, "shared/ship/atmosphere-6.json").isFile }

    @Test
    fun catalogLocksPhase11Floors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Atmosphere6.CATALOG).readText()).jsonObject
        assertEquals(Atmosphere6.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Atmosphere6.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Atmosphere6.MARKER, json.getValue("atmosphere6Marker").jsonPrimitive.content)
        assertEquals(Atmosphere6.FINISH6_MARKER, json.getValue("atmosphereFinish6Marker").jsonPrimitive.content)
        assertTrue(json.getValue("finish6HarborTarget").jsonPrimitive.int >= Atmosphere6.FINISH6_HARBOR_TARGET)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(11, listing.getValue("atmosphere6Phase").jsonPrimitive.content.toInt())
        assertEquals(Atmosphere6.CATALOG, listing.getValue("atmosphere6Catalog").jsonPrimitive.content)

        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("atmosphere6Incomplete"))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
        assertTrue(Finish6Kickoff.PHASES.any { it.phase == 11 && it.validate == "atmosphere6:validate" })
    }

    @Test
    fun kickoffClosesAtmosphere6Gap() {
        val kickoff = Json.parseToJsonElement(
            File(repoRoot(), "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        assertFalse(kickoff.getValue("gaps").jsonObject.getValue("atmosphere6Incomplete").jsonPrimitive.boolean)

        val fx = Json.parseToJsonElement(File(repoRoot(), Atmosphere6.PARITY_FIXTURE).readText()).jsonObject
        assertEquals(Atmosphere6.MARKER, fx.getValue("atmosphere6Marker").jsonPrimitive.content)
        assertTrue(fx.getValue("expect").jsonObject.getValue("atmosphere6IncompleteClosed").jsonPrimitive.boolean)
    }
}
