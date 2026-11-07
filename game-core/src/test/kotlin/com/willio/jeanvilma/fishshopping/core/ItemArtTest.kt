package com.willio.jeanvilma.fishshopping.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Phase 13 — species/product GLBs are stylized glTF 2.0 (Filament AssetLoader /
 * Three.js GLTFLoader consume the same files under shared/assets).
 */
class ItemArtTest {
    private val content get() = Shared.content

    @Test
    fun everySpeciesAndProductAssetIsStylizedGlb() {
        val rows = content.species.map { it.id to it.asset } +
            content.products.map { it.id to it.asset }
        assertTrue(rows.size >= 57)
        for ((id, asset) in rows) {
            assertNotNull("$id missing asset", asset)
            assertTrue(
                "$id bad path $asset",
                asset!!.startsWith("models/fish_") || asset.startsWith("models/product_"),
            )
            val file = File(Shared.root, "assets/$asset")
            assertTrue("$id missing file ${file.path}", file.isFile)
            val gltf = readGlbJson(file)
            val generator = gltf["asset"]!!.jsonObject["generator"]!!.jsonPrimitive.contentOrNull
            assertTrue("$id generator $generator", generator?.contains("generate_item_art") == true)
            val extras = gltf["extras"]!!.jsonObject
            assertEquals("$id stylized", true, extras["stylized"]!!.jsonPrimitive.booleanOrNull)
            assertEquals("$id phase", 13, extras["phase"]!!.jsonPrimitive.intOrNull)
            val verts = gltf["accessors"]!!.jsonArray[0].jsonObject["count"]!!.jsonPrimitive.intOrNull!!
            assertTrue("$id still grey-box cube ($verts verts)", verts > 24)
        }
    }

    @Test
    fun harborBlockoutUsesStylizedFishAndPortionMeshes() {
        val file = File(Shared.root, "assets/models/sunrise_pier_blockout.glb")
        val gltf = readGlbJson(file)
        assertEquals(
            "stylized-phase-13",
            gltf["extras"]!!.jsonObject["itemArt"]!!.jsonPrimitive.contentOrNull,
        )
        assertEquals(
            "modular-phase-14",
            gltf["extras"]!!.jsonObject["envArt"]!!.jsonPrimitive.contentOrNull,
        )
        assertEquals(
            "clips-phase-15",
            gltf["extras"]!!.jsonObject["characterArt"]!!.jsonPrimitive.contentOrNull,
        )
        assertEquals(
            "phase-16",
            gltf["extras"]!!.jsonObject["machineVfx"]!!.jsonPrimitive.contentOrNull,
        )
        val meshes = gltf["meshes"]!!.jsonArray
        val fish = meshes.first { it.jsonObject["name"]!!.jsonPrimitive.contentOrNull == "fish" }.jsonObject
        val portion = meshes.first { it.jsonObject["name"]!!.jsonPrimitive.contentOrNull == "portion" }.jsonObject
        val player = meshes.first { it.jsonObject["name"]!!.jsonPrimitive.contentOrNull == "player" }.jsonObject
        val worker = meshes.first { it.jsonObject["name"]!!.jsonPrimitive.contentOrNull == "worker_porter" }.jsonObject
        val fishPos = fish["primitives"]!!.jsonArray[0].jsonObject["attributes"]!!.jsonObject["POSITION"]!!.jsonPrimitive.intOrNull!!
        val portionPos = portion["primitives"]!!.jsonArray[0].jsonObject["attributes"]!!.jsonObject["POSITION"]!!.jsonPrimitive.intOrNull!!
        val playerPos = player["primitives"]!!.jsonArray[0].jsonObject["attributes"]!!.jsonObject["POSITION"]!!.jsonPrimitive.intOrNull!!
        val workerPos = worker["primitives"]!!.jsonArray[0].jsonObject["attributes"]!!.jsonObject["POSITION"]!!.jsonPrimitive.intOrNull!!
        assertTrue("fish should not use cube accessor 0", fishPos > 0)
        assertTrue("portion should not use cube accessor 0", portionPos > 0)
        assertTrue("player should not use cube accessor 0", playerPos > 0)
        assertTrue("worker should not use cube accessor 0", workerPos > 0)
        val names = gltf["nodes"]!!.jsonArray.mapNotNull { it.jsonObject["name"]?.jsonPrimitive?.contentOrNull }
        assertTrue("PlayerRod missing", "PlayerRod" in names)
        assertTrue("Worker_0 missing", "Worker_0" in names)
        assertTrue("WorkerBody_0 missing", "WorkerBody_0" in names)
        assertTrue("VfxBurst_0 missing", "VfxBurst_0" in names)
    }

    @Test
    fun characterModulesAreStylizedGlbs() {
        val names = listOf(
            "player", "player_rod", "customer_0", "customer_1", "customer_2",
            "worker_fisher", "worker_porter", "worker_operator", "worker_generic",
        )
        for (name in names) {
            val file = File(Shared.root, "assets/models/characters/$name.glb")
            assertTrue("$name missing ${file.path}", file.isFile)
            val gltf = readGlbJson(file)
            val extras = gltf["extras"]!!.jsonObject
            assertEquals("$name stylized", true, extras["stylized"]!!.jsonPrimitive.booleanOrNull)
            assertEquals("$name phase", 15, extras["phase"]!!.jsonPrimitive.intOrNull)
            val verts = gltf["accessors"]!!.jsonArray[0].jsonObject["count"]!!.jsonPrimitive.intOrNull!!
            assertTrue("$name too few verts ($verts)", verts > 24)
        }
    }

    private fun readGlbJson(file: File): kotlinx.serialization.json.JsonObject {
        val bytes = file.readBytes()
        val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("glTF magic", 0x46546C67, buf.int)
        assertEquals("glTF version", 2, buf.int)
        buf.int // length
        val chunkLen = buf.int
        val chunkType = buf.int
        assertEquals("JSON chunk", 0x4E4F534A, chunkType)
        val jsonBytes = ByteArray(chunkLen)
        buf.get(jsonBytes)
        val text = jsonBytes.toString(Charsets.UTF_8).trimEnd('\u0000')
        return Json.parseToJsonElement(text).jsonObject
    }
}
