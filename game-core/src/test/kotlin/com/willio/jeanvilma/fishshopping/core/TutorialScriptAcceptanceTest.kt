package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.TutorialTrigger
import com.willio.jeanvilma.fishshopping.core.sim.Coaching
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.TutorialScript
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Phase 21 — blueprint tutorial script acceptance.
 * Script advances on state events only; coaching tracks catch→cut→stock→sell→upgrade→hire.
 */
class TutorialScriptAcceptanceTest {
    @Test
    fun packPassesBlueprintAcceptanceContract() {
        val errors = TutorialScript.acceptanceErrors(Shared.content)
        assertEquals(emptyList<String>(), errors)
        assertEquals(8, TutorialScript.BLUEPRINT_SCRIPT_IDS.size)
        assertTrue(Shared.content.tutorial.size >= TutorialScript.BLUEPRINT_SCRIPT_IDS.size)
    }

    @Test
    fun everyTriggerIsStateEventNotAnimationTiming() {
        for (step in Shared.content.tutorial) {
            when (val t = step.advanceOn) {
                is TutorialTrigger.EnterZone -> assertTrue(t.zone.isNotBlank())
                is TutorialTrigger.Stat -> {
                    assertTrue(t.goal.stat.isNotBlank())
                    assertTrue(t.goal.atLeast >= 1)
                }
            }
        }
    }

    @Test
    fun coreLoopMilestonesAppearInOrder() {
        val ids = Shared.content.tutorial.map { it.id }
        val catch = ids.indexOf("tutorial.catch_three")
        val cut = ids.indexOf("tutorial.deliver_cutter")
        val stock = ids.indexOf("tutorial.stock_counter")
        val sell = ids.indexOf("tutorial.serve_customer")
        val upgrade = ids.indexOf("tutorial.buy_upgrade")
        val hire = ids.indexOf("tutorial.hire_staff")
        assertTrue(catch >= 0)
        assertTrue(catch < cut && cut < stock && stock < sell && sell < upgrade && upgrade < hire)
    }

    @Test
    fun coachingAdvancesCatchCutStockSellUpgradeHireViaStateEvents() {
        val content = Shared.content
        val state = GameState.newGame(content, HARBOR, 1)
        val milestones = TutorialScript.CORE_LOOP_MILESTONE_IDS
        val seen = mutableListOf<String>()

        while (state.tutorialIndex < content.tutorial.size) {
            val step = content.tutorial[state.tutorialIndex]
            val obj = Coaching.objective(content, state)
            assertEquals("NEXT", obj!!.eyebrow)
            assertEquals(step.text, obj.text)
            assertEquals("${state.tutorialIndex + 1}/${content.tutorial.size}", obj.detail)

            if (step.id in milestones) seen += step.id

            TutorialScript.satisfyCurrentStep(content, state)
            val before = state.tutorialIndex
            com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem.step(
                com.willio.jeanvilma.fishshopping.core.sim.StepContext(content, state),
            )
            assertEquals("step ${step.id} must advance on state event", before + 1, state.tutorialIndex)
        }

        assertEquals(milestones, seen)
        assertEquals(content.tutorial.size, state.tutorialIndex)
        val after = Coaching.objective(content, state)
        assertTrue(after == null || after.eyebrow != "NEXT")
    }

    @Test
    fun advanceAllHelperCompletesEntireScript() {
        val state = GameState.newGame(Shared.content, HARBOR, 42)
        val completed = TutorialScript.advanceAllViaStateEvents(Shared.content, state)
        assertEquals(Shared.content.tutorial.map { it.id }, completed)
        assertTrue(completed.containsAll(TutorialScript.BLUEPRINT_SCRIPT_IDS))
        assertEquals(Shared.content.tutorial.size, state.tutorialIndex)
    }
}
