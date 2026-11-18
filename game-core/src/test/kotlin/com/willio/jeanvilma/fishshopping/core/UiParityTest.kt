package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.UiParity
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 22 — Web↔Android panel feature parity depth. */
class UiParityTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, UiParity.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, UiParity.CATALOG).readText()).jsonObject
        assertEquals(UiParity.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(UiParity.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(UiParity.MARKER, json.getValue("uiParityMarker").jsonPrimitive.content)
        assertEquals(UiParity.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 25)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(22, listing.getValue("uiParityPhase").jsonPrimitive.content.toInt())
    }

    @Test
    fun panelMarkersAndContentReachFloors() {
        assertTrue(Shared.content.bank.loanProducts.size >= UiParity.LOAN_PRODUCT_MIN)
        assertTrue(Shared.content.bank.goalPresets.size >= UiParity.GOAL_PRESET_MIN)
        assertTrue(Shared.content.dailyGoals.objectives.size >= UiParity.DAILY_OBJECTIVE_MIN)

        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, UiParity.CATALOG).readText()).jsonObject
        val floors = catalog.getValue("featureFloors").jsonArray
        assertTrue(floors.size >= UiParity.FEATURE_FLOOR_MIN)
        for (id in UiParity.FEATURE_FLOOR_IDS) {
            assertTrue(
                id,
                floors.any { it.jsonObject.getValue("id").jsonPrimitive.content == id },
            )
        }

        val dash = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
        ).readText()
        assertTrue(dash.contains("loanInterestAccrued"))
        assertTrue(dash.contains("loanCollected"))

        val goals = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        ).readText()
        assertTrue(goals.contains("formatRushSeconds(product.termTicks)"))
        assertTrue(goals.contains("Reward: "))

        val staff = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StaffPanel.kt",
        ).readText()
        assertTrue(staff.contains("trainReason"))

        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        val phase22 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 22 }
        assertEquals("ui-parity-depth", phase22.getValue("id").jsonPrimitive.content)
        assertEquals("uiparity:validate", phase22.getValue("validate").jsonPrimitive.content)
    }
}
