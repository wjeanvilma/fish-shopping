package com.willio.jeanvilma.fishshopping.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
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

/**
 * Phase 14 — authored pier/machine/counter modules and harbor socket contract
 * (same glTF 2.0 files Filament AssetLoader / Three.js GLTFLoader consume).
 */
class EnvArtTest {

    private val modules = listOf(
        "pier", "ground", "zone", "counter",
        "cutter", "smoker", "grill", "chiller", "fryer", "packer",
    )

    private val harbors = listOf(
        "sunrise_pier", "moon_cove", "obsidian_jetty", "northlight_harbor", "grand_marina",
        "coral_lagoon", "storm_quay", "ember_wharf",
    )

    @Test
    fun authoredModuleGlbsExistAndAreStylized() {
        for (name in modules) {
            val file = File(Shared.root, "assets/models/modules/$name.glb")
            assertTrue("$name missing", file.isFile)
            val gltf = readGlbJson(file)
            val generator = gltf["asset"]!!.jsonObject["generator"]!!.jsonPrimitive.contentOrNull
            assertTrue(generator?.contains("generate_env_modules") == true)
            val extras = gltf["extras"]!!.jsonObject
            assertEquals(true, extras["stylized"]!!.jsonPrimitive.booleanOrNull)
            assertEquals(14, extras["phase"]!!.jsonPrimitive.intOrNull)
            assertEquals(name, extras["module"]!!.jsonPrimitive.contentOrNull)
            val verts = gltf["accessors"]!!.jsonArray[0].jsonObject["count"]!!.jsonPrimitive.intOrNull!!
            assertTrue("$name still a cube ($verts)", verts > 24)
        }
    }

    @Test
    fun harborBlockoutsEmbedModulesAndKeepPresenterSockets() {
        for (harbor in harbors) {
            val file = File(Shared.root, "assets/models/${harbor}_blockout.glb")
            assertTrue(file.isFile)
            val gltf = readGlbJson(file)
            val extras = gltf["extras"]!!.jsonObject
            val envArt = extras["envArt"]!!.jsonPrimitive.contentOrNull!!
            assertTrue("$harbor envArt", envArt.startsWith("modular-phase-14"))
            assertEquals("stylized-phase-13", extras["itemArt"]!!.jsonPrimitive.contentOrNull)
            if (harbor == "sunrise_pier" || harbor == "coral_lagoon" || harbor == "storm_quay") {
                assertEquals("authored-phase-19", extras["harborArt"]!!.jsonPrimitive.contentOrNull)
            }

            val names = gltf["nodes"]!!.jsonArray.map {
                it.jsonObject["name"]!!.jsonPrimitive.contentOrNull!!
            }.toSet()
            assertTrue("$harbor Player", "Player" in names)
            assertTrue("$harbor PlayerBody", "PlayerBody" in names)
            assertTrue("$harbor Water", "Water" in names)
            assertTrue("$harbor Footprint", names.any { it.startsWith("Footprint_") })
            assertTrue("$harbor Zone", names.any { it.startsWith("Zone_") })
            assertTrue("$harbor Bag", names.any { it.startsWith("Bag_0_") })
            assertTrue("$harbor Fly", names.any { it.startsWith("Fly_0_") })
            assertTrue("$harbor In", names.any { it.startsWith("In_") })
            assertTrue("$harbor Out", names.any { it.startsWith("Out_") })
            assertTrue("$harbor Stock", names.any { it.startsWith("Stock_") })
            assertTrue("$harbor Pier/Ground", "Pier" in names || names.any { it.startsWith("Ground_") })

            val meshes = gltf["meshes"]!!.jsonArray
            val cutter = meshes.firstOrNull {
                it.jsonObject["name"]!!.jsonPrimitive.contentOrNull == "cutter"
            }
            if (cutter != null) {
                val pos = cutter.jsonObject["primitives"]!!.jsonArray[0]
                    .jsonObject["attributes"]!!.jsonObject["POSITION"]!!.jsonPrimitive.intOrNull!!
                assertTrue("$harbor cutter still cube", pos > 8)
            }
        }
    }

    private fun readGlbJson(file: File): kotlinx.serialization.json.JsonObject {
        val bytes = file.readBytes()
        val buf = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("glTF magic", 0x46546C67, buf.int)
        assertEquals("glTF version", 2, buf.int)
        buf.int
        val chunkLen = buf.int
        assertEquals("JSON chunk", 0x4E4F534A, buf.int)
        val jsonBytes = ByteArray(chunkLen)
        buf.get(jsonBytes)
        return Json.parseToJsonElement(jsonBytes.toString(Charsets.UTF_8).trimEnd('\u0000')).jsonObject
    }
}
