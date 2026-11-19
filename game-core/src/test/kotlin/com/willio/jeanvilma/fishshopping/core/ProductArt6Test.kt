package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.ProductArt6
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ProductArt6Test {
    private fun repoRoot(): File = generateSequence(File(".").canonicalFile) { it.parentFile }
        .first { File(it, "shared/ship/product-art-6.json").isFile }

    @Test
    fun catalogLocksPhase10Floors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, ProductArt6.CATALOG).readText()).jsonObject
        assertEquals(ProductArt6.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ProductArt6.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ProductArt6.MARKER, json.getValue("productArt6Marker").jsonPrimitive.content)
        assertEquals(ProductArt6.PRODUCT_FINISH6_MARKER, json.getValue("productFinish6Marker").jsonPrimitive.content)
        assertTrue(json.getValue("authoredProductTarget").jsonPrimitive.int >= ProductArt6.AUTHORED_PRODUCT_TARGET)
        assertTrue(json.getValue("cosmeticBannerTarget").jsonPrimitive.int >= ProductArt6.COSMETIC_BANNER_TARGET)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(10, listing.getValue("productArt6Phase").jsonPrimitive.content.toInt())
        assertEquals(ProductArt6.CATALOG, listing.getValue("productArt6Catalog").jsonPrimitive.content)

        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("productArt6Incomplete"))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
    }

    @Test
    fun kickoffClosesProductArt6Gap() {
        val kickoff = Json.parseToJsonElement(
            File(repoRoot(), "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        assertFalse(kickoff.getValue("gaps").jsonObject.getValue("productArt6Incomplete").jsonPrimitive.boolean)

        val fx = Json.parseToJsonElement(File(repoRoot(), ProductArt6.PARITY_FIXTURE).readText()).jsonObject
        assertEquals(ProductArt6.MARKER, fx.getValue("productArt6Marker").jsonPrimitive.content)
        assertTrue(fx.getValue("expect").jsonObject.getValue("productArt6IncompleteClosed").jsonPrimitive.boolean)
    }
}
