package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem

/**
 * First-session / empty-state coaching for the HUD (Phase 30 / Phase 4 spoil tips).
 * Presentation-only: never mutates state. Mirrored by web/src/engine/coaching.ts.
 */
data class ObjectiveView(
    /** Short label: NEXT / GOAL / TIP */
    val eyebrow: String,
    val text: String,
    /** Optional progress like "2/7" for tutorial steps. */
    val detail: String? = null,
)

object Coaching {
    fun objective(content: ContentPack, state: GameState): ObjectiveView? {
        val tutorial = content.tutorial
        if (state.tutorialIndex < tutorial.size) {
            val step = tutorial[state.tutorialIndex]
            return ObjectiveView(
                eyebrow = "NEXT",
                text = step.text,
                detail = "${state.tutorialIndex + 1}/${tutorial.size}",
            )
        }

        val activeQuest = content.quests.firstOrNull { q ->
            q.id !in state.completedQuests && ProgressionSystem.requirementsMet(state, q)
        }
        if (activeQuest != null) {
            val progress = state.stat(activeQuest.goal.stat).coerceAtMost(activeQuest.goal.atLeast)
            return ObjectiveView(
                eyebrow = "GOAL",
                text = activeQuest.description,
                detail = "$progress/${activeQuest.goal.atLeast}",
            )
        }

        val tip = emptyStateTip(content, state) ?: return null
        return ObjectiveView(eyebrow = "TIP", text = tip)
    }

    /** Situational empty-state hints after the scripted tutorial. */
    fun emptyStateTip(content: ContentPack, state: GameState): String? {
        val bag = state.player.bag
        if (bag.usedUnits() >= bag.capacityUnits && bag.usedUnits() > 0) {
            return "Bag full — deliver fish to a station pad"
        }
        val waiting = state.customers.count { it.arrived }
        val stocked = state.counters.sumOf { it.stock.usedUnits() }
        if (waiting > 0 && stocked == 0) {
            return "Customers are waiting — stock the counter with portions"
        }
        val hasOutput = state.machines.any { it.output.usedUnits() > 0 }
        if (hasOutput && bag.usedUnits() == 0) {
            return "Collect finished portions from a station output pad"
        }
        if (bag.usedUnits() == 0 && state.stat(Stats.FISH_CAUGHT) == 0L) {
            return "Walk to the pier end and cast to catch fish"
        }
        if (bag.contents().keys.any { it.startsWith("species.") } &&
            state.stat(Stats.MACHINE_INPUTS) == 0L
        ) {
            return "Drop raw fish on a teal input pad to start cutting"
        }

        if (EconomySystem.unlocked(content, state)) {
            val fragileOnCounter = state.counters.any { counter ->
                counter.stock.contents().any { (id, qty) ->
                    qty > 0 && EconomySystem.spoilTier(content, id) >= 3
                }
            }
            if (fragileOnCounter && "upgrade.display_case_ice" !in state.ownedUpgrades) {
                return "Fragile counter stock spoils first — buy display case ice"
            }
            val fishInBag = bag.contents().any { (id, qty) ->
                qty > 0 && id in content.speciesById
            }
            if (fishInBag && "upgrade.ice_box" !in state.ownedUpgrades) {
                return "Raw fish in your bag will spoil — buy an ice box"
            }
            if (stocked >= 8 && waiting == 0) {
                return "Counter stock is aging — sell before the next spoil cycle"
            }
        }
        return null
    }
}
