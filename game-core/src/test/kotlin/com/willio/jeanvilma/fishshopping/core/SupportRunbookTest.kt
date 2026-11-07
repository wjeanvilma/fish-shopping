package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import com.willio.jeanvilma.fishshopping.core.store.SupportRunbook
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 28 (post-1.0) — support / refund / restore runbook. */
class SupportRunbookTest {
    @Test
    fun catalogMatchesSharedOpsJson() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/ops/support-runbook.json").isFile }
        }
        val json = Json.parseToJsonElement(File(root, "shared/ops/support-runbook.json").readText()).jsonObject
        assertEquals(SupportRunbook.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SupportRunbook.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(SupportRunbook.PACKAGE_NAME, json.getValue("packageName").jsonPrimitive.content)
        assertEquals(StoreListing.SUPPORT_URL, json.getValue("supportUrl").jsonPrimitive.content)
        assertEquals(SupportRunbook.EMAIL, json.getValue("triage").jsonObject.getValue("email").jsonPrimitive.content)
        assertTrue(json.getValue("triage").jsonObject.getValue("mailto").jsonPrimitive.content.startsWith("mailto:"))
        assertTrue(json.getValue("restore").jsonObject.getValue("idempotent").jsonPrimitive.content.toBoolean())
        val skus = json.getValue("restore").jsonObject.getValue("skus").jsonArray.map { it.jsonPrimitive.content }
        for (sku in SupportRunbook.RESTORE_SKUS) {
            assertTrue(skus.contains(sku))
        }
        val issues = json.getValue("knownIssues").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(SupportRunbook.KNOWN_ISSUE_IDS, issues)
        val faq = json.getValue("faq").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }
        assertEquals(SupportRunbook.FAQ_IDS, faq)
        assertTrue(File(root, "web/public/support.html").readText().contains(SupportRunbook.EMAIL))
        assertTrue(File(root, "web/public/support.html").readText().contains("id=\"restore\""))
    }

    @Test
    fun listingPointsAtRunbookCatalog() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/store/listing.json").isFile }
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(28, listing.getValue("supportRunbookPhase").jsonPrimitive.content.toInt())
        assertEquals(
            SupportRunbook.CATALOG,
            listing.getValue("supportRunbookCatalog").jsonPrimitive.content,
        )
        assertEquals(SupportRunbook.SUPPORT_RESTORE_URL, SupportRunbook.SUPPORT_URL + SupportRunbook.RESTORE_ANCHOR)
    }
}
