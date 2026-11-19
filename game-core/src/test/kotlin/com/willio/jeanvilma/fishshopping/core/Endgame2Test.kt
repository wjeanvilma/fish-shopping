package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.progression.EndgameSystem
import com.willio.jeanvilma.fishshopping.core.ship.Endgame2
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 17 — endgame deepen + schema 25. */
class Endgame2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Endgame2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Endgame2.CATALOG).readText()).jsonObject
        assertEquals(Endgame2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Endgame2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Endgame2.ENDGAME_2_MARKER, json.getValue("endgame2Marker").jsonPrimitive.content)
        assertEquals(Endgame2.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.int)
        assertTrue(SimConstants.SCHEMA_VERSION >= 25)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(17, listing.getValue("endgame2Phase").jsonPrimitive.content.toInt())
        assertEquals(Endgame2.CATALOG, listing.getValue("endgame2Catalog").jsonPrimitive.content)

        val kickoff = Json.parseToJsonElement(File(root, "shared/ship/finish-4.0-kickoff.json").readText()).jsonObject
        assertEquals(25, kickoff.getValue("schemaVersion").jsonPrimitive.int)
        assertFalse(kickoff.getValue("gaps").jsonObject.getValue("endgameSchema25Pending").jsonPrimitive.boolean)
    }

    @Test
    fun contentDeepensBeyondSchema24Floors() {
        assertTrue(Shared.content.endgame.tiers.size >= Endgame2.TIER_COUNT_MIN)
        assertTrue(Shared.content.endgame.challenges.size >= Endgame2.CHALLENGE_COUNT_MIN)
        for (id in Endgame2.NEW_TIER_IDS) {
            assertTrue(id, Shared.content.endgameTiersById.containsKey(id))
        }
        for (id in Endgame2.NEW_CHALLENGE_IDS) {
            assertTrue(id, Shared.content.endgameChallengesById.containsKey(id))
        }
        val marks = Shared.content.endgame.challenges.mapNotNull { it.grantsMark }
        assertTrue(marks.size >= Endgame2.MARK_COUNT_MIN)
    }

    @Test
    fun migratesLegacyV24AndUnlocksMistSovereign() {
        val root = repoRoot()
        val legacy = File(root, Endgame2.LEGACY_FIXTURE).readText()
        val migrated = SnapshotCodec.decode(Shared.content, legacy)
        assertTrue(migrated.endgameMarks.isEmpty())
        val encoded = SnapshotCodec.encode(Shared.content, migrated)
        assertTrue(encoded.startsWith("{\"schemaVersion\":${SimConstants.SCHEMA_VERSION},"))
        assertTrue(encoded.contains("\"endgameMarks\":[]"))

        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, "harbor.sunrise_pier", 1717),
        )
        Shared.content.prestige.milestones.take(18).forEach { sim.state.completedPrestige += it.id }
        Shared.content.rivalMarkets.rivals.take(10).forEach { sim.state.beatenRivalIds += it.id }
        Shared.content.endgame.challenges.take(5).forEach { ch ->
            sim.state.completedEndgameChallenges += ch.id
            ch.grantsMark?.let { sim.state.endgameMarks += it }
        }
        val mist = Shared.content.endgameTiersById.getValue("endgame.tier.mist_sovereign")
        assertTrue(EndgameSystem.tierRequirementsMet(sim.state, mist))
        sim.checkedStep()
        assertTrue("endgame.tier.mist_sovereign" in sim.state.unlockedEndgameTiers)
        assertTrue(sim.view().endgameMarkCount >= 1)
    }
}
