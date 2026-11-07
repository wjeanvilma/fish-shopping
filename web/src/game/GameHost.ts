/**
 * Owns the simulation in the browser (the web counterpart of Android's GameViewModel).
 * React and Three.js never mutate game state: input becomes Commands, and they read
 * immutable SimView snapshots. The HUD snapshot is published ~10 times per second and
 * immediately after transactions (blueprint "Rendering boundary").
 */
import contentJson from "../../../shared/content/content-pack.json";
import {
  type Command, type ContentPack, CosmeticsIapSystem, FixedStepClock, FullUnlockSystem, GameState, INPUT_SCALE, NewerSaveError, OfflinePolicy,
  type OfflineReport, ProductionSystem, Simulation, type SimView, applyOffline, buildView,
  decodeSnapshotEnvelope, encodeBalanceExport, encodeSnapshot, encodeTelemetry, loadContent,
} from "../engine";
import { AudioBus } from "../audio/audioBus";
import { sfxFromEvent } from "../audio/sfxCues";
import { sharedAnalyticsBus } from "../analytics/analyticsBus";
import {
  createEntitlementBilling,
  isProductionWebBilling,
  type EntitlementBilling,
  type RestoredEntitlement,
} from "../billing/entitlementBilling";
import {
  mergeStoreAndPending,
  neededGrants,
  snapshotOf as entitlementSnapshotOf,
  type StoreOwned,
} from "../billing/entitlementReconcile";
import { PendingEntitlementLedger } from "../billing/pendingEntitlementLedger";
import { CloudSyncCoordinator } from "../cloud/cloudSyncCoordinator";
import { peekSnapshot, summaryOf, type CloudConflictOffer, type SyncSource } from "../engine/cloudSync";
import { CameraRig } from "./cameraRig";
import { resolveVisibleCosmetic, sanitizeEquippedCosmetic } from "../engine/cosmeticPresentation";
import { STORAGE_UNAVAILABLE_TOAST } from "./lifecyclePolicy";
import { openSaveStore, type SaveStore } from "./saveStore";
import {
  formatLastSavedLabel,
  loadSettings,
  saveSettings,
  type GameSettings,
  type QualityPreset,
  type SaveStatusView,
} from "./settingsStore";
import {
  cloudConflictView,
  localRecoveryView,
  type CloudConflictView,
  type LocalRecoveryView,
} from "./snapshotChoice";
import {
  resolveCatchBurst,
  resolveCelebrateBurst,
  resolveFlyingTransfer,
  resolveMachineDoneBurst,
  resolvePayBurst,
  type FlyingTransferCue,
  type ShakeKind,
  type WorldBurstCue,
} from "../render/presenters";
import { stickFromTapTarget, type TapTarget } from "../presenters/tapToMove";

export type HostState =
  | { status: "loading" }
  | {
      status: "title";
      hasSave: boolean;
      cloudConflict: CloudConflictView | null;
      localRecovery: LocalRecoveryView | null;
      settings: GameSettings;
    }
  | {
      status: "ready";
      view: SimView;
      upgradesOpen: boolean;
      staffOpen: boolean;
      questsOpen: boolean;
      contractsOpen: boolean;
      mapOpen: boolean;
      warehouseOpen: boolean;
      speciesBookOpen: boolean;
      dashboardOpen: boolean;
      pauseOpen: boolean;
      settingsOpen: boolean;
      bagOpen: boolean;
      stationOpen: boolean;
      offlineReport: OfflineReport | null;
      settings: GameSettings;
    }
  | { status: "failed"; message: string };

type PanelId =
  | "upgrades"
  | "staff"
  | "quests"
  | "contracts"
  | "map"
  | "warehouse"
  | "speciesBook"
  | "dashboard"
  | "pause"
  | "settings"
  | "bag"
  | "station";

const START_HARBOR = "harbor.sunrise_pier";
const HUD_PUBLISH_INTERVAL_MS = 100;

export class GameHost {
  private state: HostState = { status: "loading" };
  private readonly listeners = new Set<() => void>();
  private readonly messageListeners = new Set<(m: string) => void>();
  private readonly commands: Command[] = [];
  private readonly clock = new FixedStepClock();
  private content: ContentPack | null = null;
  private sim: Simulation | null = null;
  private store: SaveStore | null = null;
  private settings: GameSettings = loadSettings();
  private readonly audio = new AudioBus();
  private readonly cloud = new CloudSyncCoordinator();
  private readonly billing: EntitlementBilling = createEntitlementBilling();
  private readonly pendingEntitlements = new PendingEntitlementLedger();
  private allowSaving = true;
  private rotateOnNextSave = true;
  private upgradesOpen = false;
  private staffOpen = false;
  private questsOpen = false;
  private contractsOpen = false;
  private mapOpen = false;
  private warehouseOpen = false;
  private speciesBookOpen = false;
  private dashboardOpen = false;
  private pauseOpen = false;
  private settingsOpen = false;
  private bagOpen = false;
  private stationOpen = false;
  private running = false;
  private booting = false;
  private lastMove = { x: 0, z: 0 };
  private lastHudPublishMs = 0;
  private saveChain: Promise<void> = Promise.resolve();
  private lastCheckpointEpochMs: number | null = null;
  private pendingOfflineReport: OfflineReport | null = null;
  /** Phase 11: parked dual-snapshot choice (texts kept until the player picks). */
  private pendingConflict: CloudConflictOffer | null = null;
  private cloudConflictView: CloudConflictView | null = null;
  /** Phase 11: parked corrupt-latest → previous recovery. */
  private pendingRecoveryText: string | null = null;
  private localRecoveryView: LocalRecoveryView | null = null;
  /** Presentation-only tap-to-move destination (cleared by stick/keys or on arrival). */
  private tapTarget: TapTarget | null = null;
  /** True while joystick/keyboard is holding a non-zero stick. */
  private stickActive = false;

  /** Latest snapshot for the renderer (updated every tick). */
  latestView: SimView | null = null;

