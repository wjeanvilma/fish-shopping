package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.ListingCopy
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 11 (post-1.0) — frozen listing copy + en locale. */
class ListingCopyTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, ListingCopy.CATALOG).isFile }
    }

    @Test
    fun frozenCopyWithinPlayLimitsAndMatchesListing() {
        val catalog = Json.parseToJsonElement(File(root, ListingCopy.CATALOG).readText()).jsonObject
        assertEquals(ListingCopy.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ListingCopy.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertTrue(catalog.getValue("frozen").jsonPrimitive.content.toBoolean())

        val copy = catalog.getValue("copy").jsonObject
        assertEquals(ListingCopy.TITLE, copy.getValue("title").jsonPrimitive.content)
        assertEquals(ListingCopy.SHORT_DESCRIPTION, copy.getValue("shortDescription").jsonPrimitive.content)
        assertEquals(ListingCopy.FULL_DESCRIPTION, copy.getValue("fullDescription").jsonPrimitive.content)
        assertEquals(ListingCopy.WHATS_NEW, copy.getValue("whatsNew").jsonPrimitive.content)
        assertEquals(ListingCopy.WHATS_NEW_VERSION, copy.getValue("whatsNewVersion").jsonPrimitive.content)
        assertTrue(
            ListingCopy.withinPlayLimits(
                ListingCopy.TITLE,
                ListingCopy.SHORT_DESCRIPTION,
                ListingCopy.FULL_DESCRIPTION,
                ListingCopy.WHATS_NEW,
            ),
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(ListingCopy.PHASE, listing.getValue("listingCopyPhase").jsonPrimitive.content.toInt())
        assertEquals(ListingCopy.CATALOG, listing.getValue("listingCopyCatalog").jsonPrimitive.content)
        assertTrue(listing.getValue("listingCopyFrozen").jsonPrimitive.content.toBoolean())
        assertEquals(ListingCopy.SHORT_DESCRIPTION, listing.getValue("shortDescription").jsonPrimitive.content)
        assertEquals(ListingCopy.FULL_DESCRIPTION, listing.getValue("fullDescription").jsonPrimitive.content)
        assertEquals(ListingCopy.WHATS_NEW, listing.getValue("whatsNew").jsonPrimitive.content)
        assertEquals(StoreListing.APP_NAME, ListingCopy.TITLE)
        assertEquals(StoreListing.SHORT_DESCRIPTION, ListingCopy.SHORT_DESCRIPTION)
        assertEquals(StoreListing.WEB_LANDING_TAGLINE, ListingCopy.WEB_TAGLINE)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(ListingCopy.WHATS_NEW_VERSION, pin.getValue("versionName").jsonPrimitive.content)
    }

    @Test
    fun enLocaleIsOnlyLocaleAndAndroidStringsSynced() {
        val catalog = Json.parseToJsonElement(File(root, ListingCopy.CATALOG).readText()).jsonObject
        val locales = catalog.getValue("locales").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(ListingCopy.LOCALES, locales)
        assertEquals(listOf("en"), locales)

        val en = Json.parseToJsonElement(File(root, ListingCopy.EN_LOCALE_PATH).readText()).jsonObject
        assertEquals("en", en.getValue("locale").jsonPrimitive.content)
        assertTrue(en.getValue("frozen").jsonPrimitive.content.toBoolean())
        assertEquals(ListingCopy.WHATS_NEW, en.getValue("whatsNew").jsonPrimitive.content)
        assertEquals(ListingCopy.SHORT_DESCRIPTION, en.getValue("shortDescription").jsonPrimitive.content)

        val strings = File(root, ListingCopy.ANDROID_STRINGS).readText()
        assertTrue(strings.contains(ListingCopy.TITLE))
        assertTrue(strings.contains("store_short_description"))
        assertTrue(strings.contains(ListingCopy.SHORT_DESCRIPTION))
        assertTrue(strings.contains("store_whats_new"))
        assertTrue(strings.contains(ListingCopy.WHATS_NEW))
        assertTrue(strings.contains(ListingCopy.WEB_TAGLINE))
    }
}
