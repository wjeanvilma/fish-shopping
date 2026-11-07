package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.lifecycle.LifecyclePolicy
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class LifecycleQaTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/lifecycle/browser-lifecycle.json").isFile }
    }

    @Test
    fun catalogDocumentsBrowserAndAndroidLifecycleGates() {
        val json = Json.parseToJsonElement(File(root, "shared/lifecycle/browser-lifecycle.json").readText()).jsonObject
        assertEquals(LifecyclePolicy.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(LifecyclePolicy.SCHEMA, json.getValue("schema").jsonPrimitive.content)

        val web = json.getValue("web").jsonObject
        assertTrue(web.getValue("webgl2Required").jsonPrimitive.content.toBoolean())
        assertEquals(LifecyclePolicy.WEBGL2_GATE_COPY, web.getValue("webgl2GateCopy").jsonPrimitive.content)
        assertTrue(web.getValue("contextLoss").jsonObject.getValue("reloadHarborOnRestore").jsonPrimitive.content.toBoolean())
        assertEquals(
            LifecyclePolicy.CONTEXT_LOSS_BANNER,
            web.getValue("contextLoss").jsonObject.getValue("bannerCopy").jsonPrimitive.content,
        )
        assertEquals("memory", web.getValue("storageUnavailable").jsonObject.getValue("fallback").jsonPrimitive.content)
        assertEquals(
            LifecyclePolicy.STORAGE_UNAVAILABLE_TOAST,
            web.getValue("storageUnavailable").jsonObject.getValue("titleToast").jsonPrimitive.content,
        )

        val android = json.getValue("android").jsonObject
        assertTrue(android.getValue("pauseSimOnStop").jsonPrimitive.content.toBoolean())
        assertTrue(android.getValue("checkpointOnStop").jsonPrimitive.content.toBoolean())
        assertEquals(LifecyclePolicy.ANDROID_SCREEN_ORIENTATION, android.getValue("screenOrientation").jsonPrimitive.content)
        val changes = android.getValue("configChangesHandled").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(LifecyclePolicy.ANDROID_CONFIG_CHANGES, changes)
        assertEquals(
            LifecyclePolicy.AUDIO_FOCUS_USAGE,
            android.getValue("audioFocus").jsonObject.getValue("usage").jsonPrimitive.content,
        )

        val fixtures = json.getValue("fixtures").jsonObject
        assertEquals(LifecyclePolicy.MIGRATE_THROUGH_SCHEMA, fixtures.getValue("migrateThroughSchema").jsonPrimitive.content.toInt())
        assertEquals(LifecyclePolicy.CURRENT_SCHEMA, fixtures.getValue("currentSchema").jsonPrimitive.content.toInt())
        val versions = fixtures.getValue("requiredLegacyVersions").jsonArray.map { it.jsonPrimitive.content.toInt() }
        assertEquals(LifecyclePolicy.LEGACY_FIXTURE_VERSIONS.toList(), versions)
    }

    @Test
    fun policyHelpersMatchVisibilityAndPageHideRules() {
        assertTrue(LifecyclePolicy.shouldPauseForVisibility(true))
        assertFalse(LifecyclePolicy.shouldPauseForVisibility(false))
        assertTrue(LifecyclePolicy.shouldCheckpointOnPageHide())
        assertTrue(LifecyclePolicy.shouldSuspendAudioWhenHidden(true))
        assertFalse(LifecyclePolicy.shouldSuspendAudioWhenHidden(false))
    }

    @Test
    fun androidManifestHandlesRotationAndProcessDeathRestoreSlots() {
        val manifest = File(root, "app/src/main/AndroidManifest.xml").readText()
        assertTrue(manifest.contains("android:screenOrientation=\"fullSensor\""))
        for (change in LifecyclePolicy.ANDROID_CONFIG_CHANGES) {
            assertTrue("missing configChange $change", manifest.contains(change))
        }
        assertTrue(manifest.contains("@xml/data_extraction_rules"))
        assertTrue(manifest.contains("@xml/backup_rules"))
        val audio = File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/AudioBus.kt").readText()
        assertTrue(audio.contains("AudioFocusRequest"))
        assertTrue(audio.contains("USAGE_GAME"))
        assertTrue(audio.contains("requestFocus"))
        assertTrue(audio.contains("abandonFocus"))
    }

    @Test
    fun everyRequiredLegacyFixtureMigratesThroughSchema19ToCurrent() {
        for (version in LifecyclePolicy.LEGACY_FIXTURE_VERSIONS) {
            assertTrue("legacy fixture version $version exceeds migrate-through", version <= LifecyclePolicy.MIGRATE_THROUGH_SCHEMA)
            val file = File(root, "shared/fixtures/legacy/snapshot-v$version-starter-line-t2500.json")
            assertTrue("missing ${file.name}", file.isFile)
            val raw = file.readText().trimEnd()
            val envelopeVersion = Regex("\"schemaVersion\"\\s*:\\s*(\\d+)").find(raw)!!.groupValues[1].toInt()
            assertEquals(version, envelopeVersion)
            val state = SnapshotCodec.decode(Shared.content, raw)
            assertEquals(2500L, state.tick)
            val encoded = SnapshotCodec.encode(Shared.content, state)
            assertTrue(encoded.startsWith("{\"schemaVersion\":${LifecyclePolicy.CURRENT_SCHEMA},"))
            // v19→v20 default: entitlement off until billing restore / purchase.
            assertFalse(state.fullHarborUnlock)
        }
    }
}
