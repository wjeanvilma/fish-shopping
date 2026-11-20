/**
 * Owns the simulation in the browser (the web counterpart of Android's GameViewModel).
 * React and Three.js never mutate game state: input becomes Commands, and they read
 * immutable SimView snapshots. The HUD snapshot is published ~10 times per second and
 * immediately after transactions (blueprint "Rendering boundary").
 */
import contentJson from "../../../shared/content/content-pack.json";
import {
  type Command, type ContentPack, DecorSystem, FixedStepClock, GameState, INPUT_SCALE, NewerSaveError,
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
import {
  LOADTEST_SAVE_BANK,
  LOADTEST_TELEMETRY_BANK,
  measureLoadtestBanksInBrowser,
  type LoadtestBankProbe,
} from "../ship/loadtestBanks";
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
import { HostFishingIntents } from "./host/hostFishingIntents";
import { loopHudSnapshotFrom, type LoopHudSnapshot } from "./loopHudSnapshot";
import { HostIapIntents } from "./host/hostIapIntents";
import { HostShellIntents } from "./host/hostShellIntents";
import { HostTravelIntents } from "./host/hostTravelIntents";
import { processHostStep } from "./host/hostStepBus";
import { HostCloudBoot } from "./host/hostCloudBoot";
import { HostEntitlements } from "./host/hostEntitlements";
import {
  EMPTY_PRESSURE_FLAGS,
  edgePressureSfx,
  pressureFlagsFromView,
  type PressureFlags,
} from "../audio/pressureJuice";
import {
  EMPTY_NEST_FLAGS,
  edgeNestSfx,
  nestActiveFromFlags,
  nestFlagsFromView,
  type NestFlags,
} from "../audio/nestJuice";
import {
  resolveAuroraCrestBurst,
  resolveContractDeadlineBurst,
  resolveNestSettleBurst,
  resolveQuestNearBurst,
} from "../render/presenters";
import { stickFromTapTarget, type TapTarget } from "../presenters/tapToMove";

export type { HostState } from "./host/hostState";
import type { HostState } from "./host/hostState";


const START_HARBOR = "harbor.sunrise_pier";

export class GameHost {
  state: HostState = { status: "loading" };
  private readonly listeners = new Set<() => void>();
  private readonly messageListeners = new Set<(m: string) => void>();
  readonly commands: Command[] = [];
  private readonly clock = new FixedStepClock();
  content: ContentPack | null = null;
  sim: Simulation | null = null;
  store: SaveStore | null = null;
  settings: GameSettings = (() => {
    const s = loadSettings();
    applyLocaleFromSettings(s);
    applyThemeFromSettings(s);
    return s;
  })();
  private readonly audio = new AudioBus();
  readonly cloud = new CloudSyncCoordinator();
  readonly billing: EntitlementBilling = createEntitlementBilling();
  readonly pendingEntitlements = new PendingEntitlementLedger();
  allowSaving = true;
  rotateOnNextSave = true;
  private readonly panels = new ShellPanelController();
  running = false;
  booting = false;
  /** Finish 3.0 Phase 20 — deep link queued until Ready after boot. */
  pendingDeepLink: DeepLinkIntent | null = null;
  lastMove = { x: 0, z: 0 };
  private lastHudPublishMs = 0;
  saveChain: Promise<void> = Promise.resolve();
  lastCheckpointEpochMs: number | null = null;
  pendingOfflineReport: OfflineReport | null = null;
  /** Phase 11: parked dual-snapshot choice (texts kept until the player picks). */
  pendingConflict: CloudConflictOffer | null = null;
  cloudConflictView: CloudConflictView | null = null;
  /** Phase 11: parked corrupt-latest → previous recovery. */
  pendingRecoveryText: string | null = null;
  localRecoveryView: LocalRecoveryView | null = null;
  /** Presentation-only tap-to-move destination (cleared by stick/keys or on arrival). */
  private tapTarget: TapTarget | null = null;
  /** True while joystick/keyboard is holding a non-zero stick. */
  private stickActive = false;

  /** Latest snapshot for the renderer (updated every tick). */
  latestView: SimView | null = null;

  /** Presentation-only flying transfer cues (drained each frame by the scene). */
  pendingFlying: FlyingTransferCue[] = [];
  /** Phase 16/21 world bursts (catch / pay / celebrate / machine_done). */
  pendingBursts: WorldBurstCue[] = [];
  /** Phase 21 screen-shake kinds (drained each frame by the scene). */
  pendingShakes: ShakeKind[] = [];
  /** Finish 5.0 Phase 12 — previous pressure edge flags for warn stingers. */
  private pressureFlags: PressureFlags = { ...EMPTY_PRESSURE_FLAGS };
  private nestFlags: NestFlags = { ...EMPTY_NEST_FLAGS };
  /** Large shared loadtest banks probed at boot (header + size only). */
  private loadtestProbes: { save: LoadtestBankProbe; telemetry: LoadtestBankProbe; floorsMet: boolean } | null =
    null;

  private readonly shellIntents = new HostShellIntents(this);
  private readonly economyIntents = new HostEconomyIntents(this);
  private readonly fishingIntents = new HostFishingIntents(this);
  private readonly travelIntents = new HostTravelIntents(this, this.shellIntents);
  private readonly iapIntents = new HostIapIntents(this);
  /** Finish 6.0 Phase 5 — cloud boot / entitlement helpers. */
  readonly cloudBoot = new HostCloudBoot(this);
  readonly entitlements = new HostEntitlements(this);

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

  /** Finish 2.0/3.0/4.0/5.0/6.0: festival/storm/rival/night/endgame/ledger/pressure/nest beds; ducking unchanged. */
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
    const pressureActive =
      (v?.bagSpoilPressurePermille ?? 0) > 1000 ||
      (v?.serviceQueuePressurePermille ?? 0) >= 700 ||
      (v?.ticksUntilNearestContractDeadline != null &&
        v.ticksUntilNearestContractDeadline <= 200) ||
      (v?.nextQuestProgressPermille != null && v.nextQuestProgressPermille >= 800);
    const nestActive = nestActiveFromFlags(nestFlagsFromView(v, nightActive));
    this.audio.syncMusicBedFromPanels(
      this.panels.isOpen("station"),
      festivalActive,
      stormActive,
      rivalActive,
      nightActive,
      endgameActive,
      ledgerActive,
      pressureActive,
      nestActive,
    );
  }

  applyAnalyticsConsent(): void {
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

  /** Latest probe of the shared loadtest save/telemetry banks (null until boot probe). */
  loadtestBankProbes(): {
    save: LoadtestBankProbe;
    telemetry: LoadtestBankProbe;
    floorsMet: boolean;
  } | null {
    return this.loadtestProbes;
  }

  /** Re-run browser probe against /loadtest/*.json (served from shared/fixtures). */
  async probeLoadtestBanks(): Promise<{
    save: LoadtestBankProbe;
    telemetry: LoadtestBankProbe;
    floorsMet: boolean;
  } | null> {
    try {
      const measured = await measureLoadtestBanksInBrowser();
      this.loadtestProbes = measured;
      // Touch refs so tree-shaking keeps bank URLs wired into the app bundle surface.
      void LOADTEST_SAVE_BANK.webUrl;
      void LOADTEST_TELEMETRY_BANK.webUrl;
      // Finish 6.0 Phase 26 — nest analytics + loadtest probe telemetry.
      sharedAnalyticsBus.onLoadtestBankProbed("save", measured.save.floorsMet);
      sharedAnalyticsBus.onLoadtestBankProbed("telemetry", measured.telemetry.floorsMet);
      sharedAnalyticsBus.onLoadtestBankProbed("dual", measured.floorsMet);
      return measured;
    } catch {
      this.loadtestProbes = null;
      return null;
    }
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
      // Shared ~90MB loadtest banks — header/size probe keeps boot light.
      await this.probeLoadtestBanks();
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

  async resolveCloudConflict(source: SyncSource): Promise<void> {
    return this.cloudBoot.resolveCloudConflict(source);
  }

  async confirmLocalRecovery(): Promise<void> {
    return this.cloudBoot.confirmLocalRecovery();
  }

  dismissLocalRecovery(): void {
    this.cloudBoot.dismissLocalRecovery();
  }
  clearSaveChoiceUi(): void {
    this.cloudBoot.clearSaveChoiceUi();
  }
  private async refreshTitleHasSave(): Promise<void> {
    return this.cloudBoot.refreshTitleHasSave();
  }

  async newGame(): Promise<void> {
    return this.cloudBoot.newGame();
  }

  async returnToTitle(): Promise<void> {
    return this.cloudBoot.returnToTitle();
  }
  private bootSim(state: GameState, savedAtEpochMs: number | null): void {
    this.cloudBoot.bootSim(state, savedAtEpochMs);
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

  flushPendingDeepLink(): void {
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

  publishTitle(hasSave: boolean): void {
    this.setState({
      status: "title",
      hasSave,
      cloudConflict: this.cloudConflictView,
      localRecovery: this.localRecoveryView,
      settings: this.settings,
    });
  }

  private async restoreOrCreate(content: ContentPack): Promise<{ state: GameState; savedAtEpochMs: number | null } | null> {
    return this.cloudBoot.restoreOrCreate(content);
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

  applyPendingOffline(nowEpochMs: number): void {
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

  step(sim: Simulation): void {
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
    // Finish 5.0 Phase 12 — rising-edge pressure warn SFX + juice.
    const nextFlags = pressureFlagsFromView(this.latestView);
    const edgeCues = edgePressureSfx(this.pressureFlags, nextFlags);
    for (const cue of edgeCues) this.audio.play(cue);
    if (this.latestView) {
      if (edgeCues.includes("contract_deadline")) {
        this.pendingBursts.push(resolveContractDeadlineBurst(this.latestView));
        this.pendingShakes.push("contract_deadline");
      }
      if (edgeCues.includes("quest_near")) {
        this.pendingBursts.push(resolveQuestNearBurst(this.latestView));
      }
    }
    this.pressureFlags = nextFlags;
    // Finish 6.0 Phase 12 — rising-edge nest settle / aurora SFX + juice.
    const tide = this.latestView?.tidePhaseId ?? "";
    const nightActive = tide === "night" || tide === "dusk";
    const nextNest = nestFlagsFromView(this.latestView, nightActive);
    const nestEdges = edgeNestSfx(this.nestFlags, nextNest);
    for (const cue of nestEdges) this.audio.play(cue);
    if (this.latestView) {
      if (nestEdges.includes("nest_settle")) {
        this.pendingBursts.push(resolveNestSettleBurst(this.latestView));
        this.pendingShakes.push("nest_settle");
      }
      if (nestEdges.includes("aurora_crest")) {
        this.pendingBursts.push(resolveAuroraCrestBurst(this.latestView));
        this.pendingShakes.push("aurora_crest");
      }
    }
    this.nestFlags = nextNest;
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

  enqueueMove(screenX: number, screenY: number): void {
    const [wx, wz] = CameraRig.screenToWorld(screenX, screenY);
    const clamp = (v: number) => Math.max(-INPUT_SCALE, Math.min(INPUT_SCALE, Math.round(v * INPUT_SCALE)));
    const move = { x: clamp(wx), z: clamp(wz) };
    if (move.x !== this.lastMove.x || move.z !== this.lastMove.z) {
      this.lastMove = move;
      this.commands.push({ type: "move", ...move });
    }
  }

  private get panelOpen(): boolean {
    return this.worldHold || ShellModalPolicy.blocksWorldInput(
      this.panels.snapshot(),
      this.pendingOfflineReport !== null,
    );
  }

  /** Cozy art pass 5: client-only modes (photo mode, decorating) that pause the world like a panel. */
  private worldHold = false;

  setWorldHold(on: boolean): void {
    if (this.worldHold === on) return;
    this.worldHold = on;
    if (on) this.enqueueMove(0, 0);
    this.publish(true);
  }

  isWorldHeld(): boolean {
    return this.worldHold;
  }

  /** Queue a command and, while the world is held or a panel is open, commit it with one tick now. */
  commitNow(command: Command): void {
    this.commands.push(command);
    if (this.sim && this.panelOpen && this.pendingOfflineReport === null) {
      this.step(this.sim);
      this.publish(true);
    }
  }

  /** Cozy art pass 5 decor placement preview: null when [decorId] may stand at (x, z) mm. */
  decorPlacementProblem(decorId: string, xMm: number, zMm: number): string | null {
    if (!this.sim) return "Loading";
    return DecorSystem.placementProblem(this.sim.content, this.sim.state, decorId, DecorSystem.snap(xMm), DecorSystem.snap(zMm));
  }

  placeDecor(decorId: string, xMm: number, zMm: number, rotationQuarter: number): void {
    this.commitNow({ type: "place_decor", decorId, xMm, zMm, rotationQuarter });
  }

  storeDecor(decorId: string): void {
    this.commitNow({ type: "store_decor", decorId });
  }

  clearPanels(): void {
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
  claimWeeklyGoal(objectiveId: string): void { this.economyIntents.claimWeeklyGoal(objectiveId); }

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

  private async consumeBillingReturnQuery(): Promise<void> {
    return this.entitlements.consumeBillingReturnQuery();
  }
  private stripBillingQuery(): void {
    this.entitlements.stripBillingQuery();
  }

  /** Phase 24: purchase a power-neutral cosmetic SKU. */
  purchaseIapCosmetic(sku: string): void { this.iapIntents.purchaseIapCosmetic(sku); }

  /** Phase 24 / post-1.0 Phase 2+3: restore all entitlements (full unlock + cosmetics). */
  restorePurchases(): void { this.iapIntents.restorePurchases(); }

  async reconcileEntitlementsFromStore(): Promise<void> {
    return this.entitlements.reconcileEntitlementsFromStore();
  }
  applyStoreOwned(owned: RestoredEntitlement[], announceRestore: boolean): void {
    this.entitlements.applyStoreOwned(owned, announceRestore);
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

  buyBait(baitId: string): void { this.fishingIntents.buyBait(baitId); }

  selectBait(baitId: string | null): void { this.fishingIntents.selectBait(baitId); }

  selectTechnique(techniqueId: string | null): void {
    this.fishingIntents.selectTechnique(techniqueId);
  }

  reel(): void { this.fishingIntents.reel(); }

  /** Finish 5.0 Phase 5 — loop HUD snapshot from latest SimView. */
  loopHudSnapshot(): LoopHudSnapshot | null {
    if (!this.latestView) return null;
    return loopHudSnapshotFrom(this.latestView);
  }

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

  setState(s: HostState): void {
    this.state = s;
    this.listeners.forEach((l) => l());
  }
}
