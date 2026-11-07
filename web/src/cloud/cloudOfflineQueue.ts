/**
 * Phase 25 — offline cloud push queue (latest snapshot wins).
 * Presentation/local only; not part of the sim parity save.
 */
import productionPath from "../../../shared/cloud/production-path.json";

export interface CloudOfflineQueueEntry {
  snapshot: string;
  queuedAtEpochMs: number;
  uidHint: string | null;
}

const KEY =
  (productionPath as { offlineQueue?: { webStorageKey?: string } }).offlineQueue?.webStorageKey ??
  "fish-shopping-cloud-offline-queue";

export function loadCloudOfflineQueue(): CloudOfflineQueueEntry | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudOfflineQueueEntry>;
    if (typeof parsed.snapshot !== "string" || parsed.snapshot.length === 0) return null;
    return {
      snapshot: parsed.snapshot,
      queuedAtEpochMs: typeof parsed.queuedAtEpochMs === "number" ? parsed.queuedAtEpochMs : Date.now(),
      uidHint: typeof parsed.uidHint === "string" ? parsed.uidHint : null,
    };
  } catch {
    return null;
  }
}

export function saveCloudOfflineQueue(entry: CloudOfflineQueueEntry | null): void {
  try {
    if (!entry) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(entry));
  } catch {
    // private mode / quota
  }
}

export function enqueueCloudOfflineSnapshot(
  snapshot: string,
  uidHint: string | null,
  nowMs = Date.now(),
): CloudOfflineQueueEntry {
  const entry: CloudOfflineQueueEntry = { snapshot, queuedAtEpochMs: nowMs, uidHint };
  saveCloudOfflineQueue(entry);
  return entry;
}

export function clearCloudOfflineQueue(): void {
  saveCloudOfflineQueue(null);
}

export function cloudOfflineQueuePending(): boolean {
  return loadCloudOfflineQueue() !== null;
}
