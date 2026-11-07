package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.PublicShip
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 18 (post-1.0) — public production track + web 1.0 release readiness. */
class PublicShipTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, PublicShip.CATALOG).isFile }
    }

    @Test
    fun catalogLocksProductionTrackAndStoreTag() {
        val catalog = Json.parseToJsonElement(File(root, PublicShip.CATALOG).readText()).jsonObject
        assertEquals(PublicShip.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(PublicShip.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(PublicShip.PACKAGE_NAME, catalog.getValue("packageName").jsonPrimitive.content)
        assertEquals(PublicShip.RELEASE_TAG, catalog.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(PublicShip.CONTENT_VERSION, catalog.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(PublicShip.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.content.toInt())

        val android = catalog.getValue("android").jsonObject
        assertEquals(PublicShip.ANDROID_TRACK, android.getValue("track").jsonPrimitive.content)
        assertEquals(PublicShip.PROMOTE_FROM, android.getValue("promoteFrom").jsonPrimitive.content)
        assertEquals(
            PublicShip.ANDROID_CI_JOB,
            android.getValue("artifacts").jsonObject.getValue("ciJob").jsonPrimitive.content,
        )

        val web = catalog.getValue("web").jsonObject
        assertEquals(PublicShip.WEB_CI_JOB, web.getValue("ciJob").jsonPrimitive.content)
        assertEquals(PublicShip.WEB_CI_ARTIFACT, web.getValue("ciArtifactName").jsonPrimitive.content)

        val hashes = catalog.getValue("storeBuildHashes").jsonObject
        assertEquals(PublicShip.HASH_ALGORITHM, hashes.getValue("algorithm").jsonPrimitive.content)
        assertEquals(PublicShip.HASH_INPUT_FILES, hashes.getValue("inputFiles").jsonArray.map {
            it.jsonPrimitive.content
        })

        val signoff = catalog.getValue("signoff").jsonObject
        assertEquals(PublicShip.SIGNOFF_STATUS, signoff.getValue("status").jsonPrimitive.content)
        assertEquals(
            PublicShip.SIGNOFF_STATUS_VALUES,
            signoff.getValue("statusValues").jsonArray.map { it.jsonPrimitive.content },
        )
        assertTrue(PublicShip.isKnownSignoffStatus("live"))
    }

    @Test
    fun preflightGatesReleasePinAndListingWireUp() {
        for (gate in PublicShip.PREFLIGHT_GATES) {
            assertTrue("missing $gate", File(root, gate).isFile)
        }
        for (input in PublicShip.HASH_INPUT_FILES) {
            assertTrue("missing hash input $input", File(root, input).isFile)
        }

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        val store = pin.getValue("storeRelease").jsonObject
        assertEquals(PublicShip.PHASE, store.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(PublicShip.RELEASE_TAG, store.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(PublicShip.CATALOG, store.getValue("catalog").jsonPrimitive.content)
        assertEquals(PublicShip.ANDROID_TRACK, store.getValue("androidTrack").jsonPrimitive.content)
        val hashes = store.getValue("hashes").jsonObject
        assertEquals(PublicShip.HASH_ALGORITHM, hashes.getValue("algorithm").jsonPrimitive.content)
        assertTrue(hashes.getValue("inputs").jsonObject.isNotEmpty())
        val artifacts = hashes.getValue("artifacts").jsonObject
        // Artifacts may be null until local/CI build; slots must exist.
        assertTrue(artifacts.containsKey("androidAab"))
        assertTrue(artifacts.containsKey("androidMapping"))
        assertTrue(artifacts.containsKey("webDistIndex"))
        assertTrue(
            artifacts.getValue("androidAab") is JsonNull ||
                artifacts.getValue("androidAab").jsonPrimitive.content.length == 64,
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(PublicShip.PHASE, listing.getValue("publicShipPhase").jsonPrimitive.content.toInt())
        assertEquals(PublicShip.CATALOG, listing.getValue("publicShipCatalog").jsonPrimitive.content)

        val ci = File(root, ".github/workflows/ci.yml").readText()
        assertTrue(ci.contains("web-release"))
        assertTrue(ci.contains("web-release-dist"))
        assertTrue(ci.contains("public-ship:validate"))
    }
}
