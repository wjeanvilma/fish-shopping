package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ComposeUiTests
import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
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

/** Finish 3.0 Phase 21 — Compose UI tests catalog lock. */
class ComposeUiTestsCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ComposeUiTests.CATALOG).isFile }

    @Test
    fun catalogMirrorsAndGapClosed() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, ComposeUiTests.CATALOG).readText()).jsonObject
        assertEquals(ComposeUiTests.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ComposeUiTests.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ComposeUiTests.MARKER, json.getValue("composeUiTestsMarker").jsonPrimitive.content)
        assertEquals(ComposeUiTests.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(ComposeUiTests.MIN_TAG_COUNT, json.getValue("minTagCount").jsonPrimitive.content.toInt())
        assertEquals(24, SimConstants.SCHEMA_VERSION)

        assertTrue(File(root, ComposeUiTests.TAGS_MODULE).isFile)
        assertTrue(File(root, ComposeUiTests.ROBOLECTRIC_SUITE).isFile)
        assertTrue(File(root, ComposeUiTests.INSTRUMENTED_SUITE).isFile)
        val tags = File(root, ComposeUiTests.TAGS_MODULE).readText()
        assertTrue(tags.contains("TITLE_CONTINUE"))
        assertTrue(tags.contains("NAV_PAUSE"))
        val robo = File(root, ComposeUiTests.ROBOLECTRIC_SUITE).readText()
        assertTrue(robo.contains("RobolectricTestRunner"))
        assertTrue(robo.contains("TitleMenuContent"))

        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("composeUiTestsMissing").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 21,
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains(ComposeUiTests.CLOSES_GAP))
        val phase21 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 21 }
        assertEquals("compose-ui-tests", phase21.getValue("id").jsonPrimitive.content)
        assertEquals("composeui:validate", phase21.getValue("validate").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(21, listing.getValue("composeUiTestsPhase").jsonPrimitive.content.toInt())
    }
}
