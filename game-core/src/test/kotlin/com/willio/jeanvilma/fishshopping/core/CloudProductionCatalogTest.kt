package com.willio.jeanvilma.fishshopping.core

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 25 — shared cloud production-path catalog (env keys, offline queue; rules not in-repo). */
class CloudProductionCatalogTest {
    @Test
    fun productionPathJsonDocumentsEnvKeysOfflineQueueAndGuestRecovery() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/cloud/production-path.json").isFile }
        }
        val text = File(root, "shared/cloud/production-path.json").readText()
        val json = Json.parseToJsonElement(text).jsonObject
        assertEquals(25, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals("identity_toolkit_anonymous", json.getValue("authMode").jsonPrimitive.content)
        assertEquals("users/{uid}/saves/harbor", json.getValue("documentPath").jsonPrimitive.content)
        assertEquals("not_shipped_ask_for_snippet", json.getValue("firestoreRules").jsonPrimitive.content)
        assertTrue(json.getValue("conflictUi").jsonPrimitive.content.contains("phase11"))

        val web = json.getValue("envKeys").jsonObject.getValue("web").jsonArray
        assertEquals("VITE_FIREBASE_API_KEY", web[0].jsonObject.getValue("name").jsonPrimitive.content)
        assertEquals("VITE_FIREBASE_PROJECT_ID", web[1].jsonObject.getValue("name").jsonPrimitive.content)
        val android = json.getValue("envKeys").jsonObject.getValue("android").jsonArray
        assertEquals("fish.firebase.apiKey", android[0].jsonObject.getValue("name").jsonPrimitive.content)
        assertEquals("fish.firebase.projectId", android[1].jsonObject.getValue("name").jsonPrimitive.content)

        val persisted = json.getValue("guestRecovery").jsonObject.getValue("persisted").jsonArray
            .map { it.jsonPrimitive.content }
        assertTrue(persisted.contains("cloudAccountId"))
        assertTrue(persisted.contains("cloudRefreshToken"))

        val offline = json.getValue("offlineQueue").jsonObject
        assertTrue(offline.getValue("enabled").jsonPrimitive.content.toBoolean())
        assertEquals("latest_snapshot_wins", offline.getValue("policy").jsonPrimitive.content)
        val flushOn = offline.getValue("flushOn").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(flushOn.containsAll(listOf("save_retry", "app_resume", "online_event", "settings_enable")))
        assertTrue(json.getValue("cutoverChecklist").jsonArray.size >= 4)

        assertTrue(File(root, "web/.env.example").readText().contains("VITE_FIREBASE_API_KEY="))
        assertTrue(File(root, "local.properties.example").readText().contains("fish.firebase.apiKey="))
    }
}
