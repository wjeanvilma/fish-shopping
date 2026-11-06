package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.sim.FixedStepClock
import com.willio.jeanvilma.fishshopping.core.sim.OfflinePolicy
import com.willio.jeanvilma.fishshopping.core.sim.Prng
import com.willio.jeanvilma.fishshopping.core.sim.SafeMath
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.int
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class FoundationsTest {

    @Test
    fun prngMatchesSharedVectors() {
        val root = Json.parseToJsonElement(Shared.text("fixtures/prng-vectors.json")).jsonObject
        val cases = root["cases"]!!.jsonArray
        assertTrue(cases.isNotEmpty())
        for (c in cases) {
            val o = c as JsonObject
            val rng = Prng(o["seed"]!!.jsonPrimitive.int)
            val expected = o["u32"]!!.jsonArray.map { it.jsonPrimitive.long }
            val actual = expected.map { rng.nextU32() }
            assertEquals("seed ${o["seed"]}", expected, actual)
            val below = o["below100"]!!.jsonArray.map { it.jsonPrimitive.int }
            val rng2 = Prng(o["seed"]!!.jsonPrimitive.int)
            assertEquals("seed ${o["seed"]} below100", below, below.map { rng2.nextBelow(100) })
        }
    }

    @Test
    fun safeMathRejectsOverflow() {
        assertEquals(SimConstants.MAX_SAFE_INTEGER, SafeMath.creditCoins(SimConstants.MAX_SAFE_INTEGER - 1, 10))
        try {
            SafeMath.multiply(SimConstants.MAX_SAFE_INTEGER, 2)
            fail("expected overflow")
        } catch (_: IllegalArgumentException) {
        }
        assertEquals(31L, SafeMath.isqrt(999))
        assertEquals(1000L, SafeMath.isqrt(1_000_000))
    }

    @Test
    fun clockProducesWholeTicksAndCapsCatchUp() {
        val clock = FixedStepClock(maxCatchUpTicks = 5)
        assertEquals(0, clock.advance(0))
        assertEquals(1, clock.advance(SimConstants.NANOS_PER_TICK))
        assertEquals(0, clock.advance(SimConstants.NANOS_PER_TICK + 10))
        assertEquals(5, clock.advance(SimConstants.NANOS_PER_TICK * 100)) // long stall is capped
        assertEquals(0, clock.advance(SimConstants.NANOS_PER_TICK * 99)) // clock moved backwards: no ticks
    }

    @Test
    fun offlineCreditIsClampedAndNeverNegative() {
        assertEquals(0L, OfflinePolicy.creditedTicks(-60_000))
        assertEquals(20L, OfflinePolicy.creditedTicks(1_000))
        assertEquals(SimConstants.OFFLINE_CAP_TICKS, OfflinePolicy.creditedTicks(48L * 3600 * 1000))
        assertEquals(SimConstants.OFFLINE_CAP_TICKS, OfflinePolicy.capTicks(Shared.content))
    }
}
