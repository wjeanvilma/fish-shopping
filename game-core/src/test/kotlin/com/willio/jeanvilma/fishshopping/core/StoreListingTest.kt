package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 29 — store listing URLs, landing copy, screenshot storyboards, licenses. */
class StoreListingTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/store/listing.json").isFile }
    }

    @Test
    fun listingFillsHttpsLegalUrlsAndPlayWebCopy() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(StoreListing.PHASE, listing.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StoreListing.SCHEMA, listing.getValue("schema").jsonPrimitive.content)
        assertEquals(StoreListing.APP_NAME, listing.getValue("appName").jsonPrimitive.content)
        assertEquals(StoreListing.PACKAGE_NAME, listing.getValue("packageName").jsonPrimitive.content)

        val support = listing.getValue("supportUrl").jsonPrimitive.content
        val privacy = listing.getValue("privacyPolicyUrl").jsonPrimitive.content
        val landingUrl = listing.getValue("landingUrl").jsonPrimitive.content
        assertTrue(StoreListing.isHttpsAbsoluteUrl(support))
        assertTrue(StoreListing.isHttpsAbsoluteUrl(privacy))
        assertTrue(StoreListing.isHttpsAbsoluteUrl(landingUrl))
        assertEquals(StoreListing.SUPPORT_URL, support)
        assertEquals(StoreListing.PRIVACY_POLICY_URL, privacy)
        assertEquals(StoreListing.LANDING_URL, landingUrl)
        assertEquals(StoreListing.CANONICAL_HOST, listing.getValue("canonicalHost").jsonPrimitive.content)
        assertEquals(StoreListing.LEGAL_PAGES_PHASE, listing.getValue("legalPagesPhase").jsonPrimitive.content.toInt())
        assertTrue(support.contains("support.html"))
        assertTrue(privacy.contains("privacy.html"))
        assertTrue(landingUrl.contains("wjeanvilma.github.io/fish-shopping"))

        val play = listing.getValue("playListing").jsonObject
        assertEquals(StoreListing.APP_NAME, play.getValue("title").jsonPrimitive.content)
        assertTrue(play.getValue("fullDescription").jsonPrimitive.content.length > 80)
        assertEquals(StoreListing.FEATURE_GRAPHIC_PNG, play.getValue("featureGraphic").jsonPrimitive.content)

        val landing = listing.getValue("webLanding").jsonObject
        assertEquals(StoreListing.WEB_LANDING_TAGLINE, landing.getValue("tagline").jsonPrimitive.content)
        assertEquals("Play in browser", landing.getValue("ctaPlay").jsonPrimitive.content)
    }

    @Test
    fun screenshotStoryboardsAndLegalPagesExist() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        val shots = listing.getValue("screenshotShots").jsonArray
        assertTrue(shots.size >= 7)
        val ids = mutableListOf<String>()
        for (shot in shots) {
            val o = shot.jsonObject
            val id = o.getValue("id").jsonPrimitive.content
            ids += id
            val storyboard = o.getValue("storyboard").jsonPrimitive.content
            assertTrue("missing $storyboard", File(root, storyboard).isFile)
            assertTrue(o.getValue("capture").jsonPrimitive.content.length > 20)
        }
        assertEquals(StoreListing.SCREENSHOT_IDS, ids)

        for (rel in listOf(
            "web/public/privacy.html",
            "web/public/support.html",
            "web/public/landing.html",
            "shared/store/feature-graphic.png",
            StoreListing.LICENSES_PATH,
            StoreListing.LEGAL_PAGES_CATALOG,
            ".github/workflows/pages.yml",
        )) {
            assertTrue("missing $rel", File(root, rel).isFile)
        }
        val privacyHtml = File(root, "web/public/privacy.html").readText()
        assertTrue(privacyHtml.contains("analytics", ignoreCase = true))
        assertTrue(!privacyHtml.contains("href=\"/"))
        val supportHtml = File(root, "web/public/support.html").readText()
        assertTrue(supportHtml.contains("Restore purchases"))
        assertTrue(!supportHtml.contains("href=\"/"))
        val legal = Json.parseToJsonElement(File(root, StoreListing.LEGAL_PAGES_CATALOG).readText()).jsonObject
        assertEquals(StoreListing.LEGAL_PAGES_PHASE, legal.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StoreListing.CANONICAL_HOST, legal.getValue("canonicalHost").jsonPrimitive.content)
        assertEquals(StoreListing.PRIVACY_POLICY_URL, legal.getValue("urls").jsonObject.getValue("privacy").jsonPrimitive.content)
        assertEquals(StoreListing.SUPPORT_URL, legal.getValue("urls").jsonObject.getValue("support").jsonPrimitive.content)
        assertEquals(StoreListing.LANDING_URL, legal.getValue("urls").jsonObject.getValue("landing").jsonPrimitive.content)
    }

    @Test
    fun assetLicensesCatalogDocumentsFirstPartyArt() {
        val licenses = Json.parseToJsonElement(File(root, StoreListing.LICENSES_PATH).readText()).jsonObject
        assertEquals(29, licenses.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals("fish.store.asset_licenses.v1", licenses.getValue("schema").jsonPrimitive.content)
        val ids = licenses.getValue("records").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }
        assertTrue(ids.contains("harbor-blockouts"))
        assertTrue(ids.contains("store-chrome"))
        assertTrue(ids.contains("screenshot-storyboards"))
        assertTrue(ids.contains("authored-sfx"))
        assertTrue(ids.contains("authored-music"))
        assertTrue(ids.contains("third-party-runtime"))
    }
}
