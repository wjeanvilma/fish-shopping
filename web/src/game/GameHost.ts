/**
 * Owns the simulation in the browser (the web counterpart of Android's GameViewModel).
 * React and Three.js never mutate game state: input becomes Commands, and they read
 * immutable SimView snapshots. The HUD snapshot is published ~10 times per second and
 * immediately after transactions (blueprint "Rendering boundary").
 */
import contentJson from "../../../shared/content/content-pack.json";
import {
  type Command, type ContentPack, FixedStepClock, GameState, INPUT_SCALE, NewerSaveError,
  type OfflineReport, Simulation, type SimView, applyOffline, buildView,
  decodeSnapshotEnvelope, encodeBalanceExport, encodeSnapshot, encodeTelemetry, loadContent,
} from "../engine";
import { AudioBus } from "../audio/audioBus";
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
import {
  parseLocation,
  stripDeepLinkQuery,
  type DeepLinkIntent,
} from "../deeplink/deepLinks";
import { CloudSyncCoordinator } from "../cloud/cloudSyncCoordinator";
import { peekSnapshot, summaryOf, type CloudConflictOffer, type SyncSource } from "../engine/cloudSync";
import { CameraRig } from "./cameraRig";
import { resolveVisibleCosmetic, sanitizeEquippedCosmetic } from "../engine/cosmeticPresentation";
import { STORAGE_UNAVAILABLE_TOAST } from "./lifecyclePolicy";
import { openSaveStore, type SaveStore } from "./saveStore";
import {
  formatLastSavedLabel,
  applyLocaleFromSettings,
  applyThemeFromSettings,
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
  ShellHudPolicy,
  ShellModalPolicy,
  ShellPanelController,
  type ShellPanelId,
} from "../shell/shellPanels";
import { OfflineShell } from "../shell/offlineShell";
import {
  type FlyingTransferCue,
  type ShakeKind,
  type WorldBurstCue,
} from "../render/presenters";
import { HostEconomyIntents } from "./host/hostEconomyIntents";
import { HostIapIntents } from "./host/hostIapIntents";
import { HostShellIntents } from "./host/hostShellIntents";
import { HostTravelIntents } from "./host/hostTravelIntents";
import { processHostStep } from "./host/hostStepBus";
import { stickFromTapTarget, type TapTarget } from "../presenters/tapToMove";

export type { HostState } from "./host/hostState";
import type { HostState } from "./host/hostState";


const START_HARBOR = "harbor.sunrise_pier";

export class GameHost {
  private state: HostState = { status: "loading" };
  private readonly listeners = new Set<() => void>();
  private readonly messageListeners = new Set<(m: string) => void>();
  private readonly commands: Command[] = [];
  private readonly clock = new FixedStepClock();
  private content: ContentPack | null = null;
  private sim: Simulation | null = null;
  private store: SaveStore | null = null;
  private settings: GameSettings = (() => {
    const s = loadSettings();
    applyLocaleFromSettings(s);
    applyThemeFromSettings(s);
    return s;
  })();
  private readonly audio = new AudioBus();
  private readonly cloud = new CloudSyncCoordinator();
  readonly billing: EntitlementBilling = createEntitlementBilling();
  readonly pendingEntitlements = new PendingEntitlementLedger();
  private allowSaving = true;
  private rotateOnNextSave = true;
  private readonly panels = new ShellPanelController();
  private running = false;
  private booting = false;
  /** Finish 3.0 Phase 20 — deep link queued until Ready after boot. */
  private pendingDeepLink: DeepLinkIntent | null = null;
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

