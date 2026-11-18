package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StripeOps4
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 25 — Stripe/checkout live-ready catalog ops. */
class StripeOps4CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StripeOps4.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, StripeOps4.CATALOG).readText()).jsonObject
        assertEquals(StripeOps4.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StripeOps4.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(StripeOps4.STRIPE_OPS_4_MARKER, json.getValue("stripeOps4Marker").jsonPrimitive.content)
        assertEquals(StripeOps4.SKU_FLOOR, json.getValue("skuFloor").jsonPrimitive.int)
        assertEquals(StripeOps4.READINESS_PATH, json.getValue("readinessPath").jsonPrimitive.content)
        assertEquals(StripeOps4.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(StripeOps4.VALIDATE_SCRIPT, "stripeops4:validate")

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(25, listing.getValue("stripeOps4Phase").jsonPrimitive.content.toInt())
        assertEquals(StripeOps4.CATALOG, listing.getValue("stripeOps4Catalog").jsonPrimitive.content)
    }

    @Test
    fun closesStripeOpsGap() {
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains(StripeOps4.CLOSES_GAP))
        assertTrue(Finish4Kickoff.PHASES.any { it.phase == 25 && it.validate == StripeOps4.VALIDATE_SCRIPT })
    }
}
