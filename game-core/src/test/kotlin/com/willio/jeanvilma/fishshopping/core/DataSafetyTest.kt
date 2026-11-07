package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.sim.Analytics
import com.willio.jeanvilma.fishshopping.core.store.DataSafety
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 8 (post-1.0) — Play Data safety form vs analytics + Autobackup. */
class DataSafetyTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/store/data-safety.json").isFile }
    }

    @Test
    fun catalogMatchesConstantsAndAnalyticsCore() {
        val catalog = Json.parseToJsonElement(File(root, DataSafety.CATALOG).readText()).jsonObject
        assertEquals(DataSafety.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DataSafety.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(DataSafety.PACKAGE_NAME, catalog.getValue("packageName").jsonPrimitive.content)
        assertEquals(StoreListing.PRIVACY_POLICY_URL, catalog.getValue("privacyPolicyUrl").jsonPrimitive.content)

        val overview = catalog.getValue("overview").jsonObject
        assertEquals(DataSafety.COLLECTS_OR_SHARES_USER_DATA, overview.getValue("collectsOrSharesUserData").jsonPrimitive.content.toBoolean())
        assertEquals(DataSafety.ENCRYPTION_IN_TRANSIT, overview.getValue("encryptedInTransit").jsonPrimitive.content.toBoolean())
        assertEquals(DataSafety.USERS_CAN_REQUEST_DELETION, overview.getValue("usersCanRequestDeletion").jsonPrimitive.content.toBoolean())
        assertEquals(DataSafety.INDEPENDENT_SECURITY_REVIEW, overview.getValue("independentSecurityReview").jsonPrimitive.content.toBoolean())

        val analytics = catalog.getValue("analytics").jsonObject
        assertTrue(analytics.getValue("noPiiClaim").jsonPrimitive.content.toBoolean())
        assertFalse(analytics.getValue("consentDefault").jsonPrimitive.content.toBoolean())
        val events = analytics.getValue("eventNames").jsonArray.map { it.jsonPrimitive.content }.toSet()
        assertEquals(Analytics.EVENT_NAMES, events)
        assertTrue(DataSafety.analyticsEventsMatchCore())
        for (key in analytics.getValue("forbiddenKeysInclude").jsonArray.map { it.jsonPrimitive.content }) {
            assertTrue("forbidden $key", DataSafety.forbiddenKeyCovered(key))
            assertTrue(key in Analytics.FORBIDDEN_KEYS)
        }

        val notCollected = catalog.getValue("dataNotCollected").jsonArray.map { it.jsonPrimitive.content }
        for (pii in listOf("name", "email_address", "phone_number", "user_payment_info", "precise_location")) {
            assertTrue(pii in notCollected)
        }

        val collectedIds = catalog.getValue("dataCollected").jsonArray
            .map { it.jsonObject }
            .filter { it.getValue("collected").jsonPrimitive.content.toBoolean() }
            .map { it.getValue("playTypeId").jsonPrimitive.content }
            .toSet()
        assertEquals(DataSafety.COLLECTED_PLAY_TYPE_IDS, collectedIds)
        for (row in catalog.getValue("dataCollected").jsonArray.map { it.jsonObject }) {
            if (row.getValue("collected").jsonPrimitive.content.toBoolean()) {
                assertFalse(row.getValue("shared").jsonPrimitive.content.toBoolean())
                assertFalse(row.getValue("required").jsonPrimitive.content.toBoolean())
            }
        }
    }

    @Test
    fun backupExcludesMatchHardeningAndXml() {
        val catalog = Json.parseToJsonElement(File(root, DataSafety.CATALOG).readText()).jsonObject
        val backup = catalog.getValue("androidBackup").jsonObject
        assertTrue(backup.getValue("excludesSaves").jsonPrimitive.content.toBoolean())
        assertTrue(backup.getValue("excludesEntitlementPrefs").jsonPrimitive.content.toBoolean())

        val prefs = backup.getValue("excludedSharedPreferences").jsonArray.map { it.jsonPrimitive.content }
        val files = backup.getValue("excludedFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(DataSafety.EXCLUDED_SHARED_PREFS, prefs)
        assertEquals(DataSafety.EXCLUDED_FILES, files)

        val hardening = Json.parseToJsonElement(File(root, "shared/android/release-hardening.json").readText()).jsonObject
        val hardenPrefs = hardening.getValue("backupExcludes").jsonObject
            .getValue("sharedPreferences").jsonArray.map { it.jsonPrimitive.content }
        val hardenFiles = hardening.getValue("backupExcludes").jsonObject
            .getValue("files").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(hardenPrefs, prefs)
        assertEquals(hardenFiles, files)

        val backupXml = File(root, "app/src/main/res/xml/backup_rules.xml").readText()
        val extractXml = File(root, "app/src/main/res/xml/data_extraction_rules.xml").readText()
        for (p in prefs) {
            assertTrue(backupXml.contains(p))
            assertTrue(extractXml.contains(p))
        }
        for (f in files) {
            assertTrue(backupXml.contains(f))
            assertTrue(extractXml.contains(f))
        }
    }

    @Test
    fun listingPointsAtCatalogAndPrivacyStaysAligned() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(DataSafety.PHASE, listing.getValue("dataSafetyPhase").jsonPrimitive.content.toInt())
        assertEquals(DataSafety.CATALOG, listing.getValue("dataSafetyCatalog").jsonPrimitive.content)
        val privacy = File(root, "web/public/privacy.html").readText().lowercase()
        assertTrue(privacy.contains("analytics"))
        assertTrue(privacy.contains("cloud"))
        assertTrue(privacy.contains("purchases"))
        assertTrue(privacy.contains("data-safety.json") || privacy.contains("phase 8"))
    }
}
