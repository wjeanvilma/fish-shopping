package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.SpaHost
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 3 — SPA host on GitHub Pages. */
class SpaHostTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/spa-host.json").isFile }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/spa-host.json").readText()).jsonObject
        assertEquals(SpaHost.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SpaHost.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(SpaHost.PLAY_URL, json.getValue("playUrl").jsonPrimitive.content)
        assertEquals(SpaHost.VITE_BASE, json.getValue("viteBase").jsonPrimitive.content)
        assertTrue(json.getValue("build").jsonObject.getValue("fallback404").jsonPrimitive.content.toBoolean())
        assertTrue(
            json.getValue("build").jsonObject.getValue("stripLegalHtmlFromPlay").jsonPrimitive.content.toBoolean(),
        )
        val legal = json.getValue("legalPathsStable").jsonArray.map {
            it.jsonObject.getValue("path").jsonPrimitive.content
        }
        assertEquals(SpaHost.LEGAL_STABLE_PATHS, legal)
    }

    @Test
    fun listingAndPublicShipPointAtSpaHost() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(3, listing.getValue("spaHostPhase").jsonPrimitive.content.toInt())
        assertEquals(SpaHost.CATALOG, listing.getValue("spaHostCatalog").jsonPrimitive.content)
        assertEquals(SpaHost.PLAY_URL, listing.getValue("playUrl").jsonPrimitive.content)

        val publicShip = Json.parseToJsonElement(File(root, "shared/ship/public-ship.json").readText()).jsonObject
        val web = publicShip.getValue("web").jsonObject
        assertEquals(3, web.getValue("spaHostPhase").jsonPrimitive.content.toInt())
        assertEquals(SpaHost.CATALOG, web.getValue("spaHostCatalog").jsonPrimitive.content)
        assertEquals(SpaHost.PLAY_URL, web.getValue("playUrl").jsonPrimitive.content)
    }
}