  private readonly shellIntents = new HostShellIntents(this);
  private readonly economyIntents = new HostEconomyIntents(this);
  private readonly travelIntents = new HostTravelIntents(this, this.shellIntents);
  private readonly iapIntents = new HostIapIntents(this);

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
    this.syncMusicBed();
  }

  /** Finish 2.0/3.0/4.0: festival/storm/rival/night/endgame/ledger beds; ducking unchanged. */
  private syncMusicBed(): void {
    const v = this.latestView;
    const festivalActive = !!v?.seasonalEvent;
    const weatherId = v?.weatherId ?? "";
    const stormActive = weatherId.includes("rain") || weatherId.includes("gale");
    const rivalActive =
      !!v?.rivalPressureActive || (v?.activeRivalIds?.length ?? 0) > 0;
    const tide = v?.tidePhaseId ?? "";
    const nightActive = tide === "night" || tide === "dusk";
    const endgameActive = !!v?.endgameUnlocked;
    const ledgerActive = (v?.bank?.loanOwed ?? 0) > 0;
    this.audio.syncMusicBedFromPanels(
      this.panels.isOpen("station"),
      festivalActive,
      stormActive,
      rivalActive,
      nightActive,
      endgameActive,
      ledgerActive,
    );
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
      this.syncDailyGoalReminders();
      await this.consumeBillingReturnQuery();
      // Finish 3.0 Phase 20 — capture panel/harbor query/hash before Title.
      const deep = parseLocation();
      if (deep.panel || deep.harborId) this.pendingDeepLink = deep;
      const candidates = await this.store.readCandidates();
      if (!this.store.persistent) this.say(STORAGE_UNAVAILABLE_TOAST);
      this.publishTitle(candidates.length > 0);
      if (this.pendingDeepLink && candidates.length > 0) {
        await this.continueGame();
      }
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
    this.syncWallClock(Date.now());
    if (this.pendingOfflineReport !== null || savedAtEpochMs !== null) this.save();
    this.latestView = buildView(this.sim);
    if (this.store && !this.store.persistent) this.say(STORAGE_UNAVAILABLE_TOAST);
    this.publish(true);
    this.resume();
    this.flushPendingDeepLink();
  }

  /**
   * Finish 3.0 Phase 20 — apply web deep link (query/path/hash).
   * Queues until Ready; soft auto-continues from Title when a save exists.
   */
  applyDeepLink(intent: DeepLinkIntent): void {
    const canAuto =
      this.state.status === "title" &&
      this.state.hasSave &&
      !this.state.cloudConflict &&
      !this.state.localRecovery &&
      !this.booting;
    this.travelIntents.applyDeepLink(intent, canAuto, (queued) => {
      this.pendingDeepLink = queued;
    });
  }

  private flushPendingDeepLink(): void {
    const pending = this.pendingDeepLink;
    this.pendingDeepLink = null;
    if (pending && (pending.panel || pending.harborId)) {
      this.travelIntents.consumeDeepLink(pending);
      if (typeof location !== "undefined") stripDeepLinkQuery(location.search);
    }
  }

  private consumeDeepLink(intent: DeepLinkIntent): void {
    this.travelIntents.consumeDeepLink(intent);
    if (typeof location !== "undefined") stripDeepLinkQuery(location.search);
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
    let report: OfflineReport | null = null;
    if (elapsed > 0) {
      report = applyOffline(sim, elapsed);
    }
    this.commands.push({ type: "sync_wall_clock", epochMs: nowEpochMs });
    this.step(sim);
    if (report) {
      const pending = OfflineShell.decidePendingReport(sim.content, sim.state, report);
      this.pendingOfflineReport = pending;
      if (pending) sharedAnalyticsBus.onOfflineClaimed(pending);
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
    processHostStep(sim, this.commands, {
      say: (m) => this.say(m),
      save: () => this.save(),
      publish: (force) => this.publish(force),
      syncMusicBed: () => this.syncMusicBed(),
      audio: this.audio,
      panels: this.panels,
      pendingFlying: this.pendingFlying,
      pendingBursts: this.pendingBursts,
      pendingShakes: this.pendingShakes,
      setLatestView: (v) => { this.latestView = v; },
    });
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
    return ShellModalPolicy.blocksWorldInput(
      this.panels.snapshot(),
      this.pendingOfflineReport !== null,
    );
  }

  private clearPanels(): void {
    this.panels.closeAll();
  }


  // ---- host intent surface (Finish 4.0 Phase 6) --------------------------------------

  enqueuePanelCommand(command: Command): void {
    this.commands.push(command);
    if (
      this.sim &&
      ShellModalPolicy.shouldCommitPanelCommand(
        this.panels.snapshot(),
        this.pendingOfflineReport !== null,
      )
    ) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  enqueueCommand(command: Command): void {
    this.commands.push(command);
  }

  panelBlocksWorld(): boolean {
    return this.panelOpen;
  }

  hasPendingOffline(): boolean {
    return this.pendingOfflineReport !== null;
  }

  isPanelOpen(id: ShellPanelId): boolean {
    return this.panels.isOpen(id);
  }

  syncWallClockNow(): void {
    this.syncWallClock(Date.now());
  }

  isReadyWithSim(): boolean {
    return this.state.status === "ready" && !!this.sim;
  }

  continueGameFromTitle(): void {
    void this.continueGame();
  }

  cloudAccountId(): string | null {
    return this.settings.cloudAccountId;
  }

  withSim(block: (sim: Simulation) => void): void {
    if (!this.sim) return;
    block(this.sim);
  }

  buildLatestView(): void {
    if (!this.sim) return;
    this.latestView = buildView(this.sim);
  }

  /** Opening one panel closes the others. Closing only clears that panel. */
  setPanelOpen(which: ShellPanelId, open: boolean): void {
    if (open) {
      this.panels.open(which);
      this.tapTarget = null;
      this.stickActive = false;
      this.enqueueMove(0, 0);
      // Phase 19: authored UI click when a management panel opens.
      this.audio.play("ui");
    } else {
      this.panels.close(which);
    }
    this.syncMusicBed();
    this.publish(true);
  }

  setUpgradesOpen(open: boolean): void { this.shellIntents.setUpgradesOpen(open); }
  setStaffOpen(open: boolean): void { this.shellIntents.setStaffOpen(open); }
  setQuestsOpen(open: boolean): void { this.shellIntents.setQuestsOpen(open); }
  setContractsOpen(open: boolean): void { this.shellIntents.setContractsOpen(open); }
  setMapOpen(open: boolean): void { this.shellIntents.setMapOpen(open); }
  setWarehouseOpen(open: boolean): void { this.shellIntents.setWarehouseOpen(open); }
  setSpeciesBookOpen(open: boolean): void { this.shellIntents.setSpeciesBookOpen(open); }
  setDashboardOpen(open: boolean): void { this.shellIntents.setDashboardOpen(open); }
  setPauseOpen(open: boolean): void { this.shellIntents.setPauseOpen(open); }
  setSettingsOpen(open: boolean): void { this.shellIntents.setSettingsOpen(open); }
  setBagOpen(open: boolean): void { this.shellIntents.setBagOpen(open); }
  setStationOpen(open: boolean): void { this.shellIntents.setStationOpen(open); }

  syncWallClock(epochMs: number): void {
    if (!this.sim) return;
    this.commands.push({ type: "sync_wall_clock", epochMs });
    this.step(this.sim);
    this.publish(true);
  }

  claimDailyGoal(objectiveId: string): void { this.economyIntents.claimDailyGoal(objectiveId); }

  /** Presentation settings (mute, volumes, haptics, quality, a11y, cloud). Not part of the parity save. */
  updateSettings(partial: Partial<GameSettings>): void {
    const enablingCloud = partial.cloudSyncEnabled === true && !this.settings.cloudSyncEnabled;
    const enablingReminders =
      partial.dailyGoalRemindersEnabled === true && !this.settings.dailyGoalRemindersEnabled;
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
    if (enablingReminders) {
      void this.enableDailyGoalReminders();
    } else {
      this.syncDailyGoalReminders();
    }
    if (this.state.status === "title") {
      this.publishTitle(this.state.hasSave);
    } else {
      this.publish(true);
    }
  }

  /** Finish 3.0 Phase 18 — count unclaimed board dailies from the latest view. */
  unclaimedDailyGoalCount(): number {
    const view = this.latestView?.dailyGoals;
    if (!view) return 0;
    return view.filter((g) => !g.claimed).length;
  }

  /** Finish 3.0 Phase 18 — request permission when enabling, then schedule. */
  async enableDailyGoalReminders(): Promise<void> {
    const { requestNotificationPermission } = await import("../push/localPushReminders");
    const perm = await requestNotificationPermission();
    if (perm !== "granted") {
      this.settings = { ...this.settings, dailyGoalRemindersEnabled: false };
      saveSettings(this.settings);
      this.say("Notification permission is required for daily-goal reminders");
      this.publish(true);
      return;
    }
    this.syncDailyGoalReminders();
  }

  /** Finish 3.0 Phase 18 — sync web Notification timer with settings + board. */
  syncDailyGoalReminders(): void {
    void Promise.all([
      import("../push/localPushReminders"),
      import("../i18n/strings"),
    ]).then(([push, i18n]) => {
      if (!this.settings.dailyGoalRemindersEnabled) {
        push.cancelScheduledDailyGoalReminder();
        return;
      }
      push.syncLocalDailyGoalReminders({
        enabled: true,
        unclaimedCount: this.unclaimedDailyGoalCount(),
        title: i18n.t("push.dailyGoalTitle"),
        bodyTemplate: i18n.t("push.dailyGoalBody"),
      });
    });
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
    this.economyIntents.setMachinePaused(stationId, paused);
  }

  purchase(upgradeId: string): void { this.economyIntents.purchase(upgradeId); }

  /** Phase 6: confirm spend while standing on an expansion plot marker. */
  buildPlot(plotId: string): void { this.economyIntents.buildPlot(plotId); }

  purchaseDecor(decorId: string): void { this.economyIntents.purchaseDecor(decorId); }

  /** Phase 23 / post-1.0 Phase 2+3: one-time full-harbor unlock via web billing. */
  purchaseFullHarborUnlock(): void { this.iapIntents.purchaseFullHarborUnlock(); }

  /** Phase 23: restore purchases and grant if the store says owned. */
  restoreFullHarborUnlock(): void { this.iapIntents.restoreFullHarborUnlock(); }

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
  purchaseIapCosmetic(sku: string): void { this.iapIntents.purchaseIapCosmetic(sku); }

  /** Phase 24 / post-1.0 Phase 2+3: restore all entitlements (full unlock + cosmetics). */
  restorePurchases(): void { this.iapIntents.restorePurchases(); }

  /**
   * Phase 3: store is SoT for paid SKUs — merge restore + pending ledger into the live save,
   * apply only missing flags/receipts, checkpoint, then ack the ledger.
   */
  private async reconcileEntitlementsFromStore(): Promise<void> {
    const owned = await this.billing.restoreAll(this.settings.cloudAccountId).catch(() => [] as RestoredEntitlement[]);
    this.applyStoreOwned(owned, false);
  }

  applyStoreOwned(owned: RestoredEntitlement[], announceRestore: boolean): void {
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

  repairMachine(stationId: string): void { this.economyIntents.repairMachine(stationId); }

  takeLoan(productId?: string | null): void { this.economyIntents.takeLoan(productId); }

  repayLoan(): void { this.economyIntents.repayLoan(); }

  setCoinGoal(amount: number): void { this.economyIntents.setCoinGoal(amount); }

  hire(roleId: string): void { this.economyIntents.hire(roleId); }

  setWorkerShift(workerId: string, onShift: boolean): void {
    this.economyIntents.setWorkerShift(workerId, onShift);
  }

  trainWorkerBranch(workerId: string, branchId: string): void {
    this.economyIntents.trainWorkerBranch(workerId, branchId);
  }

  selectWorkerBranch(workerId: string, branchId: string | null): void {
    this.economyIntents.selectWorkerBranch(workerId, branchId);
  }

  setWorkerSchedule(workerId: string, scheduleId: string | null): void {
    this.economyIntents.setWorkerSchedule(workerId, scheduleId);
  }

  assignWorkerGear(workerId: string, upgradeId: string): void {
    this.economyIntents.assignWorkerGear(workerId, upgradeId);
  }

  unequipWorkerGear(workerId: string, slotId: string): void {
    this.economyIntents.unequipWorkerGear(workerId, slotId);
  }

  acceptContract(offerId: string): void { this.economyIntents.acceptContract(offerId); }

  deliverContract(contractId: string): void { this.economyIntents.deliverContract(contractId); }

  travelToHarbor(harborId: string): void { this.travelIntents.travelToHarbor(harborId); }

  buyBait(baitId: string): void { this.economyIntents.buyBait(baitId); }

  selectBait(baitId: string | null): void { this.economyIntents.selectBait(baitId); }

  selectTechnique(techniqueId: string | null): void {
    this.economyIntents.selectTechnique(techniqueId);
  }

  reel(): void { this.economyIntents.reel(); }

  /** Cycle Auto → each recipe → Auto for a station (no tick advance). */
  cycleStationRecipe(stationId: string): void {
    this.economyIntents.cycleStationRecipe(stationId);
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

  say(m: string): void {
    this.messageListeners.forEach((l) => l(m));
  }

  publish(force: boolean): void {
    if (!this.latestView) return;
    const now = performance.now();
    if (!force && now - this.lastHudPublishMs < ShellHudPolicy.PUBLISH_INTERVAL_MS) return;
    this.lastHudPublishMs = now;
      const flags = this.panels.snapshot();
    this.setState({
      status: "ready",
      view: this.latestView,
      upgradesOpen: flags.upgradesOpen,
      staffOpen: flags.staffOpen,
      questsOpen: flags.questsOpen,
      contractsOpen: flags.contractsOpen,
      mapOpen: flags.mapOpen,
      warehouseOpen: flags.warehouseOpen,
      speciesBookOpen: flags.speciesBookOpen,
      dashboardOpen: flags.dashboardOpen,
      pauseOpen: flags.pauseOpen,
      settingsOpen: flags.settingsOpen,
      bagOpen: flags.bagOpen,
      stationOpen: flags.stationOpen,
      offlineReport: this.pendingOfflineReport,
      settings: this.settings,
    });
  }

  private setState(s: HostState): void {
    this.state = s;
    this.listeners.forEach((l) => l());
  }
}
