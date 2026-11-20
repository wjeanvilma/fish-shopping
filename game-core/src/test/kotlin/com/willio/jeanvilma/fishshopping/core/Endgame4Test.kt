package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.EndgameSystem
import com.willio.jeanvilma.fishshopping.core.ship.Endgame4
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 14 — endgame deepen + schema 27. */
class Endgame4Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Endgame4.CATALOG).isFile }

    @Test
    fun catalogFloorsAndSchema27() {
        assertEquals(14, Endgame4.PHASE)
        assertEquals(27, Endgame4.SCHEMA_VERSION)
        assertEquals(26, Endgame4.FROM_SCHEMA)
        assertEquals(27, Endgame4.TO_SCHEMA)
        assertEquals(Endgame4.ENDGAME_4_MARKER, "authored-finish-6.0-phase-14")
        assertEquals(27, SimConstants.SCHEMA_VERSION)
        assertTrue(Shared.content.endgame.tiers.size >= Endgame4.TIER_COUNT_MIN)
        assertTrue(Shared.content.endgame.challenges.size >= Endgame4.CHALLENGE_COUNT_MIN)
        for (id in Endgame4.NEW_TIER_IDS) {
            assertTrue(id, Shared.content.endgameTiersById.containsKey(id))
        }
        for (id in Endgame4.NEW_CHALLENGE_IDS) {
            assertTrue(id, Shared.content.endgameChallengesById.containsKey(id))
        }
        val sigils = Shared.content.endgame.challenges.mapNotNull { it.grantsSigil }.toSet()
        assertTrue(sigils.size >= Endgame4.SIGIL_COUNT_MIN)
        assertTrue(File(repoRoot(), Endgame4.LEGACY_FIXTURE).isFile)
    }

    @Test
    fun saffronNestRequiresSigil() {
        val s = GameState.newGame(Shared.content, "harbor.sunrise_pier", 1717)
        for (m in Shared.content.prestige.milestones.take(26)) {
            s.completedPrestige += m.id
        }
        for (rival in Shared.content.rivalMarkets.rivals.take(12)) {
            s.beatenRivalIds += rival.id
        }
        for (ch in Shared.content.endgame.challenges.take(14)) {
            s.completedEndgameChallenges += ch.id
            ch.grantsMark?.let { s.endgameMarks += it }
            ch.grantsCrest?.let { s.endgameCrests += it }
            ch.grantsSigil?.let { s.endgameSigils += it }
        }
        val tier = Shared.content.endgameTiersById.getValue("endgame.tier.saffron_nest")
        assertTrue(EndgameSystem.tierRequirementsMet(s, tier))
    }
}
