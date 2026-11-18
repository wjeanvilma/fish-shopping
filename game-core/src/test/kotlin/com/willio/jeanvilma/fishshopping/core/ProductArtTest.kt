package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ProductArt
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 10 — product/cosmetic art presentation pass. */
class ProductArtTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ProductArt.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, ProductArt.CATALOG).readText()).jsonObject
        assertEquals(ProductArt.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ProductArt.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ProductArt.MARKER, json.getValue("productArtMarker").jsonPrimitive.content)
        assertEquals(ProductArt.AUTHORED_PRODUCT_TARGET, json.getValue("authoredProductTarget").jsonPrimitive.int)
        assertEquals(ProductArt.COSMETIC_BANNER_TARGET, json.getValue("cosmeticBannerTarget").jsonPrimitive.int)
        assertTrue(json.getValue("authoredProducts").jsonArray.size >= 34)
        assertTrue(json.getValue("cosmeticBanners").jsonArray.size >= ProductArt.COSMETIC_BANNER_TARGET)
    }

    @Test
    fun listingAndPinWireProductArt() {
        val root = repoRoot()
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(10, listing.getValue("productArtPhase").jsonPrimitive.content.toInt())
        assertEquals(ProductArt.CATALOG, listing.getValue("productArtCatalog").jsonPrimitive.content)
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(ProductArt.CATALOG, pin.getValue("productArt").jsonPrimitive.content)
        val fixtures = pin.getValue("fixtures").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(fixtures.contains("parity-product-art.json"))
    }

    @Test
    fun helpers() {
        assertTrue(ProductArt.productsEnough(ProductArt.AUTHORED_PRODUCT_TARGET))
        assertTrue(ProductArt.bannersEnough(ProductArt.COSMETIC_BANNER_TARGET))
        assertTrue(ProductArt.bannersEnough(12, target = 12))
        assertTrue(ProductArt.productNodesEnough(4))
    }
}
