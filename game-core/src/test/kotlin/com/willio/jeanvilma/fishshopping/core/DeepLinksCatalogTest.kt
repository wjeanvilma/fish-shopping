package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import com.willio.jeanvilma.fishshopping.core.ship.DeepLinks
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 20 — deep-link parse + catalog lock. */
class DeepLinksCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, DeepLinks.CATALOG).isFile }

    @Test
    fun parseUriVectors() {
        val goals = DeepLinkRoutes.parseUriString(
            "https://wjeanvilma.github.io/fish-shopping/play/?panel=goals",
        )
        assertEquals(ShellPanelId.QUESTS, goals.panel)
        assertNull(goals.harborId)
        assertEquals("query", goals.source)

        val harbor = DeepLinkRoutes.parseUriString(
            "https://wjeanvilma.github.io/fish-shopping/play/?go=contracts&harbor=harbor.sunrise_pier",
        )
        assertEquals(ShellPanelId.CONTRACTS, harbor.panel)
        assertEquals("harbor.sunrise_pier", harbor.harborId)

        val path = DeepLinkRoutes.parseUriString(
            "https://wjeanvilma.github.io/fish-shopping/play/map",
        )
        assertEquals(ShellPanelId.MAP, path.panel)
        assertEquals("path", path.source)

        val hash = DeepLinkRoutes.parseUriString(
            "https://wjeanvilma.github.io/fish-shopping/play/#codex",
        )
        assertEquals(ShellPanelId.SPECIES_BOOK, hash.panel)
        assertEquals("hash", hash.source)

        val custom = DeepLinkRoutes.parseUriString("fishshopping://open?panel=staff")
        assertEquals(ShellPanelId.STAFF, custom.panel)
        assertEquals("query", custom.source)

        // Finish 4.0 Phase 26 expanded aliases
        assertEquals(ShellPanelId.BAG, DeepLinkRoutes.resolvePanelAlias("bag"))
        assertEquals(ShellPanelId.DASHBOARD, DeepLinkRoutes.resolvePanelAlias("bank"))
        assertEquals(ShellPanelId.PAUSE, DeepLinkRoutes.resolvePanelAlias("menu"))
        assertEquals(ShellPanelId.STATION, DeepLinkRoutes.resolvePanelAlias("pier"))
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.size >= 28)
    }

    @Test
    fun catalogMirrorsAndGapClosed() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, DeepLinks.CATALOG).readText()).jsonObject
        assertEquals(DeepLinks.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DeepLinks.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(DeepLinks.MARKER, json.getValue("deepLinksMarker").jsonPrimitive.content)
        assertEquals(DeepLinks.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(DeepLinks.HOST, json.getValue("host").jsonPrimitive.content)
        // Finish 4.0 soft-floor: live schema may exceed Finish 3.0's 24.
        assertTrue(SimConstants.SCHEMA_VERSION >= 24)

        assertTrue(File(root, DeepLinks.ASSET_LINKS_PATH).isFile)
        assertTrue(File(root, DeepLinks.ROUTES_CATALOG).isFile)
        val manifest = File(root, "app/src/main/AndroidManifest.xml").readText()
        assertTrue(manifest.contains("android:autoVerify=\"true\""))
        assertTrue(manifest.contains(DeepLinks.HOST))
        assertTrue(manifest.contains(DeepLinks.CUSTOM_SCHEME))

        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("deepLinksMissing").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 20,
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains(DeepLinks.CLOSES_GAP))
        val phase20 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 20 }
        assertEquals("deep-links", phase20.getValue("id").jsonPrimitive.content)
        assertEquals("deeplink:validate", phase20.getValue("validate").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(20, listing.getValue("deepLinksPhase").jsonPrimitive.content.toInt())
    }
}
