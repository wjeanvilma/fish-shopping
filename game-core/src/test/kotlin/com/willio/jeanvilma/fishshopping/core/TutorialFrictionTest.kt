package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.sim.TutorialFriction
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 22 (post-1.0) — tutorial friction copy + dwell nudges. */
class TutorialFrictionTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, TutorialFriction.CATALOG).isFile }
    }

    @Test
    fun catalogLocksCopyAndNudgesWithoutVersionBump() {
        val catalog = Json.parseToJsonElement(File(root, TutorialFriction.CATALOG).readText()).jsonObject
        assertEquals(TutorialFriction.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(TutorialFriction.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(
            TutorialFriction.FROZEN_AT_CONTENT_VERSION,
            catalog.getValue("contentVersion").jsonPrimitive.content,
        )
        assertEquals(
            TutorialFriction.SCHEMA_VERSION,
            catalog.getValue("schemaVersion").jsonPrimitive.content.toInt(),
        )

        val high = catalog.getValue("funnel").jsonObject
            .getValue("highFrictionStepIds").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(TutorialFriction.HIGH_FRICTION_STEP_IDS, high)

        val nudges = catalog.getValue("timing").jsonObject.getValue("nudges").jsonArray.map {
            it.jsonObject
        }
        assertEquals(TutorialFriction.NUDGES.size, nudges.size)
        for ((i, n) in TutorialFriction.NUDGES.withIndex()) {
            val row = nudges[i]
            assertEquals(n.stepId, row.getValue("stepId").jsonPrimitive.content)
            assertEquals(n.hintAfterMs, row.getValue("hintAfterMs").jsonPrimitive.content.toInt())
            assertEquals(n.nudge, row.getValue("nudge").jsonPrimitive.content)
        }

        assertNull(TutorialFriction.nudgeText(null, 99_000))
        assertNull(TutorialFriction.nudgeText("tutorial.catch_three", 7_999))
        assertEquals(
            "Tip: hold Cast to charge, release timing into the green Reel window",
            TutorialFriction.nudgeText("tutorial.catch_three", 8_000),
        )
        assertTrue(TutorialFriction.isHighFriction("tutorial.hire_staff"))
    }

    @Test
    fun packTextsMatchPatchesAndHudWiresDwellNudges() {
        val catalog = Json.parseToJsonElement(File(root, TutorialFriction.CATALOG).readText()).jsonObject
        val pack = Json.parseToJsonElement(File(root, TutorialFriction.CONTENT_PACK).readText()).jsonObject
        assertTrue(
            pack.getValue("contentVersion").jsonPrimitive.content in setOf("1.0.0", "1.0.1", "2.0.0"),
        )
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertTrue(pin.getValue("schemaVersion").jsonPrimitive.content.toInt() >= TutorialFriction.SCHEMA_VERSION)

        val tutorial = pack.getValue("tutorial").jsonArray.map { it.jsonObject }
        val patches = catalog.getValue("copyPatches").jsonArray.map { it.jsonObject }
        assertEquals(tutorial.size, patches.size)
        val byId = tutorial.associateBy { it.getValue("id").jsonPrimitive.content }
        for (p in patches) {
            val id = p.getValue("stepId").jsonPrimitive.content
            val step = byId.getValue(id)
            assertEquals(
                p.getValue("text").jsonPrimitive.content,
                step.getValue("text").jsonPrimitive.content,
            )
        }

        val frozen = catalog.getValue("frozenAdvanceOn").jsonObject
        for (step in tutorial) {
            val id = step.getValue("id").jsonPrimitive.content
            assertEquals(frozen.getValue(id), step.getValue("advanceOn"))
        }

        val app = File(root, "web/src/ui/App.tsx").readText()
        assertTrue(app.contains("frictionNudgeText"))
        assertTrue(app.contains("tutorialDwellMs"))
        val hud = File(
            root,
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
        ).readText()
        assertTrue(hud.contains("TutorialFriction.nudgeText"))
        assertTrue(hud.contains("tutorialDwellMs"))

        val coach = File(
            root,
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Coaching.kt",
        ).readText()
        assertTrue(coach.contains("tutorialStepId"))
    }
}
