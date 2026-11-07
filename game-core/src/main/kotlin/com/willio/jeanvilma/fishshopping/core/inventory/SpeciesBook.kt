package com.willio.jeanvilma.fishshopping.core.inventory

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SpeciesBookEntryView
import com.willio.jeanvilma.fishshopping.core.sim.SpeciesBookView
import java.util.TreeMap
import java.util.TreeSet

/**
 * Phase 8 species book: collection rollup from [GameState.speciesCatches] and trophies,
 * with harbor zones and recipes that consume each species.
 */
object SpeciesBook {

    fun build(content: ContentPack, state: GameState): SpeciesBookView {
        val harborsBySpecies = TreeMap<String, TreeSet<String>>()
        val baseOfRare = HashMap<String, String>()
        for (sp in content.species) {
            sp.rareUpgrade?.let { baseOfRare[it.to] = sp.id }
        }
        for (harbor in content.harbors) {
            val spotSpecies = harbor.fishingSpots.flatMap { it.species }.toSet()
            for (speciesId in spotSpecies) {
                harborsBySpecies.getOrPut(speciesId) { TreeSet() }.add(harbor.name)
                // Rare upgrade forms inherit the base species' harbors.
                content.speciesById[speciesId]?.rareUpgrade?.let { rare ->
                    harborsBySpecies.getOrPut(rare.to) { TreeSet() }.add(harbor.name)
                }
            }
        }

        val recipesBySpecies = TreeMap<String, TreeSet<String>>()
        for (recipe in content.recipes) {
            val machineName = content.machinesById[recipe.machine]?.name ?: recipe.machine
            val outputs = recipe.outputs.joinToString(", ") { content.itemName(it.item) }
            val label = if (outputs.isEmpty()) machineName else "$machineName → $outputs"
            for (input in recipe.inputs) {
                if (content.speciesById.containsKey(input.item)) {
                    recipesBySpecies.getOrPut(input.item) { TreeSet() }.add(label)
                }
            }
        }

        val entries = content.species.map { sp ->
            val catches = state.speciesCatches[sp.id] ?: 0L
            val trophy = state.trophies[sp.id]
            val discovered = catches > 0L || trophy != null
            val harbors = harborsBySpecies[sp.id]?.toList().orEmpty()
            SpeciesBookEntryView(
                speciesId = sp.id,
                name = if (discovered) sp.name else "???",
                discovered = discovered,
                catches = catches,
                harborNames = if (discovered) harbors else emptyList(),
                recipeNames = if (discovered) recipesBySpecies[sp.id]?.toList().orEmpty() else emptyList(),
                trophyBestSizePermille = if (discovered) trophy?.sizePermille else null,
                trophyBestValueCoins = if (discovered) trophy?.valueCoins else null,
                rarityWeight = sp.rarityWeight,
                baseSpeciesId = baseOfRare[sp.id],
            )
        }

        val discoveredCount = entries.count { it.discovered }
        return SpeciesBookView(
            entries = entries,
            discovered = discoveredCount,
            total = entries.size,
            empty = discoveredCount == 0,
        )
    }
}
