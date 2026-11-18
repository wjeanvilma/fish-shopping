package com.willio.jeanvilma.fishshopping.core.world

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem

/**
 * Finish 3.0 Phase 12 — ecology habitat pockets boost species catch weights
 * when the active harbor matches and the current day-part is favored.
 */
object EcologySystem {
    fun habitatWeightMultPermille(
        content: ContentPack,
        tick: Long,
        harborId: String,
        speciesId: String,
    ): Int {
        val partId = FishingSystem.dayPartAt(content, tick).id
        var best = 1000
        for (habitat in content.ecology.habitats) {
            if (harborId !in habitat.harbors) continue
            if (partId !in habitat.favoredDayParts) continue
            val mult = habitat.speciesWeightMultPermille[speciesId] ?: continue
            if (mult > best) best = mult
        }
        return best
    }
}