  /** Presentation-only flying transfer cues (drained each frame by the scene). */
  private pendingFlying: FlyingTransferCue[] = [];
  /** Phase 16/21 world bursts (catch / pay / celebrate / machine_done). */
  private pendingBursts: WorldBurstCue[] = [];
  /** Phase 21 screen-shake kinds (drained each frame by the scene). */
  private pendingShakes: ShakeKind[] = [];

  private starting: Promise<void> | null = null;

  /** Drain queued transfer arcs for the harbor scene. */
  drainFlyingTransfers(): FlyingTransferCue[] {
    if (this.pendingFlying.length === 0) return [];
    const out = this.pendingFlying;
    this.pendingFlying = [];
    return out;
  }

  /** Drain Phase 16/21 world burst cues for the harbor scene. */
  drainWorldBursts(): WorldBurstCue[] {
    if (this.pendingBursts.length === 0) return [];
    const out = this.pendingBursts;
    this.pendingBursts = [];
    return out;
  }

  /** Drain Phase 21 shake cues for the harbor scene. */
  drainShakes(): ShakeKind[] {
    if (this.pendingShakes.length === 0) return [];
    const out = this.pendingShakes;
    this.pendingShakes = [];
    return out;
  }

  /** Idempotent: React StrictMode mounts effects twice in development. */
  start(): Promise<void> {
    this.applyAudioSettings();
    this.starting ??= this.doStart();
    return this.starting;
  }

  private applyAudioSettings(): void {
    this.audio.applyLevels({
      muted: this.settings.muted,
      musicVolume: this.settings.musicVolume,
      sfxVolume: this.settings.sfxVolume,
      hapticsEnabled: this.settings.hapticsEnabled,
    });
    // Phase 20: harbor vs shop bed from station panel.
    this.audio.syncMusicBedFromPanels(this.stationOpen);
  }

  private applyAnalyticsConsent(): void {
    sharedAnalyticsBus.setConsent(this.settings.analyticsConsent);
    if (this.settings.analyticsConsent) sharedAnalyticsBus.onSessionStart();
  }

  /** Phase 25: answer the title consent gate (or Settings toggle). */
  setAnalyticsConsent(consent: boolean): void {
    this.settings = {
      ...this.settings,
      analyticsConsent: consent,
      analyticsConsentDecided: true,
    };
    this.applyAnalyticsConsent();
    saveSettings(this.settings);
    if (this.state.status === "title") {
      this.publishTitle(this.state.hasSave);
    } else {
      this.publish(true);
    }
  }

  /** Phase 26: consent-gated analytics dashboard JSON (local rolling counters). */
  exportAnalyticsDashboardJson(): string {
    return sharedAnalyticsBus.exportDashboardJson();
  }

  hasAnalyticsDashboardAlerts(): boolean {
    return sharedAnalyticsBus.hasDashboardAlerts();
  }

  /** Unlock Web Audio after a user gesture (click / key / touch). */
  unlockAudio(): void {
    this.audio.unlock();
  }

  /** Phase 28: Web Audio unlocked after a user gesture. */
  audioUnlocked(): boolean {
    return this.audio.isUnlocked;
  }

  /** Phase 28: suspend/resume Web Audio with tab visibility (keeps unlock). */
  setAudioLifecycleSuspended(suspended: boolean): void {
    if (suspended) this.audio.suspendForLifecycle();
    else this.audio.resumeForLifecycle();
  }

