package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Shared simulation constants. These values are part of the cross-platform
 * contract: the TypeScript client must use the same numbers.
 */
object SimConstants {
    /** Fixed simulation rate (blueprint: start at 20 Hz, interpolate visuals). */
    const val TICKS_PER_SECOND = 20
    const val NANOS_PER_TICK = 1_000_000_000L / TICKS_PER_SECOND

    /** Largest integer both Kotlin Long and a JS number represent exactly (2^53 - 1). */
    const val MAX_SAFE_INTEGER = 9_007_199_254_740_991L

    /** Scale for joystick / direction input: -1000..1000 represents -1.0..1.0. */
    const val INPUT_SCALE = 1000

    /** Offline earnings cap (blueprint: start with four hours). */
    const val OFFLINE_CAP_TICKS = 4L * 60 * 60 * TICKS_PER_SECOND

    /** Ticks between periodic checkpoint requests (30 s). */
    const val CHECKPOINT_INTERVAL_TICKS = 30L * TICKS_PER_SECOND

    /**
     * 2: customers carry walking state.
     * 3: customers store reservedItems (multi-SKU baskets); counters accept product lists.
     * 4: player stores fishingCatchTicks + reelAttemptedThisCast for mid-cast resume.
     * 5: machines store preferredRecipeId for multi-recipe selection.
     * 6: customers store preferredProductId for product demand.
     * 7: workers list (hired staff + bags + task state).
     * 8: contract board offers + active timed deliveries.
     */
    /**
     * 9: parked harbor worlds (harborStashes).
     * 10: completedPrestige + unlockedCosmetics.
     * 11: player preferredBaitId + activeBaitId.
     * 12: trophies map (museum personal bests).
     * 13: worker xp / level / traits (Phase 16).
     * 14: worker onShift scheduling (Phase 17).
     * 15: worker equipment loadouts (Phase 19).
     * 16: ownedDecor (Phase 23 shop cosmetics).
     * 17: machine broken + slowUntilTick (Phase 25 wear).
     * 18: loanOwed / loanDueTick / coinGoal / coinGoalCelebrated (Phase 26 bank).
     * 19: speciesCatches map (Phase 27 telemetry v2).
     * 20: fullHarborUnlock (Phase 23 one-time IAP entitlement).
     * 21: unlockedAchievements (Finish 2.0 Phase 7 — achievements engine scaffold).
     * 22: speciesMasteryXp + activeTechniqueId (Finish 2.0 Phase 14 — fishing mastery).
     * 23: worker branch/schedule fields (Finish 2.0 Phase 15 — staff trees).
     */
    const val SCHEMA_VERSION = 23
}

/** Integer arithmetic that refuses to leave the shared safe range. */
object SafeMath {
    fun add(a: Long, b: Long): Long {
        val r = Math.addExact(a, b)
        require(r in -SimConstants.MAX_SAFE_INTEGER..SimConstants.MAX_SAFE_INTEGER) { "Value $r outside safe range" }
        return r
    }

    fun multiply(a: Long, b: Long): Long {
        val r = Math.multiplyExact(a, b)
        require(r in -SimConstants.MAX_SAFE_INTEGER..SimConstants.MAX_SAFE_INTEGER) { "Value $r outside safe range" }
        return r
    }

    /** Credits coins, saturating at the safe maximum instead of overflowing. */
    fun creditCoins(balance: Long, amount: Long): Long {
        require(amount >= 0) { "Credit must be non-negative" }
        return if (balance > SimConstants.MAX_SAFE_INTEGER - amount) SimConstants.MAX_SAFE_INTEGER else balance + amount
    }

    /** Integer square root (floor). Used for movement normalisation so both clients agree exactly. */
    fun isqrt(n: Long): Long {
        require(n >= 0)
        if (n < 2) return n
        var x = Math.sqrt(n.toDouble()).toLong()
        while (x * x > n) x--
        while ((x + 1) * (x + 1) <= n) x++
        return x
    }
}

