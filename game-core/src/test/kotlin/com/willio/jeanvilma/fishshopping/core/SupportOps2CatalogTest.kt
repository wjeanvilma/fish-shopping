package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.SupportOps2
import com.willio.jeanvilma.fishshopping.core.store.SupportRunbook
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 28 — Support/ops 2.0 ship + ops catalogs. */
class SupportOps2CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, SupportOps2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, SupportOps2.CATALOG).readText()).jsonObject
        assertEquals(SupportOps2.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(SupportOps2.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(SupportOps2.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(SupportOps2.FEATURE_FAQ_MIN, ship.getValue("featureFaqMin").jsonPrimitive.int)
        assertEquals(SupportOps2.REFUND_MATRIX_ROW_MIN, ship.getValue("refundMatrixRowMin").jsonPrimitive.int)
        assertEquals(SupportOps2.KNOWN_ISSUE_2_MIN, ship.getValue("knownIssue2Min").jsonPrimitive.int)
        assertEquals(SupportOps2.OPS_CATALOG, ship.getValue("opsCatalog").jsonPrimitive.content)
        assertEquals(23, ship.getValue("schemaVersion").jsonPrimitive.int)
    }

    @Test
    fun ops2FaqMatrixAndHtmlSections() {
        val root = repoRoot()
        val ops2 = Json.parseToJsonElement(File(root, SupportOps2.OPS_CATALOG).readText()).jsonObject
        assertEquals(
            SupportOps2.SUPPORT_OPS_2_MARKER,
            ops2.getValue("supportOps2Marker").jsonPrimitive.content,
        )
        val faq = ops2.getValue("featureFaq").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(faq.containsAll(SupportOps2.FEATURE_FAQ_IDS))
        val matrix = ops2.getValue("refundMatrix").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(matrix.containsAll(SupportOps2.REFUND_MATRIX_IDS))
        val issues = ops2.getValue("knownIssues2").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(issues.containsAll(SupportOps2.KNOWN_ISSUE_2_IDS))

        val runbook = Json.parseToJsonElement(File(root, SupportOps2.EXTENDS_RUNBOOK).readText()).jsonObject
        assertEquals(28, runbook.getValue("finish2OpsPhase").jsonPrimitive.content.toInt())
        assertEquals(SupportOps2.OPS_CATALOG, runbook.getValue("ops2Catalog").jsonPrimitive.content)
        assertEquals(SupportRunbook.FINISH2_OPS_PHASE, 28)

        val html = File(root, "web/public/support.html").readText()
        for (id in SupportOps2.SUPPORT_HTML_SECTIONS) {
            assertTrue(html.contains("id=\"$id\""))
        }
        assertTrue(html.contains("Refund matrix"))
        assertTrue(html.contains("<table>"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(28, listing.getValue("supportOps2Phase").jsonPrimitive.content.toInt())
        assertEquals(SupportOps2.CATALOG, listing.getValue("supportOps2Catalog").jsonPrimitive.content)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(SupportOps2.CATALOG, pin.getValue("supportOps2").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-support-ops-2.0.json"
            },
        )
    }
}
