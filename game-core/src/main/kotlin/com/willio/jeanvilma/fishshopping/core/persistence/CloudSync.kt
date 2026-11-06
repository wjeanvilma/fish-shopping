package com.willio.jeanvilma.fishshopping.core.persistence

import com.willio.jeanvilma.fishshopping.core.content.Node
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
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
)

data class SyncDecision(
    val text: String?,
    val source: SyncSource,
    val reason: String,
)

/**
 * Optional cloud sync conflict policy (Phase 26): among checksum-valid snapshots,
 * the newest [SyncCandidate.savedAtEpochMs] wins. Local play never requires a remote.
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
            SyncCandidate(text = text, checksum = checksum, savedAtEpochMs = savedAt, schemaVersion = version)
        } catch (_: Exception) {
            null
        }
    }

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
}
