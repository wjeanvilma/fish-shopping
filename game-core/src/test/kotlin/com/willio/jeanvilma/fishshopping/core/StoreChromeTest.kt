package com.willio.jeanvilma.fishshopping.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 18 — store listing + brand chrome assets. */
class StoreChromeTest {
    @Test
    fun listingHasScreenshotShotsAndBrandAssets() {
        val listing = Json.parseToJsonElement(Shared.text("store/listing.json")).jsonObject
        assertEquals("Fish Shopping", listing["appName"]!!.jsonPrimitive.content)
        assertTrue(listing["supportUrl"]!!.jsonPrimitive.content.startsWith("https://"))
        assertTrue(listing["privacyPolicyUrl"]!!.jsonPrimitive.content.startsWith("https://"))
        val shots = listing["screenshotShots"]!!.jsonArray
        assertTrue("need at least 5 screenshot shots", shots.size >= 5)
        for (shot in shots) {
            val o = shot.jsonObject
            assertTrue(o["id"]!!.jsonPrimitive.content.isNotBlank())
            assertTrue(o["title"]!!.jsonPrimitive.content.isNotBlank())
            assertTrue(o["capture"]!!.jsonPrimitive.content.length > 20)
        }
        val assets = listing["assets"]!!.jsonObject
        assertEquals("shared/store/brand-mark.svg", assets["brandMark"]!!.jsonPrimitive.content)
        assertTrue(File(Shared.root, "store/brand-mark.svg").isFile)
        assertTrue(File(Shared.root, "store/feature-graphic.svg").isFile)
        assertTrue(File(Shared.root, "store/feature-graphic.png").isFile)
    }
}
