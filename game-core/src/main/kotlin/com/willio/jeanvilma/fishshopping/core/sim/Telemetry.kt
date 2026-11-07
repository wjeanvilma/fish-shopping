package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Privacy-safe play counters for balancing / live-ops (Phase 27).
 *
 * Includes only aggregate [Stats], coarse session fields, and derived rates.
 * Never emits bag contents, positions, account ids, cloud uids, or free-text
 * player input.
 */
object Telemetry {
    const val SCHEMA = "fish.telemetry.v2"

    /** Keys that must never appear in a telemetry payload. */
    val FORBIDDEN_KEYS: Set<String> = setOf(
        "bag", "cloudAccountId", "cloud_account_id", "cloudRefreshToken", "cloud_refresh_token",
        "accountId", "email",
        "password", "token", "idToken", "refreshToken", "x", "z", "facingX", "facingZ",
        "player", "workers", "customers", "machines", "counters",
    )

    /** Lost-customer share of (sales + lost), permille. */
    fun abandonPermille(state: GameState): Long {
        val served = state.stat(Stats.SALES)
        val lost = state.stat(Stats.LOST_CUSTOMERS)
        val total = served + lost
        if (total <= 0L) return 0L
        return (lost * 1000L) / total
    }

    /** Wage spend vs lifetime revenue, permille ([Stats.WAGES_PAID] already includes overtime coins). */
    fun wageRatioPermille(state: GameState): Long {
        val revenue = state.stat(Stats.REVENUE)
        val wages = state.stat(Stats.WAGES_PAID)
        if (revenue <= 0L) return if (wages > 0L) 1000L else 0L
        return (wages * 1000L) / revenue
    }

    /** Per-species catch share of [Stats.FISH_CAUGHT], permille. */
    fun speciesCatchSharePermille(state: GameState): Map<String, Long> {
        val total = state.stat(Stats.FISH_CAUGHT)
        if (total <= 0L || state.speciesCatches.isEmpty()) return emptyMap()
        val out = linkedMapOf<String, Long>()
        for ((id, count) in state.speciesCatches) {
            if (count <= 0L) continue
            out[id] = (count * 1000L) / total
        }
        return out
    }

    fun build(content: ContentPack, state: GameState): JsonObject = buildJsonObject {
        put("schema", SCHEMA)
        put("contentVersion", content.contentVersion)
        put("schemaVersion", SimConstants.SCHEMA_VERSION)
        put("tick", state.tick)
        put("harborId", state.harborId)
        put("coins", state.coins)
        put("workersOnDuty", state.workers.size)
        put(
            "stats",
            buildJsonObject {
                for (key in Stats.ALL) put(key, state.stat(key))
            },
        )
        put(
            "speciesCatches",
            buildJsonObject {
                for ((id, count) in state.speciesCatches) {
                    if (count > 0L) put(id, count)
                }
            },
        )
        put(
            "rates",
            buildJsonObject {
                put("abandonPermille", abandonPermille(state))
                put("wageRatioPermille", wageRatioPermille(state))
                put(
                    "speciesCatchSharePermille",
                    buildJsonObject {
                        for ((id, share) in speciesCatchSharePermille(state)) put(id, share)
                    },
                )
            },
        )
    }

    fun encode(content: ContentPack, state: GameState): String = build(content, state).toString()
}
