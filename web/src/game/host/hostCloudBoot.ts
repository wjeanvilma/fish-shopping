/**
 * Finish 6.0 Phase 5 — GameHost title/cloud boot + recovery helpers.
 */
import type { ContentPack, GameState } from "../../engine";
import {
  GameState as GameStateCtor,
  NewerSaveError,
  Simulation,
  buildView,
  decodeSnapshotEnvelope,
} from "../../engine";
import { sharedAnalyticsBus } from "../../analytics/analyticsBus";
import { peekSnapshot, summaryOf, type SyncSource } from "../../engine/cloudSync";
import { cloudConflictView, localRecoveryView } from "../snapshotChoice";
import { STORAGE_UNAVAILABLE_TOAST } from "../lifecyclePolicy";
import { saveSettings } from "../settingsStore";
import type { GameHost } from "../GameHost";

const START_HARBOR = "harbor.sunrise_pier";

export class HostCloudBoot {
  constructor(private readonly host: GameHost) {}

/**
 * Load the chosen snapshot, or park Phase 11 choice/recovery UI and return null.
 */
async restoreOrCreate(content: ContentPack): Promise<{ state: GameState; savedAtEpochMs: number | null } | null> {
  const candidates = await this.host.store!.readCandidates();
  const localLatest = candidates.find(([label]) => label === "latest")?.[1] ?? null;
  const pull = await this.host.cloud.pullMerge(this.host.settings, localLatest);
  if (pull.settings !== this.host.settings) {
    this.host.settings = pull.settings;
    saveSettings(this.host.settings);
  }
  if (pull.conflict) {
    this.host.pendingConflict = pull.conflict;
    this.host.cloudConflictView = cloudConflictView(pull.conflict, content);
    this.host.localRecoveryView = null;
    this.host.pendingRecoveryText = null;
    this.host.publishTitle(true);
    return null;
  }
  if (pull.decision.source === "remote" && pull.decision.text) {
    try {
      await this.host.store!.write(pull.decision.text, true);
      const decoded = decodeSnapshotEnvelope(content, pull.decision.text);
      this.host.say("Restored newer cloud save");
      return decoded;
    } catch (e) {
      console.warn("Cloud save unusable:", e);
    }
  }
  let latestCorrupt = false;
  for (const [label, text] of candidates) {
    try {
      const decoded = decodeSnapshotEnvelope(content, text);
      if (label !== "latest") {
        if (latestCorrupt) {
          const peeked = peekSnapshot(text);
          if (peeked) {
            this.host.pendingRecoveryText = text;
            this.host.localRecoveryView = localRecoveryView(summaryOf(peeked, "local"), content);
            this.host.pendingConflict = null;
            this.host.cloudConflictView = null;
            this.host.publishTitle(true);
            return null;
          }
        }
        this.host.rotateOnNextSave = false;
        this.host.say("Recovered your previous save");
      }
      return decoded;
    } catch (e) {
      if (e instanceof NewerSaveError) throw e; // never overwrite a newer app's save
      if (label === "latest") latestCorrupt = true;
      console.warn(`Save '${label}' unusable:`, e);
    }
  }
  return { state: GameStateCtor.newGame(content, START_HARBOR, (Math.random() * 2 ** 32) | 0), savedAtEpochMs: null };
}

/** Phase 11: apply the player's dual-snapshot choice. */
async resolveCloudConflict(source: SyncSource): Promise<void> {
  if (this.host.booting || this.host.state.status !== "title" || !this.host.content || !this.host.store) return;
  const offer = this.host.pendingConflict;
  if (!offer || (source !== "local" && source !== "remote")) return;
  this.host.booting = true;
  try {
    const text = source === "remote" ? offer.remoteText : offer.localText;
    await this.host.store.write(text, true);
    const decoded = decodeSnapshotEnvelope(this.host.content, text);
    this.clearSaveChoiceUi();
    sharedAnalyticsBus.onSaveRecovery(source === "remote" ? "cloud_remote" : "cloud_local");
    this.host.say(source === "remote" ? "Restored cloud save" : "Kept this device's save");
    this.bootSim(decoded.state, decoded.savedAtEpochMs);
    // Phase 3: store IAP remains SoT after local/remote choice.
    await this.host.reconcileEntitlementsFromStore();
  } catch (e) {
    this.host.allowSaving = !(e instanceof NewerSaveError);
    this.clearSaveChoiceUi();
    this.host.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
  } finally {
    this.host.booting = false;
  }
}

/** Phase 11: load the previous backup after a corrupt latest. */
async confirmLocalRecovery(): Promise<void> {
  if (this.host.booting || this.host.state.status !== "title" || !this.host.content || !this.host.store) return;
  const text = this.host.pendingRecoveryText;
  if (!text) return;
  this.host.booting = true;
  try {
    const decoded = decodeSnapshotEnvelope(this.host.content, text);
    this.host.rotateOnNextSave = false;
    this.clearSaveChoiceUi();
    sharedAnalyticsBus.onSaveRecovery("local_previous");
    this.host.say("Recovered your previous save");
    this.bootSim(decoded.state, decoded.savedAtEpochMs);
    await this.host.reconcileEntitlementsFromStore();
  } catch (e) {
    this.host.allowSaving = !(e instanceof NewerSaveError);
    this.clearSaveChoiceUi();
    this.host.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
  } finally {
    this.host.booting = false;
  }
}

/** Phase 11: dismiss recovery dialog and stay on the title screen. */
dismissLocalRecovery(): void {
  if (this.host.state.status !== "title") return;
  this.clearSaveChoiceUi();
  void this.refreshTitleHasSave();
}


clearSaveChoiceUi(): void {
  this.host.pendingConflict = null;
  this.host.cloudConflictView = null;
  this.host.pendingRecoveryText = null;
  this.host.localRecoveryView = null;
}


async refreshTitleHasSave(): Promise<void> {
  let hasSave = false;
  if (this.host.store) {
    try {
      hasSave = (await this.host.store.readCandidates()).length > 0;
    } catch {
      hasSave = this.host.allowSaving;
    }
  }
  this.host.publishTitle(hasSave);
}

/** Wipe slots and start a new harbor. Title screen confirms before calling this.host. */
async newGame(): Promise<void> {
  if (this.host.booting || this.host.state.status !== "title" || !this.host.content || !this.host.store) return;
  this.host.booting = true;
  try {
    this.clearSaveChoiceUi();
    await this.host.cloud.clearRemote(this.host.settings);
    await this.host.store.clear();
    this.host.rotateOnNextSave = true;
    const state = GameStateCtor.newGame(this.host.content, START_HARBOR, (Math.random() * 2 ** 32) | 0);
    this.bootSim(state, null);
    // Phase 3: paid unlocks survive new-game wipe of harbor progress.
    await this.host.reconcileEntitlementsFromStore();
  } catch (e) {
    this.host.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
  } finally {
    this.host.booting = false;
  }
}

/** Checkpoint and leave the harbor. The simulation stays in memory until the next boot. */
async returnToTitle(): Promise<void> {
  this.host.running = false;
  this.host.enqueueMove(0, 0);
  if (this.host.sim && this.host.commands.length > 0) this.host.step(this.host.sim);
  this.host.save();
  this.host.clearPanels();
  this.clearSaveChoiceUi();
  this.host.pendingOfflineReport = null;
  this.host.commands.length = 0;
  this.host.pendingFlying = [];
  this.host.pendingBursts = [];
  this.host.lastMove = { x: 0, z: 0 };
  try {
    await this.host.saveChain;
  } catch {
    // save() already logged the failure
  }
  let hasSave = false;
  if (this.host.store) {
    try {
      hasSave = (await this.host.store.readCandidates()).length > 0;
    } catch {
      hasSave = this.host.allowSaving;
    }
  }
  this.host.publishTitle(hasSave);
}


bootSim(state: GameState, savedAtEpochMs: number | null): void {
  this.host.commands.length = 0;
  this.host.lastMove = { x: 0, z: 0 };
  this.host.pendingFlying = [];
  this.host.pendingBursts = [];
  this.host.pendingOfflineReport = null;
  this.host.clearPanels();
  sharedAnalyticsBus.resetSessionFlags();
  this.host.applyAnalyticsConsent();
  this.host.sim = new Simulation(this.host.content!, state);
  this.host.lastCheckpointEpochMs = savedAtEpochMs;
  this.host.applyPendingOffline(Date.now());
  this.host.syncWallClock(Date.now());
  if (this.host.pendingOfflineReport !== null || savedAtEpochMs !== null) this.host.save();
  this.host.latestView = buildView(this.host.sim);
  if (this.host.store && !this.host.store.persistent) this.host.say(STORAGE_UNAVAILABLE_TOAST);
  this.host.publish(true);
  this.host.resume();
  this.host.flushPendingDeepLink();
}

}
