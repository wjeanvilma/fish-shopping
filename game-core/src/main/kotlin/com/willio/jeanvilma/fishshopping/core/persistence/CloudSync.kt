package com.willio.jeanvilma.fishshopping.core.persistence

import com.willio.jeanvilma.fishshopping.core.content.Node
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.longOrNull
import java.util.zip.CRC32

/** Where the chosen snapshot came from after a sync merge. */
enum class SyncSource { LOCAL, REMOTE, NONE }

/**
 * A checksum-valid envelope candidate for cloud conflict resolution.
 * [savedAtEpochMs] is 0 when the envelope omitted it (legacy → older than any dated save).
 */
data class SyncCandidate(
    val text: String,
    val checksum: String,
    val savedAtEpochMs: Long,
    val schemaVersion: Int,
    val harborId: String,
    val coins: Long,
    val tick: Long,
)

data class SyncDecision(
    val text: String?,
    val source: SyncSource,
    val reason: String,
)

/** Phase 11 dual-snapshot choice row (coins / harbor / playtime / timestamp). */
data class SnapshotSummary(
    val source: SyncSource,
    val harborId: String,
    val coins: Long,
    val tick: Long,
    val savedAtEpochMs: Long,
    val checksum: String,
)

/** When both local and remote are valid but differ, UI must ask before applying. */
data class CloudConflictOffer(
    val local: SnapshotSummary,
    val remote: SnapshotSummary,
    val recommended: SyncSource,
    val reason: String,
    val localText: String,
    val remoteText: String,
)

/**
 * Optional cloud sync conflict policy (Phase 26): among checksum-valid snapshots,
 * the newest [SyncCandidate.savedAtEpochMs] wins. Local play never requires a remote.
 *
 * Phase 11 surfaces a dual-snapshot choice when both sides are valid and differ;
 * [choose] still names the recommended side.
 *
 * Peek/verify only — decoding into [com.willio.jeanvilma.fishshopping.core.sim.GameState]
 * still goes through [SnapshotCodec] with a content pack.
 */
object CloudSync {

    /**
     * Returns a candidate when the envelope JSON parses and the CRC-32 of `state`
     * matches `checksum`. Corrupt or non-JSON text yields null (ignored in merges).
     */
    fun peek(text: String): SyncCandidate? {
        val root = try {
            Json.parseToJsonElement(text)
        } catch (_: Exception) {
            return null
        }
        if (root !is JsonObject) return null
        return try {
            val env = Node(root, "$")
            val version = env["schemaVersion"].int()
            if (version < 1) return null
            val stateEl = root["state"] as? JsonObject ?: return null
            val checksum = env["checksum"].string()
            val crc = CRC32()
            crc.update(stateEl.toString().toByteArray(Charsets.UTF_8))
            val actual = "%08x".format(crc.value)
            if (checksum != actual) return null
            val savedAt = env.optional("savedAtEpochMs")?.long(min = 0) ?: 0L
            val harborId = (stateEl["harborId"] as? JsonPrimitive)?.contentOrNull ?: ""
            val coins = (stateEl["coins"] as? JsonPrimitive)?.longOrNull?.coerceAtLeast(0L) ?: 0L
            val tick = (stateEl["tick"] as? JsonPrimitive)?.longOrNull?.coerceAtLeast(0L) ?: 0L
            SyncCandidate(
                text = text,
                checksum = checksum,
                savedAtEpochMs = savedAt,
                schemaVersion = version,
                harborId = harborId,
                coins = coins,
                tick = tick,
            )
        } catch (_: Exception) {
            null
        }
    }

    fun summaryOf(candidate: SyncCandidate, source: SyncSource): SnapshotSummary =
        SnapshotSummary(
            source = source,
            harborId = candidate.harborId,
            coins = candidate.coins,
            tick = candidate.tick,
            savedAtEpochMs = candidate.savedAtEpochMs,
            checksum = candidate.checksum,
        )

    /**
     * Newest checksum-valid snapshot wins. Equal timestamps keep [local] to avoid
     * pointless rewrites. Missing/corrupt sides are skipped.
     */
    fun choose(localText: String?, remoteText: String?): SyncDecision {
        val local = localText?.let { peek(it) }
        val remote = remoteText?.let { peek(it) }
        return when {
            local == null && remote == null ->
                SyncDecision(null, SyncSource.NONE, "no valid snapshots")
            local == null ->
                SyncDecision(remote!!.text, SyncSource.REMOTE, "local missing or corrupt")
            remote == null ->
                SyncDecision(local.text, SyncSource.LOCAL, "remote missing or corrupt")
            local.checksum == remote.checksum ->
                SyncDecision(local.text, SyncSource.LOCAL, "identical checksum")
            remote.savedAtEpochMs > local.savedAtEpochMs ->
                SyncDecision(remote.text, SyncSource.REMOTE, "remote newer")
            local.savedAtEpochMs > remote.savedAtEpochMs ->
                SyncDecision(local.text, SyncSource.LOCAL, "local newer")
            else ->
                SyncDecision(local.text, SyncSource.LOCAL, "equal age; keep local")
        }
    }

    /**
     * Phase 11: when both sides are checksum-valid and differ, return a dual-choice
     * offer. Recommended side follows [choose]. Null means auto-apply is fine.
     */
    fun conflictOffer(localText: String?, remoteText: String?): CloudConflictOffer? {
        val local = localText?.let { peek(it) } ?: return null
        val remote = remoteText?.let { peek(it) } ?: return null
        if (local.checksum == remote.checksum) return null
        val decision = choose(localText, remoteText)
        val recommended = when (decision.source) {
            SyncSource.REMOTE -> SyncSource.REMOTE
            else -> SyncSource.LOCAL
        }
        return CloudConflictOffer(
            local = summaryOf(local, SyncSource.LOCAL),
            remote = summaryOf(remote, SyncSource.REMOTE),
            recommended = recommended,
            reason = decision.reason,
            localText = local.text,
            remoteText = remote.text,
        )
    }
}
