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

/** Finish 5.0 Phase 22 — conflict severity for UX polish. */
enum class CloudConflictSeverity { LOW, MEDIUM, HIGH }

/** When both local and remote are valid but differ, UI must ask before applying. */
data class CloudConflictOffer(
    val local: SnapshotSummary,
    val remote: SnapshotSummary,
    val recommended: SyncSource,
    val reason: String,
    /** Finish 4.0 Phase 21 — stable machine code for the human [reason]. */
    val reasonCode: String,
    /** Finish 4.0 Phase 21 — short UX hints describing local vs remote diffs. */
    val diffHints: List<String>,
    /** Finish 5.0 Phase 22 — UX severity from coin/playtime skew. */
    val severity: CloudConflictSeverity = CloudConflictSeverity.LOW,
    /** Finish 5.0 Phase 22 — absolute save-age skew in ms. */
    val ageSkewMs: Long = 0L,
    /** Finish 5.0 Phase 22 — short sync diagnostic lines. */
    val syncDiagnostics: List<String> = emptyList(),
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
        val localSummary = summaryOf(local, SyncSource.LOCAL)
        val remoteSummary = summaryOf(remote, SyncSource.REMOTE)
        val severity = severityOf(localSummary, remoteSummary)
        return CloudConflictOffer(
            local = localSummary,
            remote = remoteSummary,
            recommended = recommended,
            reason = decision.reason,
            reasonCode = reasonCodeOf(decision.reason),
            diffHints = diffHints(localSummary, remoteSummary),
            severity = severity,
            ageSkewMs = ageSkewMs(localSummary, remoteSummary),
            syncDiagnostics = syncDiagnostics(localSummary, remoteSummary, severity),
            localText = local.text,
            remoteText = remote.text,
        )
    }

    /** Finish 4.0 Phase 21 — map human reason → stable code. */
    fun reasonCodeOf(reason: String): String = when (reason) {
        "remote newer" -> "remote_newer"
        "local newer" -> "local_newer"
        "equal age; keep local" -> "equal_age"
        else -> "conflict"
    }

    /** Finish 4.0 Phase 21 — coin / harbor / playtime / age hints for conflict UX. */
    fun diffHints(local: SnapshotSummary, remote: SnapshotSummary): List<String> {
        val hints = mutableListOf<String>()
        val coinDelta = remote.coins - local.coins
        when {
            coinDelta > 0L -> hints += "Cloud has ${coinDelta} more coins"
            coinDelta < 0L -> hints += "This device has ${-coinDelta} more coins"
        }
        if (local.harborId.isNotBlank() && remote.harborId.isNotBlank() && local.harborId != remote.harborId) {
            hints += "Different harbors (${local.harborId} vs ${remote.harborId})"
        }
        val tickDelta = remote.tick - local.tick
        when {
            tickDelta > 0L -> hints += "Cloud has more playtime"
            tickDelta < 0L -> hints += "This device has more playtime"
        }
        val ageDelta = remote.savedAtEpochMs - local.savedAtEpochMs
        when {
            ageDelta > 0L -> hints += "Cloud save is newer"
            ageDelta < 0L -> hints += "This device save is newer"
            else -> hints += "Same save age; prefer this device"
        }
        return hints
    }

    /** Finish 5.0 Phase 22 — severity from coin / playtime / harbor skew. */
    fun severityOf(local: SnapshotSummary, remote: SnapshotSummary): CloudConflictSeverity {
        val coinSkew = kotlin.math.abs(remote.coins - local.coins)
        val tickSkew = kotlin.math.abs(remote.tick - local.tick)
        val harborSkew = local.harborId.isNotBlank() && remote.harborId.isNotBlank() &&
            local.harborId != remote.harborId
        return when {
            coinSkew >= 500L || tickSkew >= 20_000L || harborSkew -> CloudConflictSeverity.HIGH
            coinSkew >= 50L || tickSkew >= 2_000L -> CloudConflictSeverity.MEDIUM
            else -> CloudConflictSeverity.LOW
        }
    }

    fun ageSkewMs(local: SnapshotSummary, remote: SnapshotSummary): Long =
        kotlin.math.abs(remote.savedAtEpochMs - local.savedAtEpochMs)

    fun syncDiagnostics(
        local: SnapshotSummary,
        remote: SnapshotSummary,
        severity: CloudConflictSeverity = severityOf(local, remote),
    ): List<String> {
        val lines = mutableListOf(
            "severity ${severity.name.lowercase()}",
            "age skew ${ageSkewMs(local, remote) / 1000L}s",
            "coin delta ${remote.coins - local.coins}",
            "tick delta ${remote.tick - local.tick}",
        )
        if (local.harborId != remote.harborId) {
            lines += "harbor ${local.harborId.ifBlank { "?" }} → ${remote.harborId.ifBlank { "?" }}"
        }
        return lines
    }
}
