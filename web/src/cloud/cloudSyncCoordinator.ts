/**
 * Pull/push helper around CloudBackend + chooseCloudSnapshot. Failures are soft —
 * local slots remain authoritative when the network or backend is unavailable.
 *
 * Phase 11: when both local and remote are valid but differ, [CloudPullResult.conflict]
 * is set so the host can ask before applying.
 * Phase 22/25: persists anonymous refresh tokens for guest cloud recovery.
 * Phase 25: failed pushes enqueue an offline queue (latest snapshot wins) and flush later.
 */
import {
  chooseCloudSnapshot,
  cloudConflictOffer,
  type CloudConflictOffer,
  type SyncDecision,
} from "../engine/cloudSync";
import type { GameSettings } from "../game/settingsStore";
import { createCloudBackend, type CloudBackend } from "./cloudBackend";
import {
  clearCloudOfflineQueue,
  cloudOfflineQueuePending,
  enqueueCloudOfflineSnapshot,
  loadCloudOfflineQueue,
} from "./cloudOfflineQueue";

export interface CloudPullResult {
  settings: GameSettings;
  decision: SyncDecision;
  /** Dual-snapshot choice when both sides are valid and differ; null = auto-apply decision. */
  conflict: CloudConflictOffer | null;
}

export interface CloudPushResult {
  settings: GameSettings;
  uploaded: boolean;
  queued: boolean;
}

function withSession(settings: GameSettings, uid: string, refreshToken: string | null): GameSettings {
  if (settings.cloudAccountId === uid && settings.cloudRefreshToken === refreshToken) return settings;
  return { ...settings, cloudAccountId: uid, cloudRefreshToken: refreshToken };
}

export class CloudSyncCoordinator {
  constructor(private readonly backend: CloudBackend = createCloudBackend()) {}

  get available(): boolean { return this.backend.available; }
  get kind(): string { return this.backend.kind; }

  hasPendingOfflinePush(): boolean {
    return cloudOfflineQueuePending();
  }

  async ensureAccount(settings: GameSettings): Promise<{ settings: GameSettings; uid: string }> {
    const session = await this.backend.ensureAccount(settings.cloudAccountId, settings.cloudRefreshToken);
    return { settings: withSession(settings, session.uid, session.refreshToken), uid: session.uid };
  }

  async pullMerge(settings: GameSettings, localLatest: string | null): Promise<CloudPullResult> {
    if (!settings.cloudSyncEnabled) {
      return {
        settings,
        decision: {
          text: localLatest,
          source: localLatest ? "local" : "none",
          reason: "cloud sync off",
        },
        conflict: null,
      };
    }
    try {
      const { settings: next, uid } = await this.ensureAccount(settings);
      const remote = await this.backend.get(uid);
      return {
        settings: next,
        decision: chooseCloudSnapshot(localLatest, remote),
        conflict: cloudConflictOffer(localLatest, remote),
      };
    } catch {
      return {
        settings,
        decision: {
          text: localLatest,
          source: localLatest ? "local" : "none",
          reason: "cloud pull failed; keep local",
        },
        conflict: null,
      };
    }
  }

  async push(settings: GameSettings, snapshot: string): Promise<CloudPushResult> {
    if (!settings.cloudSyncEnabled) {
      return { settings, uploaded: false, queued: false };
    }
    if (!this.backend.available) {
      enqueueCloudOfflineSnapshot(snapshot, settings.cloudAccountId);
      return { settings, uploaded: false, queued: true };
    }
    try {
      const { settings: next, uid } = await this.ensureAccount(settings);
      await this.backend.put(uid, snapshot);
      clearCloudOfflineQueue();
      return { settings: next, uploaded: true, queued: false };
    } catch {
      enqueueCloudOfflineSnapshot(snapshot, settings.cloudAccountId);
      return { settings, uploaded: false, queued: true };
    }
  }

  /** Attempt to upload any queued offline snapshot. */
  async flushOfflineQueue(settings: GameSettings): Promise<CloudPushResult> {
    if (!settings.cloudSyncEnabled) {
      return { settings, uploaded: false, queued: false };
    }
    const pending = loadCloudOfflineQueue();
    if (!pending) return { settings, uploaded: false, queued: false };
    if (!this.backend.available) {
      return { settings, uploaded: false, queued: true };
    }
    try {
      const { settings: next, uid } = await this.ensureAccount(settings);
      await this.backend.put(uid, pending.snapshot);
      clearCloudOfflineQueue();
      return { settings: next, uploaded: true, queued: false };
    } catch {
      return { settings, uploaded: false, queued: true };
    }
  }

  async clearRemote(settings: GameSettings): Promise<void> {
    if (!settings.cloudSyncEnabled || !settings.cloudAccountId) return;
    try {
      await this.backend.clear(settings.cloudAccountId);
    } catch {
      // Soft failure.
    }
  }
}
