package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.FishArtPass
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
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

/** Finish 2.0 Phase 20 — fish art pass. */
class FishArtPassTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/fish-art-pass.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, FishArtPass.CATALOG).readText()).jsonObject
        assertEquals(FishArtPass.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FishArtPass.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(FishArtPass.AUTHORED_SPECIES_MIN, json.getValue("authoredSpeciesMin").jsonPrimitive.int)
        assertEquals(FishArtPass.FISH_ART_MARKER, json.getValue("fishArtMarker").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(20, listing.getValue("fishArtPassPhase").jsonPrimitive.content.toInt())
        assertEquals(
            FishArtPass.CATALOG,
            listing.getValue("fishArtPassCatalog").jsonPrimitive.content,
        )

        val authored = json.getValue("authoredSpecies").jsonArray
        assertTrue(authored.size >= FishArtPass.AUTHORED_SPECIES_MIN)
        for (id in FishArtPass.AUTHORED_SPECIES_IDS) {
            assertTrue(authored.any { it.jsonObject.getValue("speciesId").jsonPrimitive.content == id })
        }
    }

    @Test
    fun authoredGlbsHaveDistinctArtAndStayUnderBudget() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, FishArtPass.CATALOG).readText()).jsonObject
        val maxBytes = catalog.getValue("maxBytesPerFish").jsonPrimitive.content.toInt()
        val digests = mutableSetOf<String>()
        for (entry in catalog.getValue("authoredSpecies").jsonArray) {
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
            assertEquals(FishArtPass.FISH_ART_MARKER, extras["fishArt"])
            assertEquals(theme, extras["fishTheme"])
            assertEquals("20", extras["phase"])
            val nodes = glbNodeNames(bytes)
            assertTrue(nodes.count { it.startsWith("FishArt_") } >= 6)
        }
        assertEquals(catalog.getValue("authoredSpecies").jsonArray.size, digests.size)
    }

    @Test
    fun nonAuthoredFishRemainPhase13Stubs() {
        val root = repoRoot()
        val authored = FishArtPass.AUTHORED_SPECIES_IDS.toSet()
        for (sp in Shared.content.species) {
            if (sp.id in authored) continue
            val asset = sp.asset ?: continue
            val file = File(Shared.root, "assets/$asset")
            assertTrue(file.isFile)
            val extras = glbExtras(file.readBytes())
            assertEquals("13", extras["phase"])
            assertTrue(extras["fishArt"].isNullOrEmpty())
            assertEquals("true", extras["stylized"])
        }
    }

    private fun glbExtras(bytes: ByteArray): Map<String, String> {
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
        val extras = root["extras"]?.jsonObject ?: return emptyMap()
        return extras.entries.associate { (k, v) ->
            k to (v.jsonPrimitive.contentOrNull
                ?: v.jsonPrimitive.booleanOrNull?.toString()
                ?: v.jsonPrimitive.intOrNull?.toString()
                ?: "")
        }
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
