package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.ScreenshotCapture
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer

/** Phase 9 (post-1.0) — storyboard → phone/tablet PNG capture pipeline. */
class ScreenshotCaptureTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, ScreenshotCapture.CATALOG).isFile }
    }

    private fun pngSize(file: File): Pair<Int, Int> {
        val bytes = file.readBytes()
        require(bytes.size >= 24 && String(bytes, 1, 3) == "PNG") { "not png: ${file.path}" }
        val buf = ByteBuffer.wrap(bytes, 16, 8)
        return buf.int to buf.int
    }

    @Test
    fun catalogMatchesConstantsAndListingShots() {
        val catalog = Json.parseToJsonElement(File(root, ScreenshotCapture.CATALOG).readText()).jsonObject
        assertEquals(ScreenshotCapture.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ScreenshotCapture.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(ScreenshotCapture.OUTPUT_DIR, catalog.getValue("outputDir").jsonPrimitive.content)
        assertEquals(ScreenshotCapture.TOOL, catalog.getValue("tool").jsonPrimitive.content)
        assertTrue(File(root, ScreenshotCapture.TOOL).isFile)

        val formats = catalog.getValue("formats").jsonObject
        fun size(form: String, orient: String) =
            formats.getValue(form).jsonObject.getValue(orient).jsonObject.let {
                ScreenshotCapture.Size(
                    it.getValue("width").jsonPrimitive.content.toInt(),
                    it.getValue("height").jsonPrimitive.content.toInt(),
                    it.getValue("aspect").jsonPrimitive.content,
                )
            }
        assertEquals(ScreenshotCapture.PHONE_PORTRAIT, size("phone", "portrait"))
        assertEquals(ScreenshotCapture.PHONE_LANDSCAPE, size("phone", "landscape"))
        assertEquals(ScreenshotCapture.TABLET_PORTRAIT, size("tablet", "portrait"))
        assertEquals(ScreenshotCapture.TABLET_LANDSCAPE, size("tablet", "landscape"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(ScreenshotCapture.PHASE, listing.getValue("screenshotCapturePhase").jsonPrimitive.content.toInt())
        assertEquals(ScreenshotCapture.CATALOG, listing.getValue("screenshotCaptureCatalog").jsonPrimitive.content)

        val listingIds = listing.getValue("screenshotShots").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(ScreenshotCapture.SHOT_IDS, listingIds)
        assertEquals(StoreListing.SCREENSHOT_IDS, listingIds)

        val catalogIds = catalog.getValue("shots").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(ScreenshotCapture.SHOT_IDS, catalogIds)
    }

    @Test
    fun phoneAndTabletCapturesExistAtPlaySizes() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        val shots = listing.getValue("screenshotShots").jsonArray.map { it.jsonObject }
        assertTrue(shots.size >= ScreenshotCapture.MIN_SHOTS)

        var count = 0
        for (shot in shots) {
            val id = shot.getValue("id").jsonPrimitive.content
            val orientation = shot.getValue("orientation").jsonPrimitive.content
            assertEquals(ScreenshotCapture.orientationFor(id), orientation)
            assertTrue(File(root, shot.getValue("storyboard").jsonPrimitive.content).isFile)

            for (form in ScreenshotCapture.FORM_FACTORS) {
                val path = ScreenshotCapture.capturePath(form, id)
                val file = File(root, path)
                assertTrue("missing $path", file.isFile)
                val (w, h) = pngSize(file)
                val expected = ScreenshotCapture.sizeFor(form, orientation)
                assertEquals("$path width", expected.width, w)
                assertEquals("$path height", expected.height, h)
                assertTrue(ScreenshotCapture.isPlayPixelBounds(w, h))
                count++
            }
        }
        assertEquals(ScreenshotCapture.expectedFileCount(), count)

        val manifest = Json.parseToJsonElement(
            File(root, "${ScreenshotCapture.OUTPUT_DIR}/manifest.json").readText(),
        ).jsonObject
        assertEquals(ScreenshotCapture.expectedFileCount(), manifest.getValue("count").jsonPrimitive.content.toInt())
    }
}
