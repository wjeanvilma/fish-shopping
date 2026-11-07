package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.cloud.CloudProductionPath
import com.willio.jeanvilma.fishshopping.cloud.CloudSyncCoordinator
import com.willio.jeanvilma.fishshopping.cloud.MemoryCloudBackend
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class CloudProductionPathTest {
    @Test
    fun catalogMatchesSharedProductionPathJson() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/cloud/production-path.json").isFile }
        }
        val json = JSONObject(File(root, "shared/cloud/production-path.json").readText())
        assertEquals(22, json.getInt("phase"))
        assertEquals(CloudProductionPath.AUTH_MODE, json.getString("authMode"))
        assertEquals(CloudProductionPath.DOCUMENT_PATH, json.getString("documentPath"))
        assertEquals(CloudProductionPath.CONFLICT_UI, json.getString("conflictUi"))
        assertEquals(CloudProductionPath.FIRESTORE_RULES, json.getString("firestoreRules"))

        val web = json.getJSONObject("envKeys").getJSONArray("web")
        assertEquals(CloudProductionPath.WEB_ENV_KEYS[0], web.getJSONObject(0).getString("name"))
        assertEquals(CloudProductionPath.WEB_ENV_KEYS[1], web.getJSONObject(1).getString("name"))
        val android = json.getJSONObject("envKeys").getJSONArray("android")
        assertEquals(CloudProductionPath.ANDROID_PROP_KEYS[0], android.getJSONObject(0).getString("name"))
        assertEquals(CloudProductionPath.ANDROID_PROP_KEYS[1], android.getJSONObject(1).getString("name"))

        val persisted = json.getJSONObject("guestRecovery").getJSONArray("persisted")
        assertTrue((0 until persisted.length()).any { persisted.getString(it) == "cloudRefreshToken" })
    }

    @Test
    fun readinessAndDocumentPath() {
        val missing = CloudProductionPath.readiness(null, null)
        assertFalse(missing.keysConfigured)
        assertEquals(CloudProductionPath.ANDROID_PROP_KEYS, missing.missingKeys)
        assertTrue(missing.conflictUiShipped)
        assertFalse(missing.firestoreRulesInRepo)

        val ready = CloudProductionPath.readiness("k", "p")
        assertTrue(ready.keysConfigured)
        assertEquals("users/abc/saves/harbor", CloudProductionPath.documentPathFor("abc"))
    }

    @Test
    fun exampleEnvFilesDocumentKeys() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "local.properties.example").isFile }
        }
        val androidExample = File(root, "local.properties.example").readText()
        assertTrue(androidExample.contains("fish.firebase.apiKey="))
        assertTrue(androidExample.contains("fish.firebase.projectId="))
        val webExample = File(root, "web/.env.example").readText()
        assertTrue(webExample.contains("VITE_FIREBASE_API_KEY="))
        assertTrue(webExample.contains("VITE_FIREBASE_PROJECT_ID="))
    }

    @Test
    fun coordinatorPersistsStableAccountId() {
        val coord = CloudSyncCoordinator(MemoryCloudBackend())
        val (settings, uid) = coord.ensureAccount(
            GameSettings(cloudSyncEnabled = true, cloudAccountId = "user-stable"),
        )
        assertEquals("user-stable", uid)
        assertEquals("user-stable", settings.cloudAccountId)
    }
}
