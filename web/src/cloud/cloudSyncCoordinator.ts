/**
 * Pull/push helper around CloudBackend + chooseCloudSnapshot. Failures are soft —
 * local slots remain authoritative when the network or backend is unavailable.
 */
import { chooseCloudSnapshot, type SyncDecision } from "../engine/cloudSync";
import type { GameSettings } from "../game/settingsStore";
import { createCloudBackend, type CloudBackend } from "./cloudBackend";

export interface CloudPullResult {
  settings: GameSettings;
  decision: SyncDecision;
}

export class CloudSyncCoordinator {
  constructor(private readonly backend: CloudBackend = createCloudBackend()) {}

  get available(): boolean { return this.backend.available; }
  get kind(): string { return this.backend.kind; }

  async ensureAccount(settings: GameSettings): Promise<{ settings: GameSettings; uid: string }> {
    const uid = await this.backend.ensureAccount(settings.cloudAccountId);
    const next = settings.cloudAccountId === uid ? settings : { ...settings, cloudAccountId: uid };
    return { settings: next, uid };
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
      };
    }
    try {
      const { settings: next, uid } = await this.ensureAccount(settings);
      const remote = await this.backend.get(uid);
      return { settings: next, decision: chooseCloudSnapshot(localLatest, remote) };
    } catch {
      return {
        settings,
        decision: {
          text: localLatest,
          source: localLatest ? "local" : "none",
          reason: "cloud pull failed; keep local",
        },
      };
    }
  }

  async push(settings: GameSettings, snapshot: string): Promise<GameSettings> {
    if (!settings.cloudSyncEnabled) return settings;
    try {
      const { settings: next, uid } = await this.ensureAccount(settings);
      await this.backend.put(uid, snapshot);
      return next;
    } catch {
      return settings;
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
