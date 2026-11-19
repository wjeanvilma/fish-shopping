package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem

/**
 * Finish 3.0 Phase 12 + Finish 4.0 Phase 11 + Finish 5.0 Phase 13 — ecology
 * habitat pockets boost species catch weights when the active harbor matches
 * and the current day-part is favored. Phase 13 expands to ≥24 habitats
 * covering species 101–125.
 */
object EcologySystem {
    const val BASELINE_WEIGHT_PERMILLE = 1000
    const val HABITAT_FLOOR_PHASE_12 = 8
    const val HABITAT_FLOOR_PHASE_11 = 16
    const val HABITAT_FLOOR_PHASE_13 = 24

    fun habitatWeightMultPermille(
        content: ContentPack,
        tick: Long,
        harborId: String,
        speciesId: String,
    ): Int {
        val partId = FishingSystem.dayPartAt(content, tick).id
        var best = BASELINE_WEIGHT_PERMILLE
        for (habitat in content.ecology.habitats) {
            if (harborId !in habitat.harbors) continue
            if (partId !in habitat.favoredDayParts) continue
            val mult = habitat.speciesWeightMultPermille[speciesId] ?: continue
            if (mult > best) best = mult
        }
        return best
    }

    /** Habitats that can affect [harborId] right now (day-part match). */
    fun activeHabitats(
        content: ContentPack,
        tick: Long,
        harborId: String,
    ): List<String> {
        val partId = FishingSystem.dayPartAt(content, tick).id
        return content.ecology.habitats
            .filter { harborId in it.harbors && partId in it.favoredDayParts }
            .map { it.id }
    }

    /** True when every [speciesIds] appears in at least one habitat weight map. */
    fun coversSpecies(content: ContentPack, speciesIds: Collection<String>): Boolean {
        if (speciesIds.isEmpty()) return true
        val weighted = mutableSetOf<String>()
        for (habitat in content.ecology.habitats) {
            weighted += habitat.speciesWeightMultPermille.keys
        }
        return speciesIds.all { it in weighted }
    }

    fun habitatCount(content: ContentPack): Int = content.ecology.habitats.size

    fun meetsPhase11Floor(content: ContentPack): Boolean =
        habitatCount(content) >= HABITAT_FLOOR_PHASE_11

    fun meetsPhase13Floor(content: ContentPack): Boolean =
        habitatCount(content) >= HABITAT_FLOOR_PHASE_13
}
