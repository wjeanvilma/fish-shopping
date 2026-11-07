package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem
import com.willio.jeanvilma.fishshopping.core.ship.FishingMastery
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.TimingTier
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 14 — fishing mastery. */
class FishingMasteryTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/fishing-mastery.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, FishingMastery.CATALOG).readText()).jsonObject
        assertEquals(FishingMastery.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FishingMastery.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(FishingMastery.TECHNIQUE_COUNT, json.getValue("techniqueCount").jsonPrimitive.content.toInt())
        assertEquals(FishingMastery.COACHING_TIP_COUNT, json.getValue("coachingTipCount").jsonPrimitive.content.toInt())
        assertTrue(Shared.content.fishingMastery.techniques.size >= 3)
        assertTrue(Shared.content.fishingMastery.coachingTips.size >= 5)
        for (id in FishingMastery.TECHNIQUE_IDS) {
            assertTrue(id, Shared.content.techniquesById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(14, listing.getValue("fishingMasteryPhase").jsonPrimitive.content.toInt())
        assertEquals(FishingMastery.CATALOG, listing.getValue("fishingMasteryCatalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(3, dod.getValue("quotas").jsonObject.getValue("masteryTechniques").jsonPrimitive.int)
        assertEquals(5, dod.getValue("quotas").jsonObject.getValue("masteryCoachingTips").jsonPrimitive.int)
    }

    @Test
    fun grantsXpUnlocksTechniqueAndView() {
        val fx = Json.parseToJsonElement(File(root, FishingMastery.PARITY_FIXTURE).readText()).jsonObject
        val afterCatch = fx.getValue("expectAfterCatch").jsonObject
        val afterLevel = fx.getValue("expectAfterLevel2Xp").jsonObject
        val speciesId = fx.getValue("catchSpeciesId").jsonPrimitive.content
        val content = Shared.content
        val sim = Simulation(
            content,
            GameState.newGame(
                content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        val ctx = StepContext(content, sim.state)
        MasterySystem.grantCatchXp(ctx, speciesId, TimingTier.PERFECT, rare = false)
        assertTrue(MasterySystem.xpOf(sim.state, speciesId) >= afterCatch.getValue("minXp").jsonPrimitive.int)
        assertTrue(
            MasterySystem.levelOf(content, sim.state, speciesId) >= afterCatch.getValue("minLevel").jsonPrimitive.int,
        )
        assertEquals(
            afterCatch.getValue("techniqueId").jsonPrimitive.content,
            MasterySystem.technique(content, sim.state).id,
        )
        assertTrue(ctx.events.any { it is GameEvent.MasteryXpGained })

        sim.state.speciesMasteryXp[speciesId] = afterLevel.getValue("xp").jsonPrimitive.int
        sim.state.speciesCatches[speciesId] = 1L
        assertEquals(
            afterLevel.getValue("level").jsonPrimitive.int,
            MasterySystem.levelOf(content, sim.state, speciesId),
        )
        val unlockedId = afterLevel.getValue("unlockedTechniqueId").jsonPrimitive.content
        assertTrue(MasterySystem.isUnlocked(content, sim.state, content.techniquesById.getValue(unlockedId)))

        sim.step(listOf(Command.SelectTechnique(unlockedId)))
        assertEquals(unlockedId, MasterySystem.technique(content, sim.state).id)
        assertTrue(MasterySystem.catchSpeedMultPermille(content, sim.state, speciesId) > 1000)

        val view = sim.view()
        assertEquals(unlockedId, view.activeTechniqueId)
        assertTrue(view.techniques.any { it.id == unlockedId && it.unlocked && it.active })
        val entry = view.speciesBook.entries.first { it.speciesId == speciesId }
        assertEquals(afterLevel.getValue("xp").jsonPrimitive.int, entry.masteryXp)
        assertEquals(afterLevel.getValue("level").jsonPrimitive.int, entry.masteryLevel)
    }
}
