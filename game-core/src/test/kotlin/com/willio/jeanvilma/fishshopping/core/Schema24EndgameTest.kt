package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.progression.EndgameSystem
import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Schema24Endgame
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 15 — schema 24 + endgame deepen. */
class Schema24EndgameTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Schema24Endgame.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Schema24Endgame.CATALOG).readText()).jsonObject
        assertEquals(Schema24Endgame.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Schema24Endgame.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Schema24Endgame.MARKER, json.getValue("schema24EndgameMarker").jsonPrimitive.content)
        assertEquals(Schema24Endgame.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(Schema24Endgame.TIER_COUNT, json.getValue("tierCount").jsonPrimitive.int)
        assertEquals(Schema24Endgame.CHALLENGE_COUNT, json.getValue("challengeCount").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 24)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(15, listing.getValue("schema24EndgamePhase").jsonPrimitive.content.toInt())
        assertEquals(Schema24Endgame.CATALOG, listing.getValue("schema24EndgameCatalog").jsonPrimitive.content)
    }

    @Test
    fun contentHasFourTiersAndChallenges() {
        assertTrue(Shared.content.endgame.tiers.size >= 4)
        assertTrue(Shared.content.endgame.challenges.size >= 4)
        for (id in Schema24Endgame.TIER_IDS) {
            assertTrue(id, Shared.content.endgameTiersById.containsKey(id))
        }
        for (id in Schema24Endgame.CHALLENGE_IDS) {
            assertTrue(id, Shared.content.endgameChallengesById.containsKey(id))
        }
        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish3Kickoff.CATALOG).readText()).jsonObject
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 15,
        )
        assertEquals(24, kickoff.getValue("schemaVersion").jsonPrimitive.int)
    }

    @Test
    fun migratesLegacyV23AndUnlocksDeepHarbor() {
        val root = repoRoot()
        val legacy = File(root, Schema24Endgame.LEGACY_FIXTURE).readText()
        val migrated = SnapshotCodec.decode(Shared.content, legacy)
        assertTrue(migrated.beatenRivalIds.isEmpty())
        assertTrue(migrated.unlockedEndgameTiers.isEmpty())
        assertTrue(migrated.completedEndgameChallenges.isEmpty())
        assertTrue(migrated.endgameMarks.isEmpty())
        val encoded = SnapshotCodec.encode(Shared.content, migrated)
        assertTrue(encoded.startsWith("{\"schemaVersion\":${SimConstants.SCHEMA_VERSION},"))
        assertTrue(encoded.contains("\"beatenRivalIds\":[]"))
        assertTrue(encoded.contains("\"endgameMarks\":[]"))

        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.sunrise_pier", 1515),
        )
        Shared.content.prestige.milestones.take(8).forEach { sim.state.completedPrestige += it.id }
        assertTrue(EndgameSystem.boardUnlocked(Shared.content, sim.state))
        sim.checkedStep()
        assertTrue("endgame.tier.deep_harbor" in sim.state.unlockedEndgameTiers)
        assertTrue(sim.state.endgameCatchSpeedPermille >= 1025)
        assertTrue(sim.view().endgameUnlocked)
        assertTrue(sim.view().endgameTiers.any { it.id == "endgame.tier.deep_harbor" && it.status == "unlocked" })
    }
}
