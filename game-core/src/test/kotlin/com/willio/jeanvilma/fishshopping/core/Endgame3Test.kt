package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.EndgameSystem
import com.willio.jeanvilma.fishshopping.core.ship.Endgame3
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 17 — endgame deepen + schema 26. */
class Endgame3Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Endgame3.CATALOG).isFile }

    @Test
    fun catalogFloorsAndSchema26() {
        assertEquals(17, Endgame3.PHASE)
        assertEquals(26, Endgame3.SCHEMA_VERSION)
        assertEquals(25, Endgame3.FROM_SCHEMA)
        assertEquals(26, Endgame3.TO_SCHEMA)
        assertEquals(Endgame3.ENDGAME_3_MARKER, "authored-finish-5.0-phase-17")
        // Soft-floor: Finish 6.0 Phase 14 bumps live schema to 27.
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertTrue(Shared.content.endgame.tiers.size >= Endgame3.TIER_COUNT_MIN)
        assertTrue(Shared.content.endgame.challenges.size >= Endgame3.CHALLENGE_COUNT_MIN)
        for (id in Endgame3.NEW_TIER_IDS) {
            assertTrue(id, Shared.content.endgameTiersById.containsKey(id))
        }
        for (id in Endgame3.NEW_CHALLENGE_IDS) {
            assertTrue(id, Shared.content.endgameChallengesById.containsKey(id))
        }
        val crests = Shared.content.endgame.challenges.mapNotNull { it.grantsCrest }.toSet()
        assertTrue(crests.size >= Endgame3.CREST_COUNT_MIN)
        assertTrue(File(repoRoot(), Endgame3.LEGACY_FIXTURE).isFile)
    }

    @Test
    fun auroraThroneRequiresCrest() {
        val s = GameState.newGame(Shared.content, "harbor.sunrise_pier", 1717)
        for (m in Shared.content.prestige.milestones.take(22)) {
            s.completedPrestige += m.id
        }
        for (rival in Shared.content.rivalMarkets.rivals.take(12)) {
            s.beatenRivalIds += rival.id
        }
        for (ch in Shared.content.endgame.challenges.take(10)) {
            s.completedEndgameChallenges += ch.id
            ch.grantsMark?.let { s.endgameMarks += it }
            ch.grantsCrest?.let { s.endgameCrests += it }
        }
        val tier = Shared.content.endgameTiersById.getValue("endgame.tier.aurora_throne")
        assertTrue(EndgameSystem.tierRequirementsMet(s, tier))
    }
}
