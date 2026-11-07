package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.audio.MusicPack
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 20 (post-1.0) — authored music beds + ducking readiness. */
class MusicPackTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, MusicPack.CATALOG).isFile }
    }

    @Test
    fun catalogLocksHarborShopAndDucking() {
        val catalog = Json.parseToJsonElement(File(root, MusicPack.CATALOG).readText()).jsonObject
        assertEquals(MusicPack.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(MusicPack.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(MusicPack.DEFAULT_BED, catalog.getValue("defaultBed").jsonPrimitive.content)
        assertTrue(catalog.getValue("replacesProceduralAmbience").jsonPrimitive.content.toBoolean())

        val beds = catalog.getValue("beds").jsonArray.map { it.jsonObject }
        assertEquals(MusicPack.BED_IDS, beds.map { it.getValue("id").jsonPrimitive.content })

        val duck = catalog.getValue("ducking").jsonObject
        assertEquals(
            MusicPack.SFX_DUCK_FACTOR.toString(),
            duck.getValue("sfxDuckFactor").jsonPrimitive.content,
        )
        assertTrue(duck.getValue("focusLossSilence").jsonPrimitive.content.toBoolean())
        assertEquals("harbor", MusicPack.bedForStationOpen(false))
        assertEquals("shop", MusicPack.bedForStationOpen(true))
        assertEquals(0.35f, MusicPack.duckedMusicGain(1f, true), 1e-5f)
        assertEquals(1f, MusicPack.duckedMusicGain(1f, false), 1e-5f)
        assertEquals(0f, MusicPack.focusMusicScale("loss"), 1e-5f)
        assertEquals(MusicPack.FOCUS_TRANSIENT_DUCK_FACTOR, MusicPack.focusMusicScale("duck"), 1e-5f)
    }

    @Test
    fun wavMirrorsExistAndBusesUseAuthoredBeds() {
        val catalog = Json.parseToJsonElement(File(root, MusicPack.CATALOG).readText()).jsonObject
        var total = 0L
        for (bed in catalog.getValue("beds").jsonArray.map { it.jsonObject }) {
            val id = bed.getValue("id").jsonPrimitive.content
            val file = bed.getValue("file").jsonPrimitive.content
            val rawName = bed.getValue("androidRaw").jsonPrimitive.content
            assertEquals(MusicPack.androidRawName(id), rawName)
            val src = File(root, "${MusicPack.SOURCE_DIR}/$file")
            val web = File(root, "${MusicPack.WEB_PUBLIC_DIR}/$file")
            val raw = File(root, "${MusicPack.ANDROID_RAW_DIR}/$rawName.wav")
            assertTrue(src.isFile)
            assertTrue(web.isFile)
            assertTrue(raw.isFile)
            assertTrue(src.length() <= MusicPack.MAX_BYTES_PER_BED)
            assertEquals(src.readBytes().toList(), web.readBytes().toList())
            assertEquals(src.readBytes().toList(), raw.readBytes().toList())
            total += src.length()
        }
        assertTrue(total <= MusicPack.MAX_TOTAL_BYTES)

        val webBus = File(root, "web/src/audio/audioBus.ts").readText()
        assertTrue(webBus.contains("/music/") || webBus.contains("musicPublicPath"))
        assertTrue(webBus.contains("sfxDucking"))
        assertFalse(webBus.contains("Soft brown-ish noise"))

        val androidBus = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/AudioBus.kt",
        ).readText()
        assertTrue(androidBus.contains("MediaPlayer"))
        assertTrue(androidBus.contains("AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK"))
        assertFalse(androidBus.contains("Random(17)"))

        val host = File(root, "web/src/game/GameHost.ts").readText()
        assertTrue(host.contains("syncMusicBedFromPanels"))
        val vm = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt",
        ).readText()
        assertTrue(vm.contains("syncMusicBedFromPanels"))
    }
}
