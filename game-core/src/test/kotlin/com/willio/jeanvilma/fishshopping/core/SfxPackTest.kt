package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.audio.SfxPack
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 19 (post-1.0) — authored SFX pack readiness. */
class SfxPackTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, SfxPack.CATALOG).isFile }
    }

    @Test
    fun catalogLocksCatchCutSellUiAndBudgets() {
        val catalog = Json.parseToJsonElement(File(root, SfxPack.CATALOG).readText()).jsonObject
        assertEquals(SfxPack.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SfxPack.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(SfxPack.SAMPLE_RATE, catalog.getValue("sampleRate").jsonPrimitive.content.toInt())
        assertEquals(
            SfxPack.VOICE_COST_PER_CLIP,
            catalog.getValue("voiceCostPerClip").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            SfxPack.MAX_SFX_VOICES,
            catalog.getValue("maxSfxVoices").jsonPrimitive.content.toInt(),
        )

        val cues = catalog.getValue("cues").jsonArray.map { it.jsonObject }
        val ids = cues.map { it.getValue("id").jsonPrimitive.content }
        assertEquals(SfxPack.CUE_IDS, ids)
        val roles = cues.map { it.getValue("role").jsonPrimitive.content }.toSet()
        for (role in SfxPack.ROLE_REQUIRED) {
            assertTrue("missing role $role", role in roles)
        }

        val policy = catalog.getValue("busPolicy").jsonObject
        assertFalse(policy.getValue("proceduralFallback").jsonPrimitive.content.toBoolean())
        assertEquals(
            SfxPack.AMBIENCE_PROCEDURAL_UNTIL_PHASE,
            policy.getValue("ambienceRemainsProceduralUntilPhase").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun wavMirrorsExistAndBusesUseAuthoredPlayback() {
        val catalog = Json.parseToJsonElement(File(root, SfxPack.CATALOG).readText()).jsonObject
        var total = 0L
        for (cue in catalog.getValue("cues").jsonArray.map { it.jsonObject }) {
            val id = cue.getValue("id").jsonPrimitive.content
            val file = cue.getValue("file").jsonPrimitive.content
            val rawName = cue.getValue("androidRaw").jsonPrimitive.content
            assertEquals(SfxPack.androidRawName(id), rawName)
            val src = File(root, "${SfxPack.SOURCE_DIR}/$file")
            val web = File(root, "${SfxPack.WEB_PUBLIC_DIR}/$file")
            val raw = File(root, "${SfxPack.ANDROID_RAW_DIR}/$rawName.wav")
            assertTrue("missing $src", src.isFile)
            assertTrue("missing $web", web.isFile)
            assertTrue("missing $raw", raw.isFile)
            assertTrue(src.length() <= SfxPack.MAX_BYTES_PER_CLIP)
            assertEquals(src.readBytes().toList(), web.readBytes().toList())
            assertEquals(src.readBytes().toList(), raw.readBytes().toList())
            total += src.length()
        }
        assertTrue(total <= SfxPack.MAX_TOTAL_BYTES)

        val webBus = File(root, "web/src/audio/audioBus.ts").readText()
        assertTrue(webBus.contains("decodeAudioData"))
        assertFalse(webBus.contains("freq: 520"))

        val androidBus = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/AudioBus.kt",
        ).readText()
        assertTrue(androidBus.contains("SoundPool"))
        assertFalse(androidBus.contains("private val cues: Map<SfxCue"))

        val host = File(root, "web/src/game/GameHost.ts").readText()
        assertTrue(host.contains("audio.play(\"ui\")"))
        val vm = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt",
        ).readText()
        assertTrue(vm.contains("SfxCue.UI"))
    }
}