  private async doStart(): Promise<void> {
    try {
      this.content = loadContent(contentJson);
      this.store = await openSaveStore();
      this.settings = loadSettings();
      this.applyAudioSettings();
      this.applyAnalyticsConsent();
      await this.consumeBillingReturnQuery();
      const candidates = await this.store.readCandidates();
      if (!this.store.persistent) this.say(STORAGE_UNAVAILABLE_TOAST);
      this.publishTitle(candidates.length > 0);
    } catch (e) {
      this.allowSaving = !(e instanceof NewerSaveError);
      this.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Continue from the newest usable save, or a fresh harbor if every slot is unusable. */
  async continueGame(): Promise<void> {
    if (this.booting || this.state.status !== "title" || !this.content || !this.store) return;
    if (this.cloudConflictView || this.localRecoveryView) return;
    this.booting = true;
    try {
      const restored = await this.restoreOrCreate(this.content);
      if (!restored) return; // parked for cloud conflict or local recovery UI
      this.bootSim(restored.state, restored.savedAtEpochMs);
      await this.reconcileEntitlementsFromStore();
    } catch (e) {
      this.allowSaving = !(e instanceof NewerSaveError);
      this.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      this.booting = false;
    }
  }

  /** Phase 11: apply the player's dual-snapshot choice. */
  async resolveCloudConflict(source: SyncSource): Promise<void> {
    if (this.booting || this.state.status !== "title" || !this.content || !this.store) return;
    const offer = this.pendingConflict;
    if (!offer || (source !== "local" && source !== "remote")) return;
    this.booting = true;
    try {
      const text = source === "remote" ? offer.remoteText : offer.localText;
      await this.store.write(text, true);
      const decoded = decodeSnapshotEnvelope(this.content, text);
      this.clearSaveChoiceUi();
      sharedAnalyticsBus.onSaveRecovery(source === "remote" ? "cloud_remote" : "cloud_local");
      this.say(source === "remote" ? "Restored cloud save" : "Kept this device's save");
      this.bootSim(decoded.state, decoded.savedAtEpochMs);
      // Phase 3: store IAP remains SoT after local/remote choice.
      await this.reconcileEntitlementsFromStore();
    } catch (e) {
      this.allowSaving = !(e instanceof NewerSaveError);
      this.clearSaveChoiceUi();
      this.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      this.booting = false;
    }
  }

  /** Phase 11: load the previous backup after a corrupt latest. */
  async confirmLocalRecovery(): Promise<void> {
    if (this.booting || this.state.status !== "title" || !this.content || !this.store) return;
    const text = this.pendingRecoveryText;
    if (!text) return;
    this.booting = true;
    try {
      const decoded = decodeSnapshotEnvelope(this.content, text);
      this.rotateOnNextSave = false;
      this.clearSaveChoiceUi();
      sharedAnalyticsBus.onSaveRecovery("local_previous");
      this.say("Recovered your previous save");
      this.bootSim(decoded.state, decoded.savedAtEpochMs);
      await this.reconcileEntitlementsFromStore();
    } catch (e) {
      this.allowSaving = !(e instanceof NewerSaveError);
      this.clearSaveChoiceUi();
      this.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      this.booting = false;
    }
  }

  /** Phase 11: dismiss recovery dialog and stay on the title screen. */
  dismissLocalRecovery(): void {
    if (this.state.status !== "title") return;
    this.clearSaveChoiceUi();
    void this.refreshTitleHasSave();
  }

  private clearSaveChoiceUi(): void {
    this.pendingConflict = null;
    this.cloudConflictView = null;
    this.pendingRecoveryText = null;
    this.localRecoveryView = null;
  }

  private async refreshTitleHasSave(): Promise<void> {
    let hasSave = false;
    if (this.store) {
      try {
        hasSave = (await this.store.readCandidates()).length > 0;
      } catch {
        hasSave = this.allowSaving;
      }
    }
    this.publishTitle(hasSave);
  }

  /** Wipe slots and start a new harbor. Title screen confirms before calling this. */
  async newGame(): Promise<void> {
    if (this.booting || this.state.status !== "title" || !this.content || !this.store) return;
    this.booting = true;
    try {
      this.clearSaveChoiceUi();
      await this.cloud.clearRemote(this.settings);
      await this.store.clear();
      this.rotateOnNextSave = true;
      const state = GameState.newGame(this.content, START_HARBOR, (Math.random() * 2 ** 32) | 0);
      this.bootSim(state, null);
      // Phase 3: paid unlocks survive new-game wipe of harbor progress.
      await this.reconcileEntitlementsFromStore();
    } catch (e) {
      this.setState({ status: "failed", message: e instanceof Error ? e.message : String(e) });
    } finally {
      this.booting = false;
    }
  }

  /** Checkpoint and leave the harbor. The simulation stays in memory until the next boot. */
  async returnToTitle(): Promise<void> {
    this.running = false;
    this.enqueueMove(0, 0);
    if (this.sim && this.commands.length > 0) this.step(this.sim);
    this.save();
    this.clearPanels();
    this.clearSaveChoiceUi();
    this.pendingOfflineReport = null;
    this.commands.length = 0;
    this.pendingFlying = [];
    this.pendingBursts = [];
    this.lastMove = { x: 0, z: 0 };
    try {
      await this.saveChain;
    } catch {
      // save() already logged the failure
    }
    let hasSave = false;
    if (this.store) {
      try {
        hasSave = (await this.store.readCandidates()).length > 0;
      } catch {
        hasSave = this.allowSaving;
      }
    }
    this.publishTitle(hasSave);
  }

  private bootSim(state: GameState, savedAtEpochMs: number | null): void {
    this.commands.length = 0;
    this.lastMove = { x: 0, z: 0 };
    this.pendingFlying = [];
    this.pendingBursts = [];
    this.pendingOfflineReport = null;
    this.clearPanels();
    sharedAnalyticsBus.resetSessionFlags();
    this.applyAnalyticsConsent();
    this.sim = new Simulation(this.content!, state);
    this.lastCheckpointEpochMs = savedAtEpochMs;
    this.applyPendingOffline(Date.now());
    if (this.pendingOfflineReport !== null || savedAtEpochMs !== null) this.save();
    this.latestView = buildView(this.sim);
    if (this.store && !this.store.persistent) this.say(STORAGE_UNAVAILABLE_TOAST);
    this.publish(true);
    this.resume();
  }

  private publishTitle(hasSave: boolean): void {
    this.setState({
      status: "title",
      hasSave,
      cloudConflict: this.cloudConflictView,
      localRecovery: this.localRecoveryView,
      settings: this.settings,
    });
  }

  /**
   * Load the chosen snapshot, or park Phase 11 choice/recovery UI and return null.
   */
  private async restoreOrCreate(content: ContentPack): Promise<{ state: GameState; savedAtEpochMs: number | null } | null> {
    const candidates = await this.store!.readCandidates();
    const localLatest = candidates.find(([label]) => label === "latest")?.[1] ?? null;
    const pull = await this.cloud.pullMerge(this.settings, localLatest);
    if (pull.settings !== this.settings) {
      this.settings = pull.settings;
      saveSettings(this.settings);
    }
    if (pull.conflict) {
      this.pendingConflict = pull.conflict;
      this.cloudConflictView = cloudConflictView(pull.conflict, content);
      this.localRecoveryView = null;
      this.pendingRecoveryText = null;
      this.publishTitle(true);
      return null;
    }
    if (pull.decision.source === "remote" && pull.decision.text) {
      try {
        await this.store!.write(pull.decision.text, true);
        const decoded = decodeSnapshotEnvelope(content, pull.decision.text);
        this.say("Restored newer cloud save");
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
              this.pendingRecoveryText = text;
              this.localRecoveryView = localRecoveryView(summaryOf(peeked, "local"), content);
              this.pendingConflict = null;
              this.cloudConflictView = null;
              this.publishTitle(true);
              return null;
            }
          }
          this.rotateOnNextSave = false;
          this.say("Recovered your previous save");
        }
        return decoded;
      } catch (e) {
        if (e instanceof NewerSaveError) throw e; // never overwrite a newer app's save
        if (label === "latest") latestCorrupt = true;
        console.warn(`Save '${label}' unusable:`, e);
      }
    }
    return { state: GameState.newGame(content, START_HARBOR, (Math.random() * 2 ** 32) | 0), savedAtEpochMs: null };
  }

  // ---- loop -------------------------------------------------------------------------

  resume(): void {
    if (this.state.status !== "ready" || !this.sim) return;
    this.applyPendingOffline(Date.now());
    this.publish(true);
    this.running = true;
    this.clock.reset();
    void this.flushCloudOfflineQueue();
    if (this.settings.analyticsConsent) sharedAnalyticsBus.onSessionStart();
  }

  /** Called when the tab is hidden or the page is being unloaded: stop and checkpoint. */
  pause(): void {
    this.running = false;
    this.enqueueMove(0, 0);
    sharedAnalyticsBus.onSessionEndClean();
    this.save();
  }

  dismissOfflineReport(): void {
    this.pendingOfflineReport = null;
    this.publish(true);
  }

  private applyPendingOffline(nowEpochMs: number): void {
    const sim = this.sim;
    if (!sim) return;
    const since = this.lastCheckpointEpochMs;
    if (since === null) return;
    const elapsed = nowEpochMs - since;
    this.lastCheckpointEpochMs = nowEpochMs;
    if (elapsed <= 0) return;
    const report = applyOffline(sim, elapsed);
    if (OfflinePolicy.shouldShowSummary(sim.content, report)) {
      this.pendingOfflineReport = report;
      sharedAnalyticsBus.onOfflineClaimed(report);
    } else {
      this.pendingOfflineReport = null;
    }
    this.latestView = buildView(sim);
  }

  /** Advance the simulation for this animation frame. */
  frame(nowMs: number): void {
    const sim = this.sim;
    if (!sim || !this.running || this.panelOpen) {
      this.clock.reset();
      return;
    }
    this.applyTapToMove();
    const ticks = this.clock.advance(nowMs);
    for (let i = 0; i < ticks; i++) this.step(sim);
    if (ticks > 0) this.publish(false);
  }

  private step(sim: Simulation): void {
    const batch = this.commands.splice(0);
    let transaction = false;
    const transferred: { from: string; to: string; itemId: string }[] = [];
    const payCustomers: string[] = [];
    const machineDone: string[] = [];
    let celebrate = false;
    let catchCount = 0;
    const events = sim.step(batch);
    sharedAnalyticsBus.onGameEvents(events, sim.state);
    for (const e of events) {
      const cue = sfxFromEvent(e);
      if (cue) this.audio.play(cue);
      switch (e.type) {
        case "items_transferred":
          transferred.push({ from: e.from, to: e.to, itemId: e.itemId });
          break;
        case "batch_completed":
          machineDone.push(e.stationId);
          this.pendingShakes.push("cut");
          break;
        case "sale_committed": {
          const tip = e.preferenceMet === false ? " (substituted)"
            : (e.priceMultPermille ?? 1000) > 1000 ? " Premium tip!" : "";
          this.say(`+${e.coins} coins${tip}`);
          payCustomers.push(e.customerId);
          this.pendingShakes.push("sale");
          transaction = true;
          break;
        }
        case "fish_caught":
          catchCount += 1;
          this.pendingShakes.push("catch");
          if (e.personalBest) {
            const name = sim.content.itemName(e.speciesId);
            this.say(`New trophy: ${name} · ${e.sizePermille}%`);
            celebrate = true;
            transaction = true;
          } else if (e.timingBonus) {
            const tip = sim.content.speciesById.get(e.speciesId)?.baseValue ?? 0;
            this.say(`Perfect reel! +${tip}`);
            celebrate = true;
            transaction = true;
          }
          if (e.rareUpgrade) {
            this.say(`Rare catch: ${sim.content.speciesById.get(e.speciesId)?.name ?? e.speciesId}`);
            celebrate = true;
            transaction = true;
          }
          break;
        case "trophy_set_completed": {
          const setName = sim.content.trophySetsById.get(e.setId)?.name ?? e.setId;
          this.say(`Gallery complete: ${setName}`);
          celebrate = true;
          transaction = true;
          break;
        }
        case "coin_goal_reached":
          this.say(`Coin goal reached!`);
          celebrate = true;
          transaction = true;
          break;
        case "fishing_spot_depleted":
          this.say("Pier empty — fish are returning");
          transaction = true;
          break;
        case "rush_started":
          this.say(`${e.name}!`);
          celebrate = true;
          transaction = true;
          break;
        case "machine_idle_alert": {
          const name = sim.content.machinesById.get(e.machineId)?.name ?? e.stationId;
          this.say(`${name}: ${e.reason}`);
          transaction = true;
          break;
        }
        case "upgrade_purchased":
          if (!e.replayed) { this.say(`Bought ${sim.content.upgradesById.get(e.upgradeId)?.name ?? e.upgradeId}`); transaction = true; }
          break;
        case "full_harbor_unlock_granted":
          if (!e.replayed) { this.say("All harbors unlocked"); transaction = true; }
          break;
        case "iap_cosmetic_granted":
          if (!e.replayed) { this.say(`Unlocked ${e.cosmeticId}`); transaction = true; }
          break;
        case "iap_cosmetic_rejected":
          this.say(e.reason);
          transaction = true;
          break;
        case "purchase_rejected": this.say(e.reason); transaction = true; break;
        case "worker_hired":
          if (!e.replayed) { this.say(`Hired ${sim.content.workersById.get(e.roleId)?.name ?? e.roleId}`); transaction = true; }
          break;
        case "worker_leveled_up": {
          const name = sim.content.workersById.get(e.roleId)?.name ?? e.roleId;
          this.say(`${name} reached level ${e.level}`);
          break;
        }
        case "worker_shift_changed": {
          const name = sim.content.workersById.get(e.roleId)?.name ?? e.roleId;
          this.say(e.onShift ? `${name} on shift` : `${name} off shift`);
          break;
        }
        case "hire_rejected": this.say(e.reason); transaction = true; break;
        case "wages_paid":
          this.say(`Paid ${e.coins} coins in wages`);
          transaction = true;
          break;
        case "quest_completed": {
          const name = sim.content.questsById.get(e.questId)?.name ?? e.questId;
          const tip = e.coinsRewarded && e.coinsRewarded > 0
            ? `Goal complete: ${name} (+${e.coinsRewarded})`
            : `Goal complete: ${name}`;
          this.say(tip);
          transaction = true;
          break;
        }
        case "prestige_unlocked": {
          const name = sim.content.prestigeMilestonesById.get(e.prestigeId)?.name ?? e.prestigeId;
          const tip = e.coinsRewarded > 0
            ? `Prestige: ${name} (+${e.coinsRewarded})`
            : `Prestige: ${name}`;
          this.say(tip);
          transaction = true;
          break;
        }
        case "contract_accepted":
          if (!e.replayed) { this.say("Contract accepted"); transaction = true; }
          break;
        case "contract_completed":
          this.say(`Contract complete +${e.payout}`);
          transaction = true;
          break;
        case "contract_failed":
          this.say(e.penaltyPaid > 0 ? `Contract failed −${e.penaltyPaid}` : "Contract failed");
          transaction = true;
          break;
        case "contract_rejected": this.say(e.reason); transaction = true; break;
        case "harbor_traveled":
          if (!e.replayed) {
            const name = sim.content.harborsById.get(e.toHarborId)?.name ?? e.toHarborId;
            this.say(`Traveled to ${name}`);
            this.mapOpen = false;
            this.pendingFlying = [];
            this.pendingBursts = [];
            this.pendingShakes = [];
            transaction = true;
          }
          break;
        case "travel_rejected": this.say(e.reason); transaction = true; break;
        case "maintenance_paid":
          this.say(`Upkeep −${e.coins} coins`);
          transaction = true;
          break;
        case "items_spoiled": {
          const n = e.items.reduce((sum, it) => sum + it.quantity, 0);
          this.say(`Spoiled ${n} ${e.location === "bag" ? "in bag" : "on counter"}`);
          transaction = true;
          break;
        }
        case "checkpoint_requested": this.save(); break;
        default: break;
      }
    }
    this.latestView = buildView(sim);
    const view = this.latestView;
    if (view) {
      for (const t of transferred) {
        const cue = resolveFlyingTransfer(view, t.from, t.to, t.itemId);
        if (cue) this.pendingFlying.push(cue);
      }
      for (let i = 0; i < catchCount; i++) this.pendingBursts.push(resolveCatchBurst(view));
      for (const customerId of payCustomers) this.pendingBursts.push(resolvePayBurst(view, customerId));
      for (const stationId of machineDone) {
        const cue = resolveMachineDoneBurst(view, stationId);
        if (cue) this.pendingBursts.push(cue);
      }
      if (celebrate) {
        this.pendingBursts.push(resolveCelebrateBurst(view));
        this.pendingShakes.push("celebrate");
      }
    }
    if (transaction) this.publish(true);
  }

  // ---- intent ------------------------------------------------------------------------

  /** Joystick / keys in screen space: x right, y down, each -1..1. */
  setMove(screenX: number, screenY: number): void {
    if (this.panelOpen) return;
    const active = Math.hypot(screenX, screenY) > 0.01;
    this.stickActive = active;
    if (active) this.tapTarget = null;
    this.enqueueMove(screenX, screenY);
  }

  /**
   * Presentation-only tap-to-move. Coordinates are ground millimetres from
   * [CameraRig.groundFromNdc].
   */
  setTapMove(xMm: number, zMm: number): void {
    if (this.panelOpen || !this.settings.tapToMove) return;
    this.stickActive = false;
    this.tapTarget = { xMm, zMm };
  }

  private applyTapToMove(): void {
    if (this.stickActive || this.panelOpen || !this.settings.tapToMove) return;
    const target = this.tapTarget;
    if (!target) return;
    const view = this.latestView;
    if (!view) return;
    const stick = stickFromTapTarget(view.player.xMm, view.player.zMm, target);
    if (!stick) {
      this.tapTarget = null;
      this.enqueueMove(0, 0);
    } else {
      this.enqueueMove(stick.sx, stick.sy);
    }
  }

  private enqueueMove(screenX: number, screenY: number): void {
    const [wx, wz] = CameraRig.screenToWorld(screenX, screenY);
    const clamp = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.round(v * INPUT_SCALE)));
    const move = { x: clamp(wx), z: clamp(wz) };
    if (move.x !== this.lastMove.x || move.z !== this.lastMove.z) {
      this.lastMove = move;
      this.commands.push({ type: "move", ...move });
    }
  }

  private get panelOpen(): boolean {
    return this.upgradesOpen || this.staffOpen || this.questsOpen || this.contractsOpen || this.mapOpen
      || this.warehouseOpen || this.speciesBookOpen || this.dashboardOpen || this.pauseOpen || this.settingsOpen || this.bagOpen || this.stationOpen
      || this.pendingOfflineReport !== null;
  }

  private clearPanels(): void {
    this.upgradesOpen = false;
    this.staffOpen = false;
    this.questsOpen = false;
    this.contractsOpen = false;
    this.mapOpen = false;
    this.warehouseOpen = false;
    this.speciesBookOpen = false;
    this.dashboardOpen = false;
    this.pauseOpen = false;
    this.settingsOpen = false;
    this.bagOpen = false;
    this.stationOpen = false;
  }

  /** Opening one panel closes the others. Closing only clears that panel. */
  private setPanelOpen(which: PanelId, open: boolean): void {
    if (open) {
      this.upgradesOpen = which === "upgrades";
      this.staffOpen = which === "staff";
      this.questsOpen = which === "quests";
      this.contractsOpen = which === "contracts";
      this.mapOpen = which === "map";
      this.warehouseOpen = which === "warehouse";
      this.speciesBookOpen = which === "speciesBook";
      this.dashboardOpen = which === "dashboard";
      this.pauseOpen = which === "pause";
      this.settingsOpen = which === "settings";
      this.bagOpen = which === "bag";
      this.stationOpen = which === "station";
      this.tapTarget = null;
      this.stickActive = false;
      this.enqueueMove(0, 0);
      // Phase 19: authored UI click when a management panel opens.
      this.audio.play("ui");
      this.audio.syncMusicBedFromPanels(this.stationOpen);
    } else {
      switch (which) {
        case "upgrades": this.upgradesOpen = false; break;
        case "staff": this.staffOpen = false; break;
        case "quests": this.questsOpen = false; break;
        case "contracts": this.contractsOpen = false; break;
        case "map": this.mapOpen = false; break;
        case "warehouse": this.warehouseOpen = false; break;
        case "speciesBook": this.speciesBookOpen = false; break;
        case "dashboard": this.dashboardOpen = false; break;
        case "pause": this.pauseOpen = false; break;
        case "settings": this.settingsOpen = false; break;
        case "bag": this.bagOpen = false; break;
        case "station": this.stationOpen = false; break;
      }
      this.audio.syncMusicBedFromPanels(this.stationOpen);
    }
    this.publish(true);
  }

  setUpgradesOpen(open: boolean): void { this.setPanelOpen("upgrades", open); }
  setStaffOpen(open: boolean): void { this.setPanelOpen("staff", open); }
  setQuestsOpen(open: boolean): void { this.setPanelOpen("quests", open); }
  setContractsOpen(open: boolean): void { this.setPanelOpen("contracts", open); }
  setMapOpen(open: boolean): void { this.setPanelOpen("map", open); }
  setWarehouseOpen(open: boolean): void { this.setPanelOpen("warehouse", open); }
  setSpeciesBookOpen(open: boolean): void { this.setPanelOpen("speciesBook", open); }
  setDashboardOpen(open: boolean): void { this.setPanelOpen("dashboard", open); }
  setPauseOpen(open: boolean): void { this.setPanelOpen("pause", open); }
  setSettingsOpen(open: boolean): void { this.setPanelOpen("settings", open); }
  setBagOpen(open: boolean): void { this.setPanelOpen("bag", open); }
  setStationOpen(open: boolean): void { this.setPanelOpen("station", open); }

  /** Presentation settings (mute, volumes, haptics, quality, a11y, cloud). Not part of the parity save. */
  updateSettings(partial: Partial<GameSettings>): void {
    const enablingCloud = partial.cloudSyncEnabled === true && !this.settings.cloudSyncEnabled;
    this.settings = { ...this.settings, ...partial };
    if (!this.settings.tapToMove) this.tapTarget = null;
    this.applyAudioSettings();
    this.applyAnalyticsConsent();
    if (this.settings.cloudSyncEnabled && !this.cloud.available) {
      this.say("Cloud sync on — configure Firebase keys to link a remote save");
    }
    if (this.settings.cloudSyncEnabled) {
      void this.cloud.ensureAccount(this.settings).then(({ settings }) => {
        this.settings = settings;
        saveSettings(this.settings);
        this.publish(true);
        if (enablingCloud) void this.flushCloudOfflineQueue();
      });
    }
    saveSettings(this.settings);
    if (this.state.status === "title") {
      this.publishTitle(this.state.hasSave);
    } else {
      this.publish(true);
    }
  }

  /** Whether a remote backend is configured (Firebase keys). Local play never needs this. */
  cloudAvailable(): boolean {
    return this.cloud.available;
  }

  /** Phase 25: whether an offline cloud push is waiting. */
  cloudPendingUpload(): boolean {
    return this.cloud.hasPendingOfflinePush();
  }

  /** Phase 25: flush offline cloud queue (resume / online / settings enable). */
  async flushCloudOfflineQueue(): Promise<void> {
    if (!this.settings.cloudSyncEnabled) return;
    const flushed = await this.cloud.flushOfflineQueue(this.settings);
    if (
      flushed.settings.cloudAccountId !== this.settings.cloudAccountId ||
      flushed.settings.cloudRefreshToken !== this.settings.cloudRefreshToken
    ) {
      this.settings = flushed.settings;
      saveSettings(this.settings);
    }
    this.publish(true);
  }

  /** Privacy-safe Stats export (Phase 27). Null when no sim is running. */
  exportTelemetryJson(): string | null {
    const sim = this.sim;
    if (!sim) return null;
    return encodeTelemetry(sim.content, sim.state);
  }

  /** Content-pack balance knobs dump (Phase 27). */
  exportBalanceJson(): string | null {
    const pack = this.content ?? this.sim?.content;
    if (!pack) return null;
    return encodeBalanceExport(pack);
  }

  /** Quality preset for the renderer, including while the title screen is up. */
  renderQuality(): QualityPreset {
    return this.settings.quality;
  }

  /** Phase 10 a11y: snap camera / skip transfer VFX. */
  settingsReducedMotion(): boolean {
    return this.settings.reducedMotion;
  }

  /** Phase 24: equipped harbor banner (settings; presentation-only). */
  equippedCosmeticId(): string | null {
    return this.settings.equippedCosmeticId;
  }

  /** Phase 24: equip or clear a owned cosmetic banner. */
  setEquippedCosmeticId(cosmeticId: string | null): void {
    this.updateSettings({ equippedCosmeticId: cosmeticId });
  }

  /** Phase 24 ephemeral preview override (UI-owned; not persisted). */
  private previewCosmeticId: string | null = null;

  setPreviewCosmeticId(cosmeticId: string | null): void {
    if (this.previewCosmeticId === cosmeticId) return;
    this.previewCosmeticId = cosmeticId;
    this.publish(true);
  }

  previewCosmeticIdValue(): string | null {
    return this.previewCosmeticId;
  }

  /**
   * Phase 24: banner shown in the harbor — preview wins, else equipped if still owned.
   */
  visibleCosmeticBannerId(unlocked: Iterable<string>): string | null {
    const cleaned = sanitizeEquippedCosmetic(this.settings.equippedCosmeticId, unlocked);
    if (cleaned !== this.settings.equippedCosmeticId) {
      this.settings = { ...this.settings, equippedCosmeticId: cleaned };
      saveSettings(this.settings);
    }
    return resolveVisibleCosmetic(cleaned, this.previewCosmeticId, unlocked);
  }

  /** Phase 10 a11y: toast captions for alerts. */
  settingsCaptionsEnabled(): boolean {
    return this.settings.captionsEnabled;
  }

  /** Phase 10 Settings save/cloud status row. */
  saveStatus(): SaveStatusView {
    return {
      persistent: this.store?.persistent ?? false,
      lastSavedLabel: formatLastSavedLabel(this.lastCheckpointEpochMs),
      cloudEnabled: this.settings.cloudSyncEnabled,
      cloudAvailable: this.cloud.available,
      cloudLinked: !!this.settings.cloudAccountId,
      cloudPendingUpload: this.cloud.hasPendingOfflinePush(),
    };
  }

  setMachinePaused(stationId: string, paused: boolean): void {
    this.commands.push({ type: "set_machine_paused", stationId, paused });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  purchase(upgradeId: string): void {
    this.commands.push({ type: "purchase_upgrade", upgradeId, requestId: crypto.randomUUID() });
    // Management panels pause the world; advance a single tick so the command commits now.
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  /** Phase 6: confirm spend while standing on an expansion plot marker. */
  buildPlot(plotId: string): void {
    this.commands.push({ type: "build_plot", plotId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  purchaseDecor(decorId: string): void {
    this.commands.push({ type: "purchase_decor", decorId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  /** Phase 23 / post-1.0 Phase 2+3: one-time full-harbor unlock via web billing. */
  purchaseFullHarborUnlock(): void {
    void this.billing.purchaseFullUnlock(this.settings.cloudAccountId).then((result) => {
      if (!result.ok) {
        this.say(result.reason);
        return;
      }
      this.pendingEntitlements.enqueue(FullUnlockSystem.SKU, result.purchaseToken, null);
      this.applyStoreOwned(
        [{ sku: FullUnlockSystem.SKU, purchaseToken: result.purchaseToken, grantsCosmetic: null }],
        false,
      );
    });
  }

  /** Phase 23: restore purchases and grant if the store says owned. */
  restoreFullHarborUnlock(): void {
    void this.billing.restore(this.settings.cloudAccountId).then((result) => {
      if (!result.owned || !result.purchaseToken) {
        this.say("No harbor unlock to restore");
        return;
      }
      this.pendingEntitlements.enqueue(FullUnlockSystem.SKU, result.purchaseToken, null);
      this.applyStoreOwned(
        [{ sku: FullUnlockSystem.SKU, purchaseToken: result.purchaseToken, grantsCosmetic: null }],
        true,
      );
    });
  }

  /**
   * Phase 2 (post-1.0): after hosted checkout redirect (`?billing=success&session_id=`),
   * fulfill entitlements and strip the query so refresh does not re-fulfill.
   */
  private async consumeBillingReturnQuery(): Promise<void> {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "cancel") {
      this.say("Checkout canceled");
      this.stripBillingQuery();
      return;
    }
    if (billing !== "success") return;
    const sessionId = params.get("session_id") ?? params.get("sessionId");
    if (!sessionId) {
      this.stripBillingQuery();
      return;
    }
    if (!isProductionWebBilling(this.billing)) {
      this.stripBillingQuery();
      return;
    }
    try {
      const owned = await this.billing.completeCheckoutReturn(sessionId, this.settings.cloudAccountId);
      for (const row of owned) {
        this.pendingEntitlements.enqueue(row.sku, row.purchaseToken, row.grantsCosmetic);
      }
      // Title boot has no sim yet — ledger keeps grants until continue/newGame reconcile.
      if (owned.length > 0 && this.sim) {
        this.applyStoreOwned(owned, true);
      } else if (owned.length > 0) {
        this.say(`Purchase saved — continue to apply ${owned.length}`);
      }
    } catch (err) {
      this.say(err instanceof Error ? err.message : "Checkout fulfill failed");
    } finally {
      this.stripBillingQuery();
    }
  }

  private stripBillingQuery(): void {
    if (typeof window === "undefined" || !window.history?.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("billing");
    url.searchParams.delete("session_id");
    url.searchParams.delete("sessionId");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }

  /** Phase 24: purchase a power-neutral cosmetic SKU. */
  purchaseIapCosmetic(sku: string): void {
    void this.billing.purchaseCosmetic(sku, this.settings.cloudAccountId).then((result) => {
      if (!result.ok) {
        this.say(result.reason);
        return;
      }
      const cosmeticId = CosmeticsIapSystem.BY_SKU.get(sku)?.grantsCosmetic;
      if (!cosmeticId) {
        this.say("Unknown cosmetic SKU");
        return;
      }
      this.pendingEntitlements.enqueue(sku, result.purchaseToken, cosmeticId);
      this.applyStoreOwned(
        [{ sku, purchaseToken: result.purchaseToken, grantsCosmetic: cosmeticId }],
        false,
      );
    });
  }

  /** Phase 24 / post-1.0 Phase 2+3: restore all entitlements (full unlock + cosmetics). */
  restorePurchases(): void {
    void this.billing.restoreAll(this.settings.cloudAccountId).then((owned) => {
      if (owned.length === 0 && this.pendingEntitlements.all().length === 0) {
        this.say("No purchases to restore");
        return;
      }
      for (const row of owned) {
        this.pendingEntitlements.enqueue(row.sku, row.purchaseToken, row.grantsCosmetic);
      }
      this.applyStoreOwned(owned, true);
    });
  }

  /**
   * Phase 3: store is SoT for paid SKUs — merge restore + pending ledger into the live save,
   * apply only missing flags/receipts, checkpoint, then ack the ledger.
   */
  private async reconcileEntitlementsFromStore(): Promise<void> {
    const owned = await this.billing.restoreAll(this.settings.cloudAccountId).catch(() => [] as RestoredEntitlement[]);
    this.applyStoreOwned(owned, false);
  }

  private applyStoreOwned(owned: RestoredEntitlement[], announceRestore: boolean): void {
    const sim = this.sim;
    if (!sim) return;
    const storeRows: StoreOwned[] = owned.map((row) => ({
      sku: row.sku,
      purchaseToken: row.purchaseToken,
      grantsCosmetic: row.grantsCosmetic,
    }));
    const merged = mergeStoreAndPending(storeRows, this.pendingEntitlements.all());
    const needs = neededGrants(merged, entitlementSnapshotOf(sim.state));
    if (needs.length === 0) {
      this.pendingEntitlements.ackRequestIds(new Set(sim.state.purchaseReceipts.keys()));
      if (announceRestore) {
        const n = merged.length;
        this.say(n === 0 ? "No purchases to restore" : `Restored ${n} purchase${n === 1 ? "" : "s"}`);
      }
      return;
    }
    for (const need of needs) {
      this.pendingEntitlements.enqueue(need.sku, need.purchaseToken, need.cosmeticId);
      if (need.cosmeticId) {
        this.commands.push({
          type: "grant_iap_cosmetic",
          cosmeticId: need.cosmeticId,
          requestId: need.requestId,
        });
      } else {
        this.commands.push({
          type: "grant_full_harbor_unlock",
          requestId: need.requestId,
        });
      }
    }
    this.step(sim);
    this.publish(true);
    this.save();
    this.pendingEntitlements.ackRequestIds(new Set(sim.state.purchaseReceipts.keys()));
    if (announceRestore) {
      this.say(`Restored ${merged.length} purchase${merged.length === 1 ? "" : "s"}`);
    } else if (needs.some((n) => !n.cosmeticId && n.reason.includes("flag")) && sim.state.fullHarborUnlock) {
      this.say("Harbor unlock restored");
    }
  }

  repairMachine(stationId: string): void {
    this.commands.push({ type: "repair_machine", stationId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  takeLoan(): void {
    this.commands.push({ type: "take_loan", requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  repayLoan(): void {
    this.commands.push({ type: "repay_loan", requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  setCoinGoal(amount: number): void {
    this.commands.push({ type: "set_coin_goal", amount });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  hire(roleId: string): void {
    this.commands.push({ type: "hire_worker", roleId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  setWorkerShift(workerId: string, onShift: boolean): void {
    this.commands.push({ type: "set_worker_shift", workerId, onShift });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  assignWorkerGear(workerId: string, upgradeId: string): void {
    this.commands.push({ type: "assign_worker_gear", workerId, upgradeId });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  unequipWorkerGear(workerId: string, slotId: string): void {
    this.commands.push({ type: "unequip_worker_gear", workerId, slotId });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  acceptContract(offerId: string): void {
    this.commands.push({ type: "accept_contract", offerId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  deliverContract(contractId: string): void {
    this.commands.push({ type: "deliver_contract", contractId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  travelToHarbor(harborId: string): void {
    this.commands.push({ type: "travel_to_harbor", harborId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  buyBait(baitId: string): void {
    this.commands.push({ type: "buy_bait", baitId, requestId: crypto.randomUUID() });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  selectBait(baitId: string | null): void {
    this.commands.push({ type: "select_bait", baitId });
    if (this.panelOpen && this.sim && !this.pendingOfflineReport) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  reel(): void {
    if (this.panelOpen) return;
    this.commands.push({ type: "reel" });
  }

  /** Cycle Auto → each recipe → Auto for a station (no tick advance). */
  cycleStationRecipe(stationId: string): void {
    if (!this.sim || this.pendingOfflineReport) return;
    if (this.panelOpen && !this.stationOpen) return;
    const m = this.sim.state.machines.find((mm) => mm.stationId === stationId);
    if (!m) return;
    ProductionSystem.cyclePreferredRecipe(this.sim.content, m);
    this.latestView = buildView(this.sim);
    this.publish(true);
  }

  // ---- persistence -------------------------------------------------------------------

  /** Encodes one consistent tick synchronously; writes are serialised. */
  save(): void {
    const sim = this.sim;
    const store = this.store;
    if (!sim || !store || !this.allowSaving) return;
    const now = Date.now();
    this.lastCheckpointEpochMs = now;
    const text = encodeSnapshot(sim.content, sim.state, now);
    const rotate = this.rotateOnNextSave;
    this.rotateOnNextSave = true;
    const syncSettings = this.settings;
    this.saveChain = this.saveChain
      .then(() => store.write(text, rotate))
      .then(() => this.cloud.push(syncSettings, text))
      .then(async (pushed) => {
        if (
          pushed.settings.cloudAccountId !== syncSettings.cloudAccountId ||
          pushed.settings.cloudRefreshToken !== syncSettings.cloudRefreshToken
        ) {
          this.settings = pushed.settings;
          saveSettings(this.settings);
        }
        if (pushed.queued || this.cloud.hasPendingOfflinePush()) {
          await this.flushCloudOfflineQueue();
        }
      })
      .catch((e) => console.error("Save failed", e));
  }

  // ---- subscriptions (useSyncExternalStore) -----------------------------------------

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getState = (): HostState => this.state;

  onMessage(l: (m: string) => void): () => void {
    this.messageListeners.add(l);
    return () => this.messageListeners.delete(l);
  }

  private say(m: string): void {
    this.messageListeners.forEach((l) => l(m));
  }

  private publish(force: boolean): void {
    if (!this.latestView) return;
    const now = performance.now();
    if (!force && now - this.lastHudPublishMs < HUD_PUBLISH_INTERVAL_MS) return;
    this.lastHudPublishMs = now;
    this.setState({
      status: "ready",
      view: this.latestView,
      upgradesOpen: this.upgradesOpen,
      staffOpen: this.staffOpen,
      questsOpen: this.questsOpen,
      contractsOpen: this.contractsOpen,
      mapOpen: this.mapOpen,
      warehouseOpen: this.warehouseOpen,
      speciesBookOpen: this.speciesBookOpen,
      dashboardOpen: this.dashboardOpen,
      pauseOpen: this.pauseOpen,
      settingsOpen: this.settingsOpen,
      bagOpen: this.bagOpen,
      stationOpen: this.stationOpen,
      offlineReport: this.pendingOfflineReport,
      settings: this.settings,
    });
  }

  private setState(s: HostState): void {
    this.state = s;
    this.listeners.forEach((l) => l());
  }
}
