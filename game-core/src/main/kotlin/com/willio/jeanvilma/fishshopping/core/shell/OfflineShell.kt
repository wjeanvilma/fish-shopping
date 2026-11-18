package com.willio.jeanvilma.fishshopping.core.shell

import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.OfflinePolicy
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport

/**
 * Finish 3.0 Phase 4 — shared offline-summary enrichment + show/dismiss decision
 * used by Android GameViewModel and web GameHost.
 */
object OfflineShell {
    fun enrichWithJournal(
        report: OfflineReport,
        journalLines: List<String>,
    ): OfflineReport = report.copy(journalLines = journalLines)

    fun enrichFromState(
        content: ContentPack,
        state: GameState,
        report: OfflineReport,
    ): OfflineReport = enrichWithJournal(
        report,
        DailyGoalsSystem.journalLines(content, state, report),
    )

    fun shouldShow(content: ContentPack, enriched: OfflineReport): Boolean =
        OfflinePolicy.shouldShowSummary(content, enriched)

    /**
     * Returns the report to park in the host when a summary should show; otherwise null.
     */
    fun decidePendingReport(
        content: ContentPack,
        state: GameState,
        report: OfflineReport?,
    ): OfflineReport? {
        if (report == null) return null
        val enriched = enrichFromState(content, state, report)
        return if (shouldShow(content, enriched)) enriched else null
    }
}
