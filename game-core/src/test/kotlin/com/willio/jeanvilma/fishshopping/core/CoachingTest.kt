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
        state.bumpStat(Stats.CONTRACTS_COMPLETED, 1)
        state.ownedUpgrades += "upgrade.display_case_ice"
        state.primaryCounterStock().stock.add("product.smoked_fillet", 1)
        val tip = Coaching.emptyStateTip(Shared.content, state)
        // Mastery coaching may still surface; other empty-state loop tips must stay quiet.
        assertTrue(
            tip == null ||
                tip == com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.coachingTip(
                    Shared.content,
                    state,
                ),
        )
    }

    @Test
    fun warnsAboutFragileCounterSpoilPressure() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        state.tutorialIndex = Shared.content.tutorial.size
        state.completedQuests.addAll(Shared.content.quests.map { it.id })
        state.bumpStat(Stats.FISH_CAUGHT, 5)
        state.bumpStat(Stats.MACHINE_INPUTS, 2)
        state.bumpStat(Stats.CONTRACTS_COMPLETED, 1)
        state.primaryCounterStock().stock.add("product.basic_portion", 2)
        val tip = Coaching.emptyStateTip(Shared.content, state)
        assertNotNull(tip)
        assertTrue(tip!!.contains("display case ice", ignoreCase = true))
    }

    @Test
    fun tipsWhenCounterEmptyWithPortionsReady() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        state.tutorialIndex = Shared.content.tutorial.size
        state.completedQuests.addAll(Shared.content.quests.map { it.id })
        state.bumpStat(Stats.FISH_CAUGHT, 5)
        state.bumpStat(Stats.CONTRACTS_COMPLETED, 1)
        state.player.bag.add("product.basic_portion", 2)
        val tip = Coaching.emptyStateTip(Shared.content, state)
        assertNotNull(tip)
        assertTrue(tip!!.contains("Counter is empty", ignoreCase = true))
    }

    @Test
    fun tipsWhenStaffUnlockedButNoneHired() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        state.tutorialIndex = Shared.content.tutorial.size
        state.completedQuests += "quest.first_ten_sales"
        state.bumpStat(Stats.FISH_CAUGHT, 5)
        state.bumpStat(Stats.MACHINE_INPUTS, 2)
        state.primaryCounterStock().stock.add("product.basic_portion", 1)
        val tip = Coaching.emptyStateTip(Shared.content, state)
        assertNotNull(tip)
        assertTrue(tip!!.contains("No staff yet", ignoreCase = true))
    }

    @Test
    fun tipsWhenJobsBoardHasOffersButNoneActive() {
        val state = GameState.newGame(Shared.content, HARBOR, 1)
        state.tutorialIndex = Shared.content.tutorial.size
        state.completedQuests += "quest.first_ten_sales"
        state.completedQuests += "quest.first_hire"
        state.bumpStat(Stats.FISH_CAUGHT, 5)
        state.bumpStat(Stats.MACHINE_INPUTS, 2)
        state.primaryCounterStock().stock.add("product.basic_portion", 1)
        state.contractOffers += com.willio.jeanvilma.fishshopping.core.sim.ContractOffer(
            id = "offer.test",
            templateId = "contract.portion_order",
            itemId = "product.basic_portion",
            quantity = 4,
            durationTicks = 2000,
            payout = 55,
            penalty = 15,
        )
        val tip = Coaching.emptyStateTip(Shared.content, state)
        assertNotNull(tip)
        assertTrue(tip!!.contains("No active jobs", ignoreCase = true))
    }
}
