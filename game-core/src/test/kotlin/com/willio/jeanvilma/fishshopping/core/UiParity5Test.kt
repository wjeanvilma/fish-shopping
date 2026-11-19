package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.UiParity5
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

/** Finish 5.0 Phase 23 — Web↔Android panel parity depth 5. */
class UiParity5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, UiParity5.CATALOG).isFile }

    @Test
    fun locksPhase23CatalogFloors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, UiParity5.CATALOG).readText()).jsonObject
        assertEquals(UiParity5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(UiParity5.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(UiParity5.MARKER, json.getValue("uiParity5Marker").jsonPrimitive.content)
        assertEquals(UiParity5.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(UiParity5.CLOSES_GAP))
        assertTrue(Shared.content.bank.loanProducts.size >= UiParity5.LOAN_PRODUCT_MIN)
        assertTrue(Shared.content.bank.goalPresets.size >= UiParity5.GOAL_PRESET_MIN)
        assertTrue(Shared.content.dailyGoals.objectives.size >= UiParity5.DAILY_OBJECTIVE_MIN)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(23, listing.getValue("uiParity5Phase").jsonPrimitive.content.toInt())
    }

    @Test
    fun panelMarkersAndWeeklyEndgameReachFloors() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, UiParity5.CATALOG).readText()).jsonObject
        val floors = catalog.getValue("featureFloors").jsonArray
        assertTrue(floors.size >= UiParity5.FEATURE_FLOOR_MIN)
        for (id in UiParity5.FEATURE_FLOOR_IDS) {
            assertTrue(
                id,
                floors.any { it.jsonObject.getValue("id").jsonPrimitive.content == id },
            )
        }
        for (id in UiParity5.NEW_FEATURE_FLOOR_IDS) {
            assertTrue(
                id,
                floors.any { it.jsonObject.getValue("id").jsonPrimitive.content == id },
            )
        }

        val goals = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        ).readText()
        assertTrue(goals.contains("weeklyGoals"))
        assertTrue(goals.contains("onClaimWeeklyGoal"))
        assertTrue(goals.contains("a11y.weeklyGoalsSection"))
        assertTrue(goals.contains("endgameTiers"))
        assertTrue(goals.contains("a11y.endgameSection"))

        val host = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
        ).readText()
        assertTrue(host.contains("frictionNudge"))
        assertTrue(host.contains("tutorialDwellMs"))
        assertTrue(host.contains("TutorialFriction.nudgeText"))
    }

    @Test
    fun kickoffAndDoDWired() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish5Kickoff.CATALOG).readText()).jsonObject
        val phase23 = kickoff.getValue("phases").jsonArray
            .map { it.jsonObject }
            .first { it.getValue("phase").jsonPrimitive.content.toInt() == 23 }
        assertEquals("ui-parity-5", phase23.getValue("id").jsonPrimitive.content)
        assertEquals("uiparity5:validate", phase23.getValue("validate").jsonPrimitive.content)
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject.getValue("uiParity5Incomplete").jsonPrimitive.boolean,
        )
    }
}
