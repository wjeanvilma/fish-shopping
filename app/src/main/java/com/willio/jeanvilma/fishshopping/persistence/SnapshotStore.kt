package com.willio.jeanvilma.fishshopping.persistence

import android.util.AtomicFile
import java.io.File

/**
 * Local-first save slots (blueprint "Local-first save strategy"): a latest and a
 * previous valid snapshot, each written atomically. Decoding and validation
 * happen in game-core; this class only moves bytes.
 */
class SnapshotStore(dir: File) {
    private val latest = AtomicFile(File(dir, "harbor_save_latest.json"))
    private val previous = AtomicFile(File(dir, "harbor_save_previous.json"))

    /** Newest first. Unreadable files are skipped. */
    fun readCandidates(): List<Pair<String, String>> = listOf("latest" to latest, "previous" to previous)
        .mapNotNull { (label, file) ->
            runCatching { label to file.readFully().decodeToString() }.getOrNull()
        }

    /**
     * Writes a new latest snapshot, first rotating the current latest into previous
     * when [rotate] is true. Pass false right after recovering from the backup so a
     * corrupt latest never replaces the good previous copy.
     * Only call with a snapshot that was encoded from a consistent tick.
     */
    @Synchronized
    fun write(snapshot: String, rotate: Boolean = true) {
        if (rotate) runCatching { latest.readFully() }.getOrNull()?.let { writeAtomically(previous, it) }
        writeAtomically(latest, snapshot.toByteArray(Charsets.UTF_8))
    }

    private fun writeAtomically(file: AtomicFile, bytes: ByteArray) {
        val out = file.startWrite()
        try {
            out.write(bytes)
            file.finishWrite(out)
        } catch (e: Exception) {
            file.failWrite(out)
            throw e
        }
    }
}
