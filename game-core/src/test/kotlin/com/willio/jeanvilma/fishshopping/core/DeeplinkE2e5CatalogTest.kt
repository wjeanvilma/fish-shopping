package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes
import com.willio.jeanvilma.fishshopping.core.ship.DeeplinkE2e5
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

/** Finish 5.0 Phase 26 — Deep links + E2E floors ≥12/≥14. */
class DeeplinkE2e5CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, DeeplinkE2e5.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, DeeplinkE2e5.CATALOG).readText()).jsonObject
        assertEquals(DeeplinkE2e5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DeeplinkE2e5.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            DeeplinkE2e5.DEEPLINK_E2E_5_MARKER,
            json.getValue("deeplinkE2e5Marker").jsonPrimitive.content,
        )
        assertEquals(DeeplinkE2e5.PANEL_ALIAS_FLOOR, json.getValue("panelAliasFloor").jsonPrimitive.int)
        assertEquals(DeeplinkE2e5.MIN_ID_COUNT, json.getValue("minIdCount").jsonPrimitive.int)
        assertEquals(DeeplinkE2e5.MIN_TAG_COUNT, json.getValue("minTagCount").jsonPrimitive.int)
        assertEquals(DeeplinkE2e5.WEB_SCENARIO_FLOOR, json.getValue("webScenarioFloor").jsonPrimitive.int)
        assertEquals(
            DeeplinkE2e5.COMPOSE_SCENARIO_FLOOR,
            json.getValue("composeScenarioFloor").jsonPrimitive.int,
        )
        assertEquals(DeeplinkE2e5.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(DeeplinkE2e5.VALIDATE_SCRIPT, "deeplinke2e5:validate")
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(26, listing.getValue("deeplinkE2e5Phase").jsonPrimitive.content.toInt())
        assertEquals(DeeplinkE2e5.CATALOG, listing.getValue("deeplinkE2e5Catalog").jsonPrimitive.content)
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.size >= DeeplinkE2e5.PANEL_ALIAS_FLOOR)
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.containsKey("weekly"))
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.containsKey("pierledger"))
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.containsKey("friction"))
    }

    @Test
    fun closesDeeplinkE2e5Gap() {
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(DeeplinkE2e5.CLOSES_GAP))
        assertTrue(
            Finish5Kickoff.PHASES.any {
                it.phase == 26 && it.validate == DeeplinkE2e5.VALIDATE_SCRIPT
            },
        )
        // Soft-floor: later phases may close more gaps after Phase 26.
        assertTrue(Finish5Kickoff.OPEN_GAP_FLAGS.size <= 3)

        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("deeplinkE2e5Thin").jsonPrimitive.boolean,
        )
        val phase26 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 26 }
        assertEquals("deeplink-e2e-5", phase26.getValue("id").jsonPrimitive.content)
        assertEquals("deeplinke2e5:validate", phase26.getValue("validate").jsonPrimitive.content)
    }
}
