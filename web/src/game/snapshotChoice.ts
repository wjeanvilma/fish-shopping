/**
 * Phase 11 presentation rows for cloud conflict and local recovery dialogs.
 */
import type { ContentPack } from "../engine";
import { formatSession } from "../engine/businessDashboard";
import type { SnapshotSummary, SyncSource } from "../engine/cloudSync";
import { formatLastSavedLabel } from "./settingsStore";

export interface SnapshotChoiceRow {
  sourceLabel: string;
  harborName: string;
  coins: number;
  playtimeLabel: string;
  savedAtLabel: string;
  recommended: boolean;
}

export interface CloudConflictView {
  reason: string;
  recommended: SyncSource;
  local: SnapshotChoiceRow;
  remote: SnapshotChoiceRow;
}

export interface LocalRecoveryView {
  reason: string;
  previous: SnapshotChoiceRow;
}

export function formatSavedAtStamp(epochMs: number, nowMs = Date.now()): string {
  if (epochMs <= 0) return "Unknown time";
  const relative = formatLastSavedLabel(epochMs, nowMs);
  const iso = new Date(epochMs).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  return `${relative} · ${iso}`;
}

export function snapshotChoiceRow(
  summary: SnapshotSummary,
  opts: {
    sourceLabel: string;
    content: ContentPack;
    recommended: boolean;
    nowMs?: number;
  },
): SnapshotChoiceRow {
  const tps = Math.max(1, opts.content.raw.ticksPerSecond);
  const harbor = opts.content.harborsById.get(summary.harborId);
  return {
    sourceLabel: opts.sourceLabel,
    harborName: harbor?.name ?? (summary.harborId || "Unknown harbor"),
    coins: summary.coins,
    playtimeLabel: formatSession(Math.floor(summary.tick / tps)),
    savedAtLabel: formatSavedAtStamp(summary.savedAtEpochMs, opts.nowMs),
    recommended: opts.recommended,
  };
}

export function cloudConflictView(
  offer: {
    local: SnapshotSummary;
    remote: SnapshotSummary;
    recommended: SyncSource;
    reason: string;
  },
  content: ContentPack,
  nowMs = Date.now(),
): CloudConflictView {
  return {
    reason: offer.reason,
    recommended: offer.recommended,
    local: snapshotChoiceRow(offer.local, {
      sourceLabel: "This device",
      content,
      recommended: offer.recommended === "local",
      nowMs,
    }),
    remote: snapshotChoiceRow(offer.remote, {
      sourceLabel: "Cloud",
      content,
      recommended: offer.recommended === "remote",
      nowMs,
    }),
  };
}

export function localRecoveryView(
  summary: SnapshotSummary,
  content: ContentPack,
  reason = "Latest save was unreadable. Recover from the previous backup?",
  nowMs = Date.now(),
): LocalRecoveryView {
  return {
    reason,
    previous: snapshotChoiceRow(summary, {
      sourceLabel: "Previous backup",
      content,
      recommended: true,
      nowMs,
    }),
  };
}
