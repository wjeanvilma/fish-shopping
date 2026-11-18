package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.PwaShell
import com.willio.jeanvilma.fishshopping.core.ship.SpaHost
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

/** Finish 3.0 Phase 19 — PWA shell catalog lock. */
class PwaShellCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, PwaShell.CATALOG).isFile }

    @Test
    fun catalogMirrorsAndGapClosed() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, PwaShell.CATALOG).readText()).jsonObject
        assertEquals(PwaShell.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(PwaShell.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(PwaShell.MARKER, json.getValue("pwaShellMarker").jsonPrimitive.content)
        assertEquals(PwaShell.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(PwaShell.SW_SCRIPT, json.getValue("swScript").jsonPrimitive.content)
        assertEquals(24, SimConstants.SCHEMA_VERSION)

        assertTrue(File(root, "web/public/sw.js").isFile)
        assertTrue(File(root, "web/public/offline.html").isFile)
        val sw = File(root, "web/public/sw.js").readText()
        assertTrue(sw.contains(PwaShell.CACHE_NAME))
        assertTrue(sw.contains("offline.html"))

        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("pwaMissing").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 19,
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains(PwaShell.CLOSES_GAP))
        val phase19 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 19 }
        assertEquals("pwa-shell", phase19.getValue("id").jsonPrimitive.content)
        assertEquals("pwa:validate", phase19.getValue("validate").jsonPrimitive.content)

        assertTrue(SpaHost.REQUIRED_PUBLISHED_FILES.contains("sw.js"))
        assertTrue(SpaHost.REQUIRED_PUBLISHED_FILES.contains("offline.html"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(19, listing.getValue("pwaShellPhase").jsonPrimitive.content.toInt())
    }
}
