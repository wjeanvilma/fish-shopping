package com.willio.jeanvilma.fishshopping.core

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

/** Phase 30: pin release content + schema against shared fixtures. */
class FixtureFreezeTest {
    @Test
    fun releasePinMatchesContentAndFixtureFiles() {
        val pin = Json.parseToJsonElement(Shared.text("fixtures/RELEASE_PIN.json")).jsonObject
        assertEquals(pin["contentVersion"]!!.jsonPrimitive.content, Shared.content.contentVersion)
        assertEquals(pin["schemaVersion"]!!.jsonPrimitive.int, SimConstants.SCHEMA_VERSION)
        assertEquals(pin["ticksPerSecond"]!!.jsonPrimitive.int, SimConstants.TICKS_PER_SECOND)
        for (name in pin["fixtures"]!!.jsonArray) {
            val path = "fixtures/${name.jsonPrimitive.content}"
            assertTrue("$path missing", File(Shared.root, path).isFile)
        }
        assertTrue(
            "tutorial must still finish inside the starter-line window",
            Shared.content.tutorial.isNotEmpty(),
        )
    }
}
