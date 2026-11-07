package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.ClosedTesting
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 17 (post-1.0) — Play closed/internal testing track readiness. */
class ClosedTestingTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, ClosedTesting.CATALOG).isFile }
    }

    @Test
    fun catalogLocksInternalTrackAndPlayVitalsTriage() {
        val catalog = Json.parseToJsonElement(File(root, ClosedTesting.CATALOG).readText()).jsonObject
        assertEquals(ClosedTesting.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ClosedTesting.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(ClosedTesting.PACKAGE_NAME, catalog.getValue("packageName").jsonPrimitive.content)

        val tracks = catalog.getValue("tracks").jsonObject
        assertEquals(ClosedTesting.PRIMARY_TRACK, tracks.getValue("primary").jsonPrimitive.content)
        assertEquals(ClosedTesting.SECONDARY_TRACK, tracks.getValue("secondary").jsonPrimitive.content)

        val artifacts = catalog.getValue("artifacts").jsonObject
        assertEquals(ClosedTesting.CI_JOB, artifacts.getValue("ciJob").jsonPrimitive.content)
        assertEquals(ClosedTesting.CI_ARTIFACT, artifacts.getValue("ciArtifactName").jsonPrimitive.content)

        val triage = catalog.getValue("crashTriage").jsonObject
        assertEquals(ClosedTesting.CRASH_PROVIDER, triage.getValue("provider").jsonPrimitive.content)
        assertEquals(JsonNull, triage.getValue("sdk"))
        assertTrue(triage.getValue("blockerCriteria").jsonArray.size >= 3)

        val signoff = catalog.getValue("signoff").jsonObject
        assertEquals(ClosedTesting.SIGNOFF_STATUS, signoff.getValue("status").jsonPrimitive.content)
        val statuses = signoff.getValue("statusValues").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(ClosedTesting.SIGNOFF_STATUS_VALUES, statuses)
        assertTrue(ClosedTesting.isKnownSignoffStatus("signed_off"))
        assertEquals("Phase 18", signoff.getValue("productionPromotion").jsonPrimitive.content)
    }

    @Test
    fun preflightGatesAndCiArtifactsExist() {
        for (gate in ClosedTesting.PREFLIGHT_GATES) {
            assertTrue("missing $gate", File(root, gate).isFile)
        }
        val aab = Json.parseToJsonElement(File(root, "shared/android/aab-ci.json").readText()).jsonObject
        val catalog = Json.parseToJsonElement(File(root, ClosedTesting.CATALOG).readText()).jsonObject
        assertEquals(
            aab.getValue("artifacts").jsonObject.getValue("aab").jsonPrimitive.content,
            catalog.getValue("artifacts").jsonObject.getValue("aab").jsonPrimitive.content,
        )
        val ci = File(root, ".github/workflows/ci.yml").readText()
        assertTrue(ci.contains("android-release"))
        assertTrue(ci.contains("android-release-aab"))
        assertTrue(ci.contains("mapping.txt"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(ClosedTesting.PHASE, listing.getValue("closedTestingPhase").jsonPrimitive.content.toInt())
        assertEquals(ClosedTesting.CATALOG, listing.getValue("closedTestingCatalog").jsonPrimitive.content)
    }
}
