package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes
import com.willio.jeanvilma.fishshopping.core.ship.DeeplinkE2e4
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

/** Finish 4.0 Phase 26 — Deep links + expanded E2E/Compose. */
class DeeplinkE2e4CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, DeeplinkE2e4.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, DeeplinkE2e4.CATALOG).readText()).jsonObject
        assertEquals(DeeplinkE2e4.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DeeplinkE2e4.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            DeeplinkE2e4.DEEPLINK_E2E_4_MARKER,
            json.getValue("deeplinkE2e4Marker").jsonPrimitive.content,
        )
        assertEquals(DeeplinkE2e4.PANEL_ALIAS_FLOOR, json.getValue("panelAliasFloor").jsonPrimitive.int)
        assertEquals(DeeplinkE2e4.MIN_ID_COUNT, json.getValue("minIdCount").jsonPrimitive.int)
        assertEquals(DeeplinkE2e4.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(DeeplinkE2e4.VALIDATE_SCRIPT, "deeplinke2e4:validate")

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(26, listing.getValue("deeplinkE2e4Phase").jsonPrimitive.content.toInt())
        assertEquals(DeeplinkE2e4.CATALOG, listing.getValue("deeplinkE2e4Catalog").jsonPrimitive.content)
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.size >= DeeplinkE2e4.PANEL_ALIAS_FLOOR)
    }

    @Test
    fun closesDeeplinkE2eGap() {
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains(DeeplinkE2e4.CLOSES_GAP))
        assertTrue(Finish4Kickoff.PHASES.any { it.phase == 26 && it.validate == DeeplinkE2e4.VALIDATE_SCRIPT })
        // Soft-floor: later phases may close more gaps after Phase 26.
        assertTrue(Finish4Kickoff.OPEN_GAP_FLAGS.size <= 3)
    }
}
