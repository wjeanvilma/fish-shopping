package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem

/**
 * First-session / empty-state coaching for the HUD (Phase 30 / Phase 6 Act II tips).
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
        val unlockedCounters = state.counters.filter { ct ->
            val def = content.harborsById[state.harborId]?.counters?.firstOrNull { it.id == ct.counterId }
            def != null && com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.isUnlocked(def, state)
        }
        val stocked = unlockedCounters.sumOf { it.stock.usedUnits() }
        if (waiting > 0 && stocked == 0) {
            return "Customers are waiting — stock the counter with portions"
        }
        val hasCrates =
            state.machines.any { m ->
                m.output.quantity("product.ice_packed_crate") > 0 || m.output.quantity("product.fillet_crate") > 0
            } ||
                bag.quantity("product.ice_packed_crate") > 0 ||
                bag.quantity("product.fillet_crate") > 0
        val harborCounters = content.harborsById[state.harborId]?.counters.orEmpty()
        val wholesaleLocked = harborCounters.any {
            it.kind.wire == "wholesale" &&
                !com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem.isUnlocked(it, state)
        }
        if (hasCrates && wholesaleLocked) {
            return "Crates need the Wholesale pad — buy it in Upgrades"
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

        val bagHasProducts = bag.contents().any { (id, qty) ->
            qty > 0 && id in content.productsById
        }
        if (stocked == 0 && (bagHasProducts || hasOutput) && state.stat(Stats.FISH_CAUGHT) > 0L) {
            return "Counter is empty — stock portions before the next customer"
        }

        val rep = content.reputation
        val encounters = ReputationSystem.encounters(state)
        if (encounters >= rep.minSample.toLong()) {
            val lostRatio = ((ReputationSystem.abandoned(state) * 1000L) / encounters).toInt()
            if (lostRatio >= rep.coachingLostRatioPermille) {
                return "Customers are walking out — keep the counter stocked and staffed"
            }
            val sales = ReputationSystem.served(state)
            if (sales > 0L) {
                val unmetRatio = ((state.stat(Stats.UNMET_PREFERENCE_SALES) * 1000L) / sales).toInt()
                if (unmetRatio >= 300) {
                    return "Guests notice missing favorites — stock preferred products"
                }
            }
        }

        if ("quest.first_ten_sales" in state.completedQuests &&
            "quest.first_hire" !in state.completedQuests &&
            state.workers.isEmpty()
        ) {
            return "No staff yet — hire a fisher or porter from the Staff panel"
        }

        val contractsUnlocked = content.contracts.requires.all {
            it in state.ownedUpgrades || it in state.completedQuests
        }
        if (contractsUnlocked &&
            state.activeContracts.isEmpty() &&
            state.contractOffers.isNotEmpty() &&
            state.stat(Stats.CONTRACTS_COMPLETED) == 0L
        ) {
            return "No active jobs — take a harbor contract from the Jobs board"
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

        if (encounters >= rep.minSample.toLong() &&
            ReputationSystem.scorePermille(content, state) >= rep.coachingPraiseScorePermille
        ) {
            return "Harbor reviews are glowing — keep preferred stock filled"
        }
        return null
    }
}
