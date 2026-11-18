package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StripeLiveCheckout
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

/** Finish 3.0 Phase 16 — live Stripe checkout catalog lock. */
class StripeLiveCheckoutCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StripeLiveCheckout.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, StripeLiveCheckout.CATALOG).readText()).jsonObject
        assertEquals(StripeLiveCheckout.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StripeLiveCheckout.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(StripeLiveCheckout.MARKER, json.getValue("stripeLiveCheckoutMarker").jsonPrimitive.content)
        assertEquals(StripeLiveCheckout.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(StripeLiveCheckout.WEBHOOK_PATH, json.getValue("webhookPath").jsonPrimitive.content)
        assertEquals(24, SimConstants.SCHEMA_VERSION)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(16, listing.getValue("stripeLiveCheckoutPhase").jsonPrimitive.content.toInt())
        assertEquals(
            StripeLiveCheckout.CATALOG,
            listing.getValue("stripeLiveCheckoutCatalog").jsonPrimitive.content,
        )
    }

    @Test
    fun kickoffGapClosedAndProductsHaveStripePrices() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertFalse(
            kickoff.getValue("gaps").jsonObject
                .getValue("stripeLiveCheckoutPartial").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 16,
        )
        assertFalse(Finish3Kickoff.OPEN_GAP_FLAGS.contains(StripeLiveCheckout.CLOSES_GAP))
        val phase16 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 16 }
        assertEquals("stripe-live", phase16.getValue("id").jsonPrimitive.content)
        assertEquals("stripe:validate", phase16.getValue("validate").jsonPrimitive.content)

        val products = Json.parseToJsonElement(File(root, StripeLiveCheckout.PRODUCTS_CATALOG).readText()).jsonObject
        val rows = products.getValue("products").jsonArray.map { it.jsonObject }
        assertTrue(rows.size >= 4)
        for (row in rows) {
            val price = row.getValue("stripePriceId").jsonPrimitive.content
            assertTrue(price.startsWith("price_test_"))
        }
    }
}
