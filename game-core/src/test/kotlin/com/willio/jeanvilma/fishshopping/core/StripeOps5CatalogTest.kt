package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StripeOps5
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

/** Finish 5.0 Phase 25 — Stripe/checkout live-ready catalog ops 5. */
class StripeOps5CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StripeOps5.CATALOG).isFile }

    @Test
    fun locksPhase25CatalogFloors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, StripeOps5.CATALOG).readText()).jsonObject
        assertEquals(StripeOps5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StripeOps5.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(StripeOps5.MARKER, json.getValue("stripeOps5Marker").jsonPrimitive.content)
        assertEquals(StripeOps5.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(StripeOps5.SKU_FLOOR, json.getValue("skuFloor").jsonPrimitive.int)
        assertEquals(StripeOps5.COSMETIC_SKU_FLOOR, json.getValue("cosmeticSkuFloor").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(StripeOps5.CLOSES_GAP))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(25, listing.getValue("stripeOps5Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun checkoutCatalogMeetsFinish5Floors() {
        val root = repoRoot()
        val products = Json.parseToJsonElement(
            File(root, "shared/billing/web-checkout-products.json").readText(),
        ).jsonObject.getValue("products").jsonArray.map { it.jsonObject }
        val active = products.filter { it.getValue("status").jsonPrimitive.content == "active" }
        assertTrue(active.size >= StripeOps5.SKU_FLOOR)
        val cosmetics = active.filter {
            it.getValue("sku").jsonPrimitive.content.contains(".cosmetic.")
        }
        assertTrue(cosmetics.size >= StripeOps5.COSMETIC_SKU_FLOOR)
        assertTrue(active.all { (it["stripePriceId"]?.jsonPrimitive?.content ?: "").isNotBlank() })
    }

    @Test
    fun kickoffAndDoDWired() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        val phase25 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 25 }
        assertEquals("stripe-ops-5", phase25.getValue("id").jsonPrimitive.content)
        assertEquals("stripeops5:validate", phase25.getValue("validate").jsonPrimitive.content)
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("stripeOps5Incomplete").jsonPrimitive.boolean,
        )
    }
}
