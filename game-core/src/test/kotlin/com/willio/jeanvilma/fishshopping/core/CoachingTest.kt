package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.sim.Coaching
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CoachingTest {
    @Test
    fun tutorialShowsNextWithStepDetail() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        val obj = Coaching.objective(Shared.content, state)
        assertNotNull(obj)
        assertEquals("NEXT", obj!!.eyebrow)
        assertTrue(obj.detail!!.startsWith("1/"))
        assertTrue(obj.text.contains("pier", ignoreCase = true))
    }

    @Test
    fun emptyBagFullTipAfterTutorial() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        state.tutorialIndex = Shared.content.tutorial.size
        state.completedQuests.addAll(Shared.content.quests.map { it.id })
        val cap = state.player.bag.capacityUnits
        while (state.player.bag.usedUnits() < cap) {
            state.player.bag.add("species.silver_sprat", 1)
        }
        val tip = Coaching.emptyStateTip(Shared.content, state)
        assertNotNull(tip)
        assertTrue(tip!!.contains("Bag full", ignoreCase = true))
    }

    @Test
    fun quietWhenLoopIsHealthy() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        state.tutorialIndex = Shared.content.tutorial.size
        state.completedQuests.addAll(Shared.content.quests.map { it.id })
        state.bumpStat(Stats.FISH_CAUGHT, 5)
        state.bumpStat(Stats.MACHINE_INPUTS, 2)
        assertNull(Coaching.emptyStateTip(Shared.content, state))
    }
}
