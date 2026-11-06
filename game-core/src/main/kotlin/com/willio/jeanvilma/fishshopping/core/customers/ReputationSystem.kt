package com.willio.jeanvilma.fishshopping.core.customers

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.CustomerKind
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import kotlin.math.max

/**
 * Service reputation from served vs abandoned counters (Phase 13).
 * Computed only — never persisted. Distinct from prestige harbor ★.
 */
object ReputationSystem {
    private val BAND_LABELS = listOf("Poor", "Fair", "Good", "Great", "Excellent")

    fun served(state: GameState): Long = state.stat(Stats.SALES)

    fun abandoned(state: GameState): Long = state.stat(Stats.LOST_CUSTOMERS)

    fun encounters(state: GameState): Long = served(state) + abandoned(state)

    /** Serve-rate permille after optional unmet-preference soft penalty (1..1000+). */
    fun scorePermille(content: ContentPack, state: GameState): Int {
        val def = content.reputation
        val sales = served(state)
        val lost = abandoned(state)
        val total = sales + lost
        val raw = if (total < def.minSample.toLong()) {
            def.neutralScorePermille
        } else {
            ((sales * 1000L) / total).toInt()
        }
        val unmet = state.stat(Stats.UNMET_PREFERENCE_SALES)
        val penalty = if (sales <= 0L || def.unmetPreferencePenaltyPermille <= 0) {
            0
        } else {
            ((unmet * def.unmetPreferencePenaltyPermille.toLong()) / sales).toInt()
        }
        return max(1, raw - penalty)
    }

    /** Band index 0..(thresholds.size) from [ReputationDef.scoreBandThresholdsPermille]. */
    fun band(content: ContentPack, state: GameState): Int {
        val thresholds = content.reputation.scoreBandThresholdsPermille
        val score = scorePermille(content, state)
        var b = 0
        for (t in thresholds) {
            if (score >= t) b++ else break
        }
        return b.coerceIn(0, thresholds.size)
    }

    fun bandLabel(content: ContentPack, state: GameState): String {
        val b = band(content, state)
        return BAND_LABELS.getOrElse(b) { BAND_LABELS.last() }
    }

    /** Soft spawn-mix multiplier for a customer kind at the current reputation band. */
    fun kindSpawnMultPermille(content: ContentPack, state: GameState, kind: CustomerKind): Int {
        val table = content.reputation.kindSpawnMultPermille
        if (table.isEmpty()) return 1000
        val row = table[band(content, state).coerceIn(0, table.lastIndex)]
        return row[kind.wire] ?: 1000
    }
}
