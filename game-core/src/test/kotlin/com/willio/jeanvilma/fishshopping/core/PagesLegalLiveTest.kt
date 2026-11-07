package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.PagesLegalLive
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 1 — Pages legal live HTTP 200 contracts. */
class PagesLegalLiveTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/pages-legal-live.json").isFile }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/pages-legal-live.json").readText()).jsonObject
        assertEquals(PagesLegalLive.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(PagesLegalLive.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(PagesLegalLive.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(PagesLegalLive.CANONICAL_HOST, json.getValue("canonicalHost").jsonPrimitive.content)
        assertEquals(
            PagesLegalLive.WORKFLOW,
            json.getValue("pages").jsonObject.getValue("workflow").jsonPrimitive.content,
        )
        assertEquals(
            PagesLegalLive.EXPECT_STATUS,
            json.getValue("liveCheck").jsonObject.getValue("expectStatus").jsonPrimitive.content.toInt(),
        )
        assertTrue(json.getValue("pages").jsonObject.getValue("requirePublicRepo").jsonPrimitive.content.toBoolean())
        assertEquals(3, PagesLegalLive.LIVE_URLS.size)
    }

    @Test
    fun listingAndDodPointAtLiveGate() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(1, listing.getValue("pagesLegalLivePhase").jsonPrimitive.content.toInt())
        assertEquals(PagesLegalLive.CATALOG, listing.getValue("pagesLegalLiveCatalog").jsonPrimitive.content)

        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        val gates = dod.getValue("closeout").jsonObject.getValue("operatorGates")
        val legalGate = gates.toString()
        assertTrue(legalGate.contains("legal_urls_http_200"))
        assertTrue(legalGate.contains("verified"))
    }
}
