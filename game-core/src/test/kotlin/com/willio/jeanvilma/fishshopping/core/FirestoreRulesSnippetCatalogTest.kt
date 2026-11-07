package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.FirestoreRulesSnippet
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Finish 2.0 Phase 26 — Firestore rules snippet ship/contract catalogs.
 * Snippet-only; deployable firestore.rules must not exist in-repo.
 */
class FirestoreRulesSnippetCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, FirestoreRulesSnippet.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, FirestoreRulesSnippet.CATALOG).readText()).jsonObject
        assertEquals(FirestoreRulesSnippet.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FirestoreRulesSnippet.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(FirestoreRulesSnippet.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(FirestoreRulesSnippet.QA_SCENARIO_MIN, json.getValue("qaScenarioMin").jsonPrimitive.int)
        assertEquals(FirestoreRulesSnippet.SNIPPET_PATH, json.getValue("snippetPath").jsonPrimitive.content)
        assertEquals(FirestoreRulesSnippet.SNIPPET_MODE, json.getValue("snippetMode").jsonPrimitive.content)
        assertEquals(FirestoreRulesSnippet.DOCUMENT_PATH, json.getValue("documentPath").jsonPrimitive.content)
        assertEquals(23, json.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(
            FirestoreRulesSnippet.FIRESTORE_SNIPPET_MARKER,
            json.getValue("firestoreSnippetMarker").jsonPrimitive.content,
        )
    }

    @Test
    fun snippetExistsAndDeployableRulesForbidden() {
        val root = repoRoot()
        val snippet = File(root, FirestoreRulesSnippet.SNIPPET_PATH)
        assertTrue(snippet.isFile)
        val text = snippet.readText()
        assertTrue(text.contains("REVIEWED SNIPPET ONLY"))
        assertTrue(text.contains("users/{userId}/saves/{docId}"))
        assertTrue(text.contains("docId == 'harbor'"))
        for (field in FirestoreRulesSnippet.DOCUMENT_FIELDS) {
            assertTrue(text.contains(field))
        }
        for (forbidden in FirestoreRulesSnippet.FORBIDDEN_DEPLOYABLE_PATHS) {
            assertFalse(File(root, forbidden).exists())
        }

        val production = Json.parseToJsonElement(File(root, FirestoreRulesSnippet.PRODUCTION_PATH_CATALOG).readText()).jsonObject
        assertEquals(FirestoreRulesSnippet.SNIPPET_PATH, production.getValue("firestoreRules").jsonPrimitive.content)
        assertEquals(
            FirestoreRulesSnippet.SNIPPET_MODE,
            production.getValue("firestoreRulesMode").jsonPrimitive.content,
        )
        assertEquals(26, production.getValue("finish2FirestoreSnippetPhase").jsonPrimitive.content.toInt())
        assertEquals(25, production.getValue("phase").jsonPrimitive.content.toInt())

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(26, listing.getValue("firestoreRulesSnippetPhase").jsonPrimitive.content.toInt())
        assertEquals(
            FirestoreRulesSnippet.CATALOG,
            listing.getValue("firestoreRulesSnippetCatalog").jsonPrimitive.content,
        )

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(
            FirestoreRulesSnippet.CATALOG,
            pin.getValue("firestoreRulesSnippet").jsonPrimitive.content,
        )
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-firestore-rules-snippet.json"
            },
        )
    }
}
