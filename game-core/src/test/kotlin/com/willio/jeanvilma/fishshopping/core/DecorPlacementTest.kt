package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.DecorPlacement
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.world.DecorSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Cozy art pass 5 — "Decorate your harbor" placement rules + optional save field. */
class DecorPlacementTest {
    private val content = Shared.content

    @Test
    fun verdictCountsMatchTheWebParityFixture() {
        val fx = Json.parseToJsonElement(Shared.text("fixtures/parity-decor-placement.json")).jsonObject
        val s = GameState.newGame(content, fx.getValue("harborId").jsonPrimitive.content, fx.getValue("seed").jsonPrimitive.int)
        val decorId = fx.getValue("decorId").jsonPrimitive.content
        s.ownedDecor += decorId
        val g = fx.getValue("grid").jsonObject
        val counts = sortedMapOf<String, Int>()
        var x = g.getValue("minX").jsonPrimitive.int
        while (x <= g.getValue("maxX").jsonPrimitive.int) {
            var z = g.getValue("minZ").jsonPrimitive.int
            while (z <= g.getValue("maxZ").jsonPrimitive.int) {
                val v = DecorSystem.placementProblem(content, s, decorId, x, z) ?: "OK"
                counts[v] = (counts[v] ?: 0) + 1
                z += g.getValue("stepMm").jsonPrimitive.int
            }
            x += g.getValue("stepMm").jsonPrimitive.int
        }
        val expected = fx.getValue("verdictCounts").jsonObject.mapValues { it.value.jsonPrimitive.int }.toSortedMap()
        assertEquals(expected, counts)
    }

    @Test
    fun placeMoveStoreAndRoundTrip() {
        val s = GameState.newGame(content, HARBOR, 7)
        val decorId = content.decor.items.first().id
        assertEquals("Unknown decor", DecorSystem.placementProblem(content, s, "decor.nope", 0, 0))
        assertEquals("Buy it first", DecorSystem.placementProblem(content, s, decorId, 0, 0))
        s.ownedDecor += decorId
        var spot: Pair<Int, Int>? = null
        loop@ for (x in -8000..15000 step 250) for (z in -16000..15000 step 250) {
            if (DecorSystem.placementProblem(content, s, decorId, x, z) == null) { spot = x to z; break@loop }
        }
        assertNotNull(spot)
        val sim = Simulation(content, s)
        val events = sim.step(listOf(Command.PlaceDecor(decorId, spot!!.first + 90, spot.second - 90, 5)))
        assertTrue(events.any { it is GameEvent.DecorPlaced && !it.moved })
        assertEquals(DecorPlacement(spot.first, spot.second, 1), s.decorPlacements[HARBOR]?.get(decorId))
        assertTrue(sim.view().decorOffers.first { it.id == decorId }.placed)
        assertEquals(1, sim.view().decorPlacements.size)

        val back = SnapshotCodec.decode(content, SnapshotCodec.encode(content, s))
        assertEquals(s.decorPlacements[HARBOR], back.decorPlacements[HARBOR])

        sim.step(listOf(Command.StoreDecor(decorId)))
        assertNull(s.decorPlacements[HARBOR])
        assertFalse(SnapshotCodec.encode(content, s).contains("decorPlacements"))
        val rejected = sim.step(listOf(Command.StoreDecor(decorId)))
        assertTrue(rejected.any { it is GameEvent.DecorPlaceRejected })
    }

    @Test
    fun snapRoundsHalfUpLikeJavaScript() {
        assertEquals(250, DecorSystem.snap(125))
        assertEquals(0, DecorSystem.snap(-125))
        assertEquals(-250, DecorSystem.snap(-126))
        assertEquals(1000, DecorSystem.snap(1100))
    }
}
