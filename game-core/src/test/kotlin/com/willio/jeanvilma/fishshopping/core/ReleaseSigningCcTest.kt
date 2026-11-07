package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ReleaseSigningCc
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 5 — configuration-cache-safe release signing gate. */
class ReleaseSigningCcTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/release-signing-cc.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/release-signing-cc.json").readText()).jsonObject
        assertEquals(ReleaseSigningCc.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ReleaseSigningCc.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ReleaseSigningCc.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(ReleaseSigningCc.GRADLE_FILE, json.getValue("gradleFile").jsonPrimitive.content)
        val cc = json.getValue("configurationCache").jsonObject
        assertEquals(ReleaseSigningCc.FAIL_TASK, cc.getValue("failTask").jsonPrimitive.content)
        assertEquals(
            ReleaseSigningCc.FAIL_MESSAGE_NEEDLE,
            cc.getValue("failMessageNeedle").jsonPrimitive.content,
        )
        assertEquals(
            ReleaseSigningCc.CONFIG_CACHE_PROP,
            cc.getValue("gradlePropertiesKey").jsonPrimitive.content,
        )
        assertTrue(cc.getValue("enabledInGradleProperties").jsonPrimitive.content.toBoolean())
        val guards = cc.getValue("guardTasks").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(ReleaseSigningCc.GUARD_TASKS, guards)
    }

    @Test
    fun gradleUsesDependsOnNotDoFirst() {
        val gradle = File(root, "app/build.gradle.kts").readText()
        for (needle in ReleaseSigningCc.REQUIRED_GRADLE_NEEDLES) {
            assertTrue(needle, gradle.contains(needle))
        }
        for (needle in ReleaseSigningCc.FORBIDDEN_GRADLE_NEEDLES) {
            assertFalse(needle, gradle.contains(needle))
        }
        assertFalse(gradle.contains("tasks.findByName(taskName)?.doFirst"))
        assertTrue(gradle.contains("FISH_UPLOAD_FORCE_UNSIGNED"))

        val props = File(root, "gradle.properties").readText()
        assertTrue(props.contains("${ReleaseSigningCc.CONFIG_CACHE_PROP}=true"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(5, listing.getValue("releaseSigningCcPhase").jsonPrimitive.content.toInt())
        assertEquals(
            ReleaseSigningCc.CATALOG,
            listing.getValue("releaseSigningCcCatalog").jsonPrimitive.content,
        )

        val signing = Json.parseToJsonElement(File(root, "shared/android/release-signing.json").readText()).jsonObject
        val gate = signing.getValue("configurationCacheGate").jsonObject
        assertEquals(5, gate.getValue("finish2Phase").jsonPrimitive.content.toInt())
        assertEquals(ReleaseSigningCc.CATALOG, gate.getValue("catalog").jsonPrimitive.content)
        assertEquals(ReleaseSigningCc.FAIL_TASK, gate.getValue("failTask").jsonPrimitive.content)
    }
}
