package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.ContentCatalog
import org.junit.Assert.assertTrue
import org.junit.Test

class ContentCatalogTest {
    @Test
    fun summaryAndDetailCoverSpeciesRecipesQuests() {
        val pack = Shared.content
        val summary = ContentCatalog.summary(pack)
        assertTrue(summary.contains("species=${pack.species.size}"))
        assertTrue(summary.contains("bait=${pack.bait.size}"))
        assertTrue(summary.contains("trophySets=${pack.trophies.sets.size}"))
        assertTrue(summary.contains("recipes=${pack.recipes.size}"))
        assertTrue(summary.contains("quests=${pack.quests.size}"))

        val detail = ContentCatalog.detail(pack)
        assertTrue(detail.contains(pack.species.first().id))
        assertTrue(detail.contains(pack.bait.first().id))
        assertTrue(detail.contains(pack.trophies.sets.first().id))
        assertTrue(detail.contains(pack.recipes.first().id))
        assertTrue(detail.contains(pack.quests.first().id))
    }
}
