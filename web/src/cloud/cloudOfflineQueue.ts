/**
 * Phase 25 — offline cloud push queue (latest snapshot wins).
 * Finish 5.0 Phase 22 adds attempt / age sync diagnostics.
 * Presentation/local only; not part of the sim parity save.
 */
import productionPath from "../../../shared/cloud/production-path.json";

export interface CloudOfflineQueueEntry {
  snapshot: string;
  queuedAtEpochMs: number;
  uidHint: string | null;
  /** Finish 5.0 Phase 22 — enqueue/retry attempts for sync diagnostics. */
  attempts: number;
  lastAttemptEpochMs: number;
}

export interface CloudOfflineQueueDiagnostics {
  queuePending: boolean;
  queueAgeMs: number;
  attempts: number;
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
    const queuedAtEpochMs =
      typeof parsed.queuedAtEpochMs === "number" ? parsed.queuedAtEpochMs : Date.now();
    return {
      snapshot: parsed.snapshot,
      queuedAtEpochMs,
      uidHint: typeof parsed.uidHint === "string" ? parsed.uidHint : null,
      attempts: typeof parsed.attempts === "number" && parsed.attempts > 0 ? parsed.attempts : 1,
      lastAttemptEpochMs:
        typeof parsed.lastAttemptEpochMs === "number" ? parsed.lastAttemptEpochMs : queuedAtEpochMs,
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
  const prior = loadCloudOfflineQueue();
  const entry: CloudOfflineQueueEntry = {
    snapshot,
    queuedAtEpochMs: prior?.queuedAtEpochMs ?? nowMs,
    uidHint,
    attempts: (prior?.attempts ?? 0) + 1,
    lastAttemptEpochMs: nowMs,
  };
  saveCloudOfflineQueue(entry);
  return entry;
}

export function clearCloudOfflineQueue(): void {
  saveCloudOfflineQueue(null);
}

export function cloudOfflineQueuePending(): boolean {
  return loadCloudOfflineQueue() !== null;
}

/** Finish 5.0 Phase 22 — sync diagnostics for pending offline cloud push. */
export function cloudOfflineQueueDiagnostics(nowMs = Date.now()): CloudOfflineQueueDiagnostics {
  const entry = loadCloudOfflineQueue();
  if (!entry) {
    return { queuePending: false, queueAgeMs: 0, attempts: 0 };
  }
  return {
    queuePending: true,
    queueAgeMs: Math.max(0, nowMs - entry.queuedAtEpochMs),
    attempts: entry.attempts,
  };
}
