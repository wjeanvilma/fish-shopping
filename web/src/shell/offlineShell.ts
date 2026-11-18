/**
 * Finish 3.0 Phase 4 — shared offline-summary enrichment
 * (mirrors game-core shell/OfflineShell.kt).
 */
import type { ContentPack, GameState, OfflineReport } from "../engine";
import { DailyGoalsSystem, OfflinePolicy } from "../engine";

export function enrichWithJournal(report: OfflineReport, journalLines: string[]): OfflineReport {
  return {
    ...report,
    journalLines,
    hadActivity: report.hadActivity || journalLines.length > 0,
  };
}

export function enrichFromState(
  content: ContentPack,
  state: GameState,
  report: OfflineReport,
): OfflineReport {
  return enrichWithJournal(report, DailyGoalsSystem.journalLines(content, state, report));
}

export function shouldShow(content: ContentPack, enriched: OfflineReport): boolean {
  return OfflinePolicy.shouldShowSummary(content, enriched);
}

/** Returns the report to park when a summary should show; otherwise null. */
export function decidePendingReport(
  content: ContentPack,
  state: GameState,
  report: OfflineReport | null,
): OfflineReport | null {
  if (!report) return null;
  const enriched = enrichFromState(content, state, report);
  return shouldShow(content, enriched) ? enriched : null;
}

export const OfflineShell = {
  enrichWithJournal,
  enrichFromState,
  shouldShow,
  decidePendingReport,
};
