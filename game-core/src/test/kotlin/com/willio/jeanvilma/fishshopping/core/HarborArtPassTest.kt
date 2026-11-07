package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.HarborArtPass
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest

/** Finish 2.0 Phase 19 — harbor art pass. */
class HarborArtPassTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/harbor-art-pass.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, HarborArtPass.CATALOG).readText()).jsonObject
        assertEquals(HarborArtPass.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(HarborArtPass.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(HarborArtPass.AUTHORED_HARBOR_MIN, json.getValue("authoredHarborMin").jsonPrimitive.int)
        assertEquals(HarborArtPass.HARBOR_ART_MARKER, json.getValue("harborArtMarker").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(19, listing.getValue("harborArtPassPhase").jsonPrimitive.content.toInt())
        assertEquals(
            HarborArtPass.CATALOG,
            listing.getValue("harborArtPassCatalog").jsonPrimitive.content,
        )

        val authored = json.getValue("authoredHarbors").jsonArray
        assertTrue(authored.size >= HarborArtPass.AUTHORED_HARBOR_MIN)
        for (id in HarborArtPass.AUTHORED_HARBOR_IDS) {
            assertTrue(authored.any { it.jsonObject.getValue("harborId").jsonPrimitive.content == id })
        }
    }

    @Test
    fun authoredGlbsHaveDistinctArtAndStayUnderBudget() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, HarborArtPass.CATALOG).readText()).jsonObject
        val maxBytes = catalog.getValue("maxBytesPerHarbor").jsonPrimitive.content.toInt()
        val digests = mutableSetOf<String>()
        for (entry in catalog.getValue("authoredHarbors").jsonArray) {
            val o = entry.jsonObject
            val asset = o.getValue("asset").jsonPrimitive.content
            val theme = o.getValue("theme").jsonPrimitive.content
            val file = File(root, asset)
            assertTrue("missing $asset", file.isFile)
            assertTrue("$asset too large", file.length() <= maxBytes.toLong())
            val bytes = file.readBytes()
            val digest = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
            digests += digest
            val extras = glbExtras(bytes)
            assertEquals(HarborArtPass.HARBOR_ART_MARKER, extras["harborArt"])
            assertEquals(theme, extras["harborTheme"])
            val nodes = glbNodeNames(bytes)
            assertTrue(nodes.any { it.startsWith("HarborArt_") })
            assertTrue(nodes.contains("Player"))
            assertTrue(nodes.contains("Water"))
        }
        assertEquals(catalog.getValue("authoredHarbors").jsonArray.size, digests.size)
    }

    private fun glbExtras(bytes: ByteArray): Map<String, String> {
        val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        require(bb.int == 0x46546c67)
        bb.int // version
        bb.int // length
        val chunkLen = bb.int
        require(bb.int == 0x4e4f534a)
        val jsonBytes = ByteArray(chunkLen)
        bb.get(jsonBytes)
        val text = String(jsonBytes).trimEnd('\u0000', ' ')
        val root = Json.parseToJsonElement(text).jsonObject
        val extras = root["extras"]?.jsonObject ?: return emptyMap()
        return extras.mapValues { it.value.jsonPrimitive.contentOrNull ?: "" }
    }

    private fun glbNodeNames(bytes: ByteArray): List<String> {
        val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        require(bb.int == 0x46546c67)
        bb.int
        bb.int
        val chunkLen = bb.int
        require(bb.int == 0x4e4f534a)
        val jsonBytes = ByteArray(chunkLen)
        bb.get(jsonBytes)
        val text = String(jsonBytes).trimEnd('\u0000', ' ')
        val root = Json.parseToJsonElement(text).jsonObject
        return root["nodes"]!!.jsonArray.map { it.jsonObject["name"]!!.jsonPrimitive.content }
    }
}
