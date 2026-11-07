package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.LandingPlayCta
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 2 — landing Play-in-browser CTA. */
class LandingPlayCtaTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/landing-play-cta.json").isFile }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/landing-play-cta.json").readText()).jsonObject
        assertEquals(LandingPlayCta.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(LandingPlayCta.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(LandingPlayCta.PLAY_URL, json.getValue("playUrl").jsonPrimitive.content)
        assertEquals(LandingPlayCta.CTA_PLAY, json.getValue("cta").jsonObject.getValue("play").jsonPrimitive.content)
        assertEquals(LandingPlayCta.VITE_BASE, json.getValue("viteBase").jsonPrimitive.content)
    }

    @Test
    fun landingHtmlMatchesCtaAndListingPointers() {
        val landing = File(root, "web/public/landing.html").readText()
        assertTrue(landing.contains(LandingPlayCta.CTA_PLAY))
        assertTrue(landing.contains("href=\"play/\""))
        assertFalse(landing.contains("View project"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(2, listing.getValue("landingPlayCtaPhase").jsonPrimitive.content.toInt())
        assertEquals(LandingPlayCta.CATALOG, listing.getValue("landingPlayCtaCatalog").jsonPrimitive.content)
        assertEquals(LandingPlayCta.PLAY_URL, listing.getValue("playUrl").jsonPrimitive.content)
        assertEquals(
            LandingPlayCta.CTA_PLAY,
            listing.getValue("webLanding").jsonObject.getValue("ctaPlay").jsonPrimitive.content,
        )
    }
}
