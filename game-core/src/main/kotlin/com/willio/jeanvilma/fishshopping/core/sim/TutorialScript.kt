package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.TutorialStepDef
import com.willio.jeanvilma.fishshopping.core.content.TutorialTrigger
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem

/**
 * Phase 21 — blueprint tutorial script acceptance.
 *
 * Advances are driven only by [TutorialTrigger.EnterZone] / [TutorialTrigger.Stat]
 * (state events), never by animation timing or wall-clock waits.
 */
object TutorialScript {
    /**
     * Blueprint first-session teaching beats (8 steps). Content may insert extra
     * Act II beats (contracts / grill / plots) around these; relative order is fixed.
     */
    val BLUEPRINT_SCRIPT_IDS: List<String> = listOf(
        "tutorial.walk_to_pier",
        "tutorial.catch_three",
        "tutorial.deliver_cutter",
        "tutorial.collect_output",
        "tutorial.stock_counter",
        "tutorial.serve_customer",
        "tutorial.buy_upgrade",
        "tutorial.hire_staff",
    )

    /** Core loop milestones called out by the finish plan. */
    val CORE_LOOP_MILESTONE_IDS: List<String> = listOf(
        "tutorial.catch_three",
        "tutorial.deliver_cutter",
        "tutorial.stock_counter",
        "tutorial.serve_customer",
        "tutorial.buy_upgrade",
        "tutorial.hire_staff",
    )

    fun indexOf(content: ContentPack, id: String): Int =
        content.tutorial.indexOfFirst { it.id == id }

    /** Assert relative order of [ids] inside [content].tutorial. */
    fun assertOrdered(content: ContentPack, ids: List<String>): List<String> {
        val errors = mutableListOf<String>()
        var last = -1
        for (id in ids) {
            val idx = indexOf(content, id)
            if (idx < 0) {
                errors += "missing tutorial step '$id'"
                continue
            }
            if (idx <= last) {
                errors += "tutorial step '$id' at $idx must follow previous milestone (last=$last)"
            }
            last = idx
        }
        return errors
    }

    /** Every step must advance on zone enter or a stat threshold — never time/animation. */
    fun assertStateEventTriggers(content: ContentPack): List<String> {
        val errors = mutableListOf<String>()
        for (step in content.tutorial) {
            when (val t = step.advanceOn) {
                is TutorialTrigger.EnterZone -> {
                    if (t.zone.isBlank()) errors += "${step.id}: empty enter_zone"
                }
                is TutorialTrigger.Stat -> {
                    if (t.goal.atLeast < 1) errors += "${step.id}: stat threshold must be >= 1"
                    if (t.goal.stat.isBlank()) errors += "${step.id}: empty stat id"
                }
            }
        }
        return errors
    }

    fun acceptanceErrors(content: ContentPack): List<String> =
        assertStateEventTriggers(content) +
            assertOrdered(content, BLUEPRINT_SCRIPT_IDS) +
            assertOrdered(content, CORE_LOOP_MILESTONE_IDS)

    /**
     * Satisfies the current tutorial step's advance condition on [state] without
     * running locomotion / animation — pure state mutation for acceptance tests.
     */
    fun satisfyCurrentStep(content: ContentPack, state: GameState) {
        val step = content.tutorial.getOrNull(state.tutorialIndex) ?: return
        when (val t = step.advanceOn) {
            is TutorialTrigger.EnterZone -> {
                state.player.zoneId = t.zone
            }
            is TutorialTrigger.Stat -> {
                val have = state.stat(t.goal.stat)
                if (have < t.goal.atLeast) {
                    state.bumpStat(t.goal.stat, t.goal.atLeast - have)
                }
            }
        }
    }

    /**
     * Advances through every scripted tutorial step via state events only.
     * Returns the sequence of completed step ids (the step that just finished).
     */
    fun advanceAllViaStateEvents(content: ContentPack, state: GameState): List<String> {
        val completed = mutableListOf<String>()
        var guard = 0
        while (state.tutorialIndex < content.tutorial.size && guard < content.tutorial.size + 2) {
            guard++
            val before = state.tutorialIndex
            val step = content.tutorial[before]
            satisfyCurrentStep(content, state)
            val ctx = StepContext(content, state)
            ProgressionSystem.step(ctx)
            check(state.tutorialIndex == before + 1) {
                "expected '${step.id}' to advance on state event (index $before → ${state.tutorialIndex})"
            }
            check(ctx.events.any { it is GameEvent.TutorialAdvanced }) {
                "expected TutorialAdvanced for '${step.id}'"
            }
            completed += step.id
        }
        return completed
    }

    fun currentStep(content: ContentPack, state: GameState): TutorialStepDef? =
        content.tutorial.getOrNull(state.tutorialIndex)
}
