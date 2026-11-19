package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.a11y.AccessibilityDepth4
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.core.ship.A11yDepth4
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.I18nGrowth5
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 24 — a11y depth 4 + i18n growth ≥360. */
class A11yI18n5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, A11yDepth4.CATALOG).isFile }

    @Test
    fun locksPhase24CatalogFloors() {
        val root = repoRoot()
        val a11y = Json.parseToJsonElement(File(root, A11yDepth4.CATALOG).readText()).jsonObject
        val i18n = Json.parseToJsonElement(File(root, I18nGrowth5.CATALOG).readText()).jsonObject
        assertEquals(A11yDepth4.PHASE, a11y.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(I18nGrowth5.PHASE, i18n.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(A11yDepth4.SCHEMA, a11y.getValue("schema").jsonPrimitive.content)
        assertEquals(I18nGrowth5.SCHEMA, i18n.getValue("schema").jsonPrimitive.content)
        assertEquals(A11yDepth4.MARKER, a11y.getValue("a11yDepth4Marker").jsonPrimitive.content)
        assertEquals(I18nGrowth5.MARKER, i18n.getValue("i18nGrowth5Marker").jsonPrimitive.content)
        assertEquals(A11yDepth4.SCHEMA_VERSION, a11y.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(A11yDepth4.CLOSES_GAP))
        assertEquals(AccessibilityDepth4.SCREEN_SURFACE_MIN, AccessibilityDepth4.SCREEN_IDS.size)
        assertEquals(2, AccessibilityDepth4.LIVE_REGIONS.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(24, listing.getValue("a11yDepth4Phase").jsonPrimitive.content.toInt())
        assertEquals(24, listing.getValue("i18nGrowth5Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun uiKeysReachGrowthFloor() {
        val root = repoRoot()
        val en = Json.parseToJsonElement(File(root, "shared/i18n/ui-strings.en.json").readText()).jsonObject
        val keys = en.getValue("strings").jsonObject.keys
        assertTrue(keys.size >= I18nGrowth5.UI_STRING_KEY_MIN)
        assertTrue(keys.count { it.startsWith("a11y.") } >= I18nGrowth5.A11Y_STRING_KEY_MIN)
        assertTrue(UiStrings.t("a11y.weeklyGoalsSection").isNotBlank())
        assertTrue(UiStrings.t("a11y.dashboardLedgerSection").isNotBlank())
        assertTrue(UiStrings.t("a11y.warehouseSection").isNotBlank())
        assertTrue(UiStrings.t("a11y.frictionNudgeLive").isNotBlank())
    }

    @Test
    fun kickoffAndDoDWired() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        val phase24 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 24 }
        assertEquals("a11y-i18n-5", phase24.getValue("id").jsonPrimitive.content)
        assertEquals("a11yi18n5:validate", phase24.getValue("validate").jsonPrimitive.content)
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("a11yI18n5Incomplete").jsonPrimitive.boolean,
        )
        assertTrue(
            kickoff.getValue("baseline").jsonObject.getValue("i18nUiKeys").jsonPrimitive.content.toInt() >= 360,
        )
    }
}
