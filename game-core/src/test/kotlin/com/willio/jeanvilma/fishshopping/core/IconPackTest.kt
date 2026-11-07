package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.IconPack
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer

/** Phase 10 (post-1.0) — final icon pack + feature graphic. */
class IconPackTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, IconPack.CATALOG).isFile }
    }

    private fun pngSize(file: File): Pair<Int, Int> {
        val bytes = file.readBytes()
        require(bytes.size >= 24 && String(bytes, 1, 3) == "PNG") { "not png: ${file.path}" }
        val buf = ByteBuffer.wrap(bytes, 16, 8)
        return buf.int to buf.int
    }

    @Test
    fun catalogMatchesConstantsAndBrandColors() {
        val catalog = Json.parseToJsonElement(File(root, IconPack.CATALOG).readText()).jsonObject
        assertEquals(IconPack.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(IconPack.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(IconPack.SOURCE_MARK, catalog.getValue("sourceMark").jsonPrimitive.content)
        assertEquals(IconPack.TOOL, catalog.getValue("tool").jsonPrimitive.content)

        val colors = catalog.getValue("brandColors").jsonObject
        assertEquals(IconPack.INK, colors.getValue("ink").jsonPrimitive.content)
        assertEquals(IconPack.SKY, colors.getValue("sky").jsonPrimitive.content)
        assertEquals(IconPack.REWARD, colors.getValue("reward").jsonPrimitive.content)
        assertEquals(IconPack.ACTION, colors.getValue("action").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(IconPack.PHASE, listing.getValue("iconPackPhase").jsonPrimitive.content.toInt())
        assertEquals(IconPack.CATALOG, listing.getValue("iconPackCatalog").jsonPrimitive.content)
    }

    @Test
    fun featureGraphicPlayIconAndWebRastersHaveExactSizes() {
        for (rel in listOf(
            IconPack.SOURCE_MARK,
            IconPack.TOOL,
            IconPack.FEATURE_GRAPHIC_SVG,
            IconPack.FEATURE_GRAPHIC_PNG,
            IconPack.PLAY_HIRES_ICON,
            IconPack.WEB_FAVICON,
            IconPack.WEB_APPLE_TOUCH,
            IconPack.WEB_ICON_192,
            IconPack.WEB_ICON_512,
            IconPack.WEB_ICON_512_MASKABLE,
            IconPack.WEB_MANIFEST,
            IconPack.ADAPTIVE_ICON,
            IconPack.ADAPTIVE_FOREGROUND,
            IconPack.ADAPTIVE_BACKGROUND,
        )) {
            assertTrue("missing $rel", File(root, rel).isFile)
        }

        val fg = pngSize(File(root, IconPack.FEATURE_GRAPHIC_PNG))
        assertEquals(IconPack.FEATURE_GRAPHIC_WIDTH, fg.first)
        assertEquals(IconPack.FEATURE_GRAPHIC_HEIGHT, fg.second)

        val play = pngSize(File(root, IconPack.PLAY_HIRES_ICON))
        assertEquals(IconPack.PLAY_HIRES_SIZE, play.first)
        assertEquals(IconPack.PLAY_HIRES_SIZE, play.second)

        assertEquals(180 to 180, pngSize(File(root, IconPack.WEB_APPLE_TOUCH)))
        assertEquals(192 to 192, pngSize(File(root, IconPack.WEB_ICON_192)))
        assertEquals(512 to 512, pngSize(File(root, IconPack.WEB_ICON_512)))
        assertEquals(512 to 512, pngSize(File(root, IconPack.WEB_ICON_512_MASKABLE)))

        for ((folder, size) in IconPack.LEGACY_MIPMAPS) {
            val file = File(root, "app/src/main/res/$folder/ic_launcher.png")
            assertTrue(file.isFile)
            assertEquals(size to size, pngSize(file))
            assertTrue(File(root, "app/src/main/res/$folder/ic_launcher_round.png").isFile)
        }

        val brand = File(root, IconPack.SOURCE_MARK).readText()
        val favicon = File(root, IconPack.WEB_FAVICON).readText()
        assertEquals(brand, favicon)
        assertTrue(brand.contains(IconPack.INK))
        assertTrue(File(root, IconPack.ADAPTIVE_BACKGROUND).readText().contains(IconPack.INK))
    }
}