/**
 * Mulberry32 seeded PRNG. Chosen because it uses only 32-bit integer operations,
 * which TypeScript reproduces exactly with Math.imul and >>> 0.
 * Test vectors live in shared/fixtures/prng-vectors.json.
 */
class Prng(var state: Int) {
    /** Next value as an unsigned 32-bit integer stored in a Long. */
    fun nextU32(): Long {
        state += 0x6D2B79F5
        var t = state
        t = (t xor (t ushr 15)) * (t or 1)
        t = (t + (t xor (t ushr 7)) * (t or 61)) xor t
        return (t xor (t ushr 14)).toLong() and 0xFFFF_FFFFL
    }

    /** Uniform integer in [0, bound). Multiply-shift, no modulo bias worth caring about at these sizes. */
    fun nextBelow(bound: Int): Int {
        require(bound > 0)
        return ((nextU32() * bound) ushr 32).toInt()
    }

    /** Inclusive range. */
    fun nextInRange(min: Int, max: Int): Int = min + nextBelow(max - min + 1)

    /** Picks an index from positive integer weights. */
    fun pickWeighted(weights: List<Int>): Int {
        val total = weights.sum()
        require(total > 0)
        var roll = nextBelow(total)
        for ((i, w) in weights.withIndex()) {
            if (roll < w) return i
            roll -= w
        }
        return weights.lastIndex
    }
}

/**
 * Converts real elapsed time into a whole number of fixed ticks.
 * Caps catch-up work after a stall so a long frame never freezes the device.
 */
class FixedStepClock(private val maxCatchUpTicks: Int = 5) {
    private var accumulatorNanos = 0L
    private var lastNanos = -1L

    fun reset() {
        accumulatorNanos = 0
        lastNanos = -1
    }

    /** Returns how many simulation ticks to run for this frame. */
    fun advance(nowNanos: Long): Int {
        if (lastNanos < 0) {
            lastNanos = nowNanos
            return 0
        }
        val elapsed = (nowNanos - lastNanos).coerceAtLeast(0)
        lastNanos = nowNanos
        accumulatorNanos += elapsed
        var ticks = (accumulatorNanos / SimConstants.NANOS_PER_TICK).toInt()
        accumulatorNanos -= ticks * SimConstants.NANOS_PER_TICK
        if (ticks > maxCatchUpTicks) {
            ticks = maxCatchUpTicks
            accumulatorNanos = 0
        }
        return ticks
    }

    /** Fraction [0,1) of the way to the next tick, for visual interpolation. */
    fun alpha(): Float = accumulatorNanos.toFloat() / SimConstants.NANOS_PER_TICK
}

/** Offline-time policy. Manual actions never happen while absent. */
object OfflinePolicy {
    /** Cap in ticks for [content], matching [SimConstants.OFFLINE_CAP_TICKS] when capHours is 4. */
    fun capTicks(content: com.willio.jeanvilma.fishshopping.core.content.ContentPack): Long =
        content.offline.capHours.toLong() * 60L * 60L * SimConstants.TICKS_PER_SECOND

    /** Ticks to credit for a real-time absence: never negative, never above the cap. */
    fun creditedTicks(elapsedMillis: Long, capTicks: Long = SimConstants.OFFLINE_CAP_TICKS): Long {
        if (elapsedMillis <= 0) return 0
        val ticks = elapsedMillis / (1000L / SimConstants.TICKS_PER_SECOND)
        return ticks.coerceAtMost(capTicks)
    }

    fun creditedTicks(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        elapsedMillis: Long,
    ): Long = creditedTicks(elapsedMillis, capTicks(content))

    fun shouldShowSummary(
        content: com.willio.jeanvilma.fishshopping.core.content.ContentPack,
        report: OfflineReport,
    ): Boolean {
        val minTicks = content.offline.summaryMinSeconds.toLong() * SimConstants.TICKS_PER_SECOND
        return report.ticksCredited >= minTicks
    }
}
