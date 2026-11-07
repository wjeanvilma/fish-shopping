package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.HotfixLane
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 29 (post-1.0) — 1.0.x hotfix lane versioning + staged rollout. */
class HotfixLaneTest {
    @Test
    fun catalogMatchesSharedShipJson() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/hotfix-lane.json").isFile }
        }
        val json = Json.parseToJsonElement(File(root, "shared/ship/hotfix-lane.json").readText()).jsonObject
        assertEquals(HotfixLane.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(HotfixLane.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(HotfixLane.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.content.toInt())
        assertEquals(HotfixLane.CI_JOB, json.getValue("ci").jsonObject.getValue("job").jsonPrimitive.content)
        assertEquals(
            HotfixLane.ARTIFACT_NAME,
            json.getValue("ci").jsonObject.getValue("artifactName").jsonPrimitive.content,
        )
        val steps = json.getValue("stagedRollout").jsonObject.getValue("steps").jsonArray
        assertEquals(3, steps.size)
        assertEquals(10, steps[0].jsonObject.getValue("percent").jsonPrimitive.content.toInt())
        assertEquals(50, steps[1].jsonObject.getValue("percent").jsonPrimitive.content.toInt())
        assertEquals(100, steps[2].jsonObject.getValue("percent").jsonPrimitive.content.toInt())
        assertEquals(HotfixLane.INITIAL_ROLLOUT_PERCENT, 10)
        assertEquals(HotfixLane.ROLLOUT_STEPS.map { it.percent }, listOf(10, 50, 100))
    }

    @Test
    fun versioningAcceptsPatchOnlyOnOneOhLine() {
        assertTrue(HotfixLane.isHotfixVersionName("1.0.1"))
        assertFalse(HotfixLane.isHotfixVersionName("1.1.0"))
        assertTrue(HotfixLane.isValidHotfixBump("1.0.1", "1.0.2"))
        assertFalse(HotfixLane.isValidHotfixBump("1.0.1", "1.0.3"))
        assertEquals("v1.0.2", HotfixLane.tagFor("1.0.2"))
        assertTrue(
            HotfixLane.validatePin(
                versionName = "1.0.1",
                contentVersion = "1.0.1",
                versionCode = 2,
                schemaVersion = 20,
                storeVersionName = "1.0.0",
                storeVersionCode = 1,
            ).isEmpty(),
        )
        assertTrue(
            HotfixLane.validatePin(
                versionName = "1.0.1",
                contentVersion = "1.0.1",
                versionCode = 1,
                schemaVersion = 20,
                storeVersionName = "1.0.0",
                storeVersionCode = 1,
            ).isNotEmpty(),
        )
        assertTrue(
            HotfixLane.validatePin(
                versionName = "1.0.1",
                contentVersion = "1.0.1",
                versionCode = 2,
                schemaVersion = 21,
                storeVersionName = "1.0.0",
                storeVersionCode = 1,
            ).any { it.contains("schemaVersion") },
        )
    }

    @Test
    fun listingAndPinPointAtHotfixCatalog() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/store/listing.json").isFile }
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(29, listing.getValue("hotfixLanePhase").jsonPrimitive.content.toInt())
        assertEquals(HotfixLane.CATALOG, listing.getValue("hotfixLaneCatalog").jsonPrimitive.content)
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(HotfixLane.CATALOG, pin.getValue("hotfixLane").jsonPrimitive.content)
        val publicShip = Json.parseToJsonElement(File(root, "shared/ship/public-ship.json").readText()).jsonObject
        val rollout = publicShip.getValue("android").jsonObject.getValue("stagedRollout").jsonObject
        assertEquals(29, rollout.getValue("hotfixLanePhase").jsonPrimitive.content.toInt())
        assertEquals(HotfixLane.CATALOG, rollout.getValue("hotfixLaneCatalog").jsonPrimitive.content)
    }
}
