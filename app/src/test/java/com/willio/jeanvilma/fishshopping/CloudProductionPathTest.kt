package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.cloud.CloudProductionPath
import com.willio.jeanvilma.fishshopping.cloud.CloudSyncCoordinator
import com.willio.jeanvilma.fishshopping.cloud.MemoryCloudBackend
import com.willio.jeanvilma.fishshopping.cloud.MemoryCloudOfflineQueue
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
        assertEquals(25, json.getInt("phase"))
        assertEquals(CloudProductionPath.PHASE, json.getInt("phase"))
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

        val offline = json.getJSONObject("offlineQueue")
        assertTrue(offline.getBoolean("enabled"))
        assertEquals(CloudProductionPath.OFFLINE_QUEUE_POLICY, offline.getString("policy"))
        assertEquals(CloudProductionPath.OFFLINE_QUEUE_PREFS, offline.getString("androidPrefsName"))
        val flushOn = offline.getJSONArray("flushOn")
        for (need in CloudProductionPath.FLUSH_ON) {
            assertTrue((0 until flushOn.length()).any { flushOn.getString(it) == need })
        }
        assertTrue(json.getJSONArray("cutoverChecklist").length() >= 4)
    }

    @Test
    fun readinessAndDocumentPath() {
        val missing = CloudProductionPath.readiness(null, null)
        assertFalse(missing.keysConfigured)
        assertEquals(CloudProductionPath.ANDROID_PROP_KEYS, missing.missingKeys)
        assertTrue(missing.conflictUiShipped)
        assertFalse(missing.firestoreRulesInRepo)
        assertTrue(missing.firestoreRulesSnippetShipped)
        assertTrue(missing.offlineQueueEnabled)

        val ready = CloudProductionPath.readiness("k", "p")
        assertTrue(ready.keysConfigured)
        assertTrue(ready.firestoreRulesSnippetShipped)
        assertFalse(ready.firestoreRulesInRepo)
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

    @Test
    fun offlineQueueLatestWinsAndFlushUploads() {
        val queue = MemoryCloudOfflineQueue()
        val backend = MemoryCloudBackend()
        val coord = CloudSyncCoordinator(backend, queue)
        val settings = GameSettings(cloudSyncEnabled = true, cloudAccountId = "user-q")

        queue.enqueue("snap-a", "user-q", 1_000L)
        queue.enqueue("snap-b", "user-q", 2_000L)
        assertEquals("snap-b", queue.load()?.snapshot)
        assertTrue(coord.hasPendingOfflinePush())

        val flushed = coord.flushOfflineQueue(settings)
        assertTrue(flushed.uploaded)
        assertFalse(flushed.queued)
        assertEquals("snap-b", backend.get("user-q"))
        assertFalse(coord.hasPendingOfflinePush())
    }

    @Test
    fun pushFailureEnqueuesSnapshot() {
        val queue = MemoryCloudOfflineQueue()
        val failing = object : com.willio.jeanvilma.fishshopping.cloud.CloudBackend {
            override val kind = "fail"
            override val available = true
            override fun ensureAccount(existingUid: String?, refreshToken: String?) =
                com.willio.jeanvilma.fishshopping.cloud.CloudAuthSession(existingUid ?: "u", null)
            override fun get(uid: String): String? = null
            override fun put(uid: String, snapshot: String) = error("offline")
            override fun clear(uid: String) = Unit
        }
        val coord = CloudSyncCoordinator(failing, queue)
        val result = coord.push(GameSettings(cloudSyncEnabled = true, cloudAccountId = "u"), "snap-x")
        assertFalse(result.uploaded)
        assertTrue(result.queued)
        assertEquals("snap-x", queue.load()?.snapshot)
    }

    /** Finish 3.0 Phase 17 — unavailable backend queues; sync-disabled skips; flush holds. */
    @Test
    fun phase17UnavailableQueuesAndSyncDisabledSkips() {
        val queue = MemoryCloudOfflineQueue()
        val nullBackend = com.willio.jeanvilma.fishshopping.cloud.NullCloudBackend()
        val offlineCoord = CloudSyncCoordinator(nullBackend, queue)
        val queued = offlineCoord.push(
            GameSettings(cloudSyncEnabled = true, cloudAccountId = "u17"),
            "snap-offline",
        )
        assertFalse(queued.uploaded)
        assertTrue(queued.queued)
        assertEquals("snap-offline", queue.load()?.snapshot)

        val held = offlineCoord.flushOfflineQueue(GameSettings(cloudSyncEnabled = true, cloudAccountId = "u17"))
        assertFalse(held.uploaded)
        assertTrue(held.queued)
        assertTrue(offlineCoord.hasPendingOfflinePush())

        val memory = MemoryCloudBackend()
        val disabled = CloudSyncCoordinator(memory, MemoryCloudOfflineQueue())
        val skipped = disabled.push(
            GameSettings(cloudSyncEnabled = false, cloudAccountId = "u17"),
            "snap-skip",
        )
        assertFalse(skipped.uploaded)
        assertFalse(skipped.queued)
        assertEquals(null, memory.get("u17"))
    }

    @Test
    fun phase17CloudQa2CatalogPinned() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/cloud-qa-2.json").isFile }
        }
        val json = JSONObject(File(root, "shared/ship/cloud-qa-2.json").readText())
        assertEquals(17, json.getInt("phase"))
        assertEquals(8, json.getInt("qaScenarioMin"))
        assertEquals(12, json.getInt("qaScenarioTotalMin"))
        assertEquals(8, json.getJSONArray("wave2ScenarioIds").length())
        val production = JSONObject(File(root, "shared/cloud/production-path.json").readText())
        assertEquals(17, production.getInt("finish3CloudQa2Phase"))
        val checklist = production.getJSONArray("cutoverChecklist")
        assertTrue((0 until checklist.length()).any {
            checklist.getString(it).contains("cloudqa2:validate")
        })
    }
}
