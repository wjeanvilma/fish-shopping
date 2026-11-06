package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Privacy-safe play counters for balancing / live-ops (Phase 27).
 *
 * Includes only aggregate [Stats] plus coarse session fields. Never emits bag
 * contents, positions, account ids, cloud uids, or free-text player input.
 */
object Telemetry {
    const val SCHEMA = "fish.telemetry.v1"

    /** Keys that must never appear in a telemetry payload. */
    val FORBIDDEN_KEYS: Set<String> = setOf(
        "bag", "cloudAccountId", "cloud_account_id", "accountId", "email",
        "password", "token", "idToken", "x", "z", "facingX", "facingZ",
        "player", "workers", "customers", "machines", "counters",
    )

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
    }

    fun encode(content: ContentPack, state: GameState): String = build(content, state).toString()
}
