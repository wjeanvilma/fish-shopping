package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.audio.MusicPack
import com.willio.jeanvilma.fishshopping.core.audio.SfxPack
import com.willio.jeanvilma.fishshopping.core.ship.AudioPack2
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 21 — SFX/music pack 2. */
class AudioPack2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, AudioPack2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, AudioPack2.CATALOG).readText()).jsonObject
        assertEquals(AudioPack2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AudioPack2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(AudioPack2.NEW_STINGER_MIN, json.getValue("newStingerMin").jsonPrimitive.int)
        assertEquals(AudioPack2.NEW_BED_MIN, json.getValue("newBedMin").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(21, listing.getValue("audioPack2Phase").jsonPrimitive.content.toInt())
        assertEquals(
            AudioPack2.CATALOG,
            listing.getValue("audioPack2Catalog").jsonPrimitive.content,
        )

        for (id in AudioPack2.NEW_STINGERS) {
            assertTrue(json.getValue("newStingers").jsonArray.any {
                it.jsonPrimitive.content == id
            })
            assertTrue(id in SfxPack.PACK2_CUE_IDS)
            assertTrue(id in SfxPack.CUE_IDS)
        }
        for (id in AudioPack2.NEW_BEDS) {
            assertTrue(json.getValue("newBeds").jsonArray.any {
                it.jsonPrimitive.content == id
            })
            assertTrue(id in MusicPack.PACK2_BED_IDS)
            assertTrue(id in MusicPack.BED_IDS)
        }
    }

    @Test
    fun duckingFrozenAndPack2AssetsMirrored() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, AudioPack2.CATALOG).readText()).jsonObject
        val music = Json.parseToJsonElement(File(root, MusicPack.CATALOG).readText()).jsonObject
        val frozen = ship.getValue("frozenDucking").jsonObject
        val duck = music.getValue("ducking").jsonObject
        for ((k, v) in frozen) {
            val actual = duck.getValue(k).jsonPrimitive
            when {
                v.jsonPrimitive.booleanOrNull != null ->
                    assertEquals(k, v.jsonPrimitive.booleanOrNull, actual.booleanOrNull)
                v.jsonPrimitive.doubleOrNull != null ->
                    assertEquals(k, v.jsonPrimitive.doubleOrNull!!, actual.doubleOrNull!!, 1e-9)
                else -> assertEquals(k, v.jsonPrimitive.content, actual.content)
            }
        }
        assertEquals(0.35f, MusicPack.SFX_DUCK_FACTOR, 1e-5f)
        assertEquals(280, MusicPack.SFX_DUCK_RECOVERY_MS)
        assertEquals("festival", MusicPack.bedForContext(false, festivalActive = true))
        assertEquals("storm", MusicPack.bedForContext(true, stormActive = true))
        assertEquals("shop", MusicPack.bedForContext(true))

        for (id in AudioPack2.NEW_STINGERS) {
            val src = File(root, "${SfxPack.SOURCE_DIR}/$id.wav")
            val web = File(root, "${SfxPack.WEB_PUBLIC_DIR}/$id.wav")
            val raw = File(root, "${SfxPack.ANDROID_RAW_DIR}/sfx_$id.wav")
            assertTrue(src.isFile)
            assertTrue(web.isFile)
            assertTrue(raw.isFile)
            assertEquals(src.readBytes().toList(), web.readBytes().toList())
            assertEquals(src.readBytes().toList(), raw.readBytes().toList())
        }
        for (id in AudioPack2.NEW_BEDS) {
            val src = File(root, "${MusicPack.SOURCE_DIR}/$id.wav")
            val web = File(root, "${MusicPack.WEB_PUBLIC_DIR}/$id.wav")
            val raw = File(root, "${MusicPack.ANDROID_RAW_DIR}/music_$id.wav")
            assertTrue(src.isFile)
            assertTrue(web.isFile)
            assertTrue(raw.isFile)
            assertEquals(src.readBytes().toList(), web.readBytes().toList())
            assertEquals(src.readBytes().toList(), raw.readBytes().toList())
        }
    }
}
