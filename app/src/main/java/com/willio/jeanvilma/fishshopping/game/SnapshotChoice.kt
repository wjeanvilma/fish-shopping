package com.willio.jeanvilma.fishshopping.game

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.persistence.CloudConflictOffer
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotSummary
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.core.sim.BusinessDashboard
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

/** Phase 11 dual-snapshot / recovery presentation row. */
data class SnapshotChoiceRow(
    val sourceLabel: String,
    val harborName: String,
    val coins: Long,
    val playtimeLabel: String,
    val savedAtLabel: String,
    val recommended: Boolean,
)

data class CloudConflictView(
    val reason: String,
    val recommended: SyncSource,
    val local: SnapshotChoiceRow,
    val remote: SnapshotChoiceRow,
)

data class LocalRecoveryView(
    val reason: String,
    val previous: SnapshotChoiceRow,
)

object SnapshotChoice {

    fun formatSavedAtStamp(epochMs: Long, nowMs: Long = System.currentTimeMillis()): String {
        if (epochMs <= 0L) return "Unknown time"
        val relative = GameSettings.formatLastSavedLabel(epochMs, nowMs)
        val cal = Calendar.getInstance(TimeZone.getTimeZone("UTC"), Locale.US)
        cal.timeInMillis = epochMs
        val iso = String.format(
            Locale.US,
            "%04d-%02d-%02d %02d:%02d UTC",
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH),
            cal.get(Calendar.HOUR_OF_DAY),
            cal.get(Calendar.MINUTE),
        )
        return "$relative · $iso"
    }

    fun row(
        summary: SnapshotSummary,
        sourceLabel: String,
        content: ContentPack,
        recommended: Boolean,
        nowMs: Long = System.currentTimeMillis(),
    ): SnapshotChoiceRow {
        val tps = content.ticksPerSecond.coerceAtLeast(1)
        val harborName = content.harborsById[summary.harborId]?.name
            ?: summary.harborId.ifBlank { "Unknown harbor" }
        return SnapshotChoiceRow(
            sourceLabel = sourceLabel,
            harborName = harborName,
            coins = summary.coins,
            playtimeLabel = BusinessDashboard.formatSession(summary.tick / tps),
            savedAtLabel = formatSavedAtStamp(summary.savedAtEpochMs, nowMs),
            recommended = recommended,
        )
    }

    fun conflictView(offer: CloudConflictOffer, content: ContentPack, nowMs: Long = System.currentTimeMillis()): CloudConflictView =
        CloudConflictView(
            reason = offer.reason,
            recommended = offer.recommended,
            local = row(offer.local, "This device", content, offer.recommended == SyncSource.LOCAL, nowMs),
            remote = row(offer.remote, "Cloud", content, offer.recommended == SyncSource.REMOTE, nowMs),
        )

    fun recoveryView(
        summary: SnapshotSummary,
        content: ContentPack,
        reason: String = "Latest save was unreadable. Recover from the previous backup?",
        nowMs: Long = System.currentTimeMillis(),
    ): LocalRecoveryView =
        LocalRecoveryView(
            reason = reason,
            previous = row(summary, "Previous backup", content, recommended = true, nowMs),
        )
}
