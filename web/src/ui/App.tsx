import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import sunriseSceneUrl from "../../../shared/assets/models/sunrise_pier_blockout.glb?url";
import moonSceneUrl from "../../../shared/assets/models/moon_cove_blockout.glb?url";
import jettySceneUrl from "../../../shared/assets/models/obsidian_jetty_blockout.glb?url";
import northlightSceneUrl from "../../../shared/assets/models/northlight_harbor_blockout.glb?url";
import grandMarinaSceneUrl from "../../../shared/assets/models/grand_marina_blockout.glb?url";
import coralLagoonSceneUrl from "../../../shared/assets/models/coral_lagoon_blockout.glb?url";
import stormQuaySceneUrl from "../../../shared/assets/models/storm_quay_blockout.glb?url";
import emberWharfSceneUrl from "../../../shared/assets/models/ember_wharf_blockout.glb?url";
import mistCoveSceneUrl from "../../../shared/assets/models/mist_cove_blockout.glb?url";
import prismReachSceneUrl from "../../../shared/assets/models/prism_reach_blockout.glb?url";
import auroraInletSceneUrl from "../../../shared/assets/models/aurora_inlet_blockout.glb?url";
import tideglassBaySceneUrl from "../../../shared/assets/models/tideglass_bay_blockout.glb?url";
import saffronQuaySceneUrl from "../../../shared/assets/models/saffron_quay_blockout.glb?url";
import cobaltSoundSceneUrl from "../../../shared/assets/models/cobalt_sound_blockout.glb?url";
import type { SimView } from "../engine";
import { CameraRig } from "../game/cameraRig";
import { t } from "../i18n/strings";
import { GameHost, type HostState } from "../game/GameHost";
import {
  accessibilityPreset,
  statusShapeFor,
  statusShapeGlyph,
} from "../presenters/accessibility";
import { controlsHelpLine, desktopKeysHint, tapToMoveHint } from "../presenters/controlQa";
import {
  audioUnlockEvents,
  shouldCheckpointOnPageHide,
  shouldPauseForVisibility,
  shouldSuspendAudioWhenHidden,
} from "../game/lifecyclePolicy";
import { frictionNudgeText } from "../engine/tutorialFriction";
import {
  cosmeticTitle,
  resolveVisibleCosmetic,
  sanitizeEquippedCosmetic,
} from "../engine/cosmeticPresentation";
import { HarborScene, hasWebGL2 } from "../render/HarborScene";
import { sceneBridge } from "../render/sceneBridge";
import { Joystick } from "./Joystick";
import {
  harborMetaMaxFraction,
  isPortraitViewport,
  portraitCssVars,
  topActionsMaxFraction,
} from "./portraitLayout";
import { formatCoins, formatRushSeconds } from "./hudFormat";
import { BrandMark, CenterCard } from "./HudPrimitives";
import { CarryIndicator, MessageTicker, StationCard, TimingMeter } from "./HudChrome";
import { CloudConflictPanel, LocalRecoveryPanel, TitleScreen } from "./TitlePanels";
import { PausePanel, SettingsPanel } from "./PauseSettingsPanels";
import { BagDetailPanel, BaitKioskPanel, StationDetailPanel } from "./StationBagPanels";
import { BusinessDashboardPanel } from "./BusinessDashboardPanel";
import { SpeciesBookPanel } from "./SpeciesBookPanel";
import { HarborMapPanel, WarehousePanel } from "./MapWarehousePanels";
import { UpgradePanel } from "./UpgradePanel";
import { OfflineSummaryPanel } from "./OfflineSummaryPanel";
import { QuestLogPanel } from "./QuestLogPanel";
import { ContractsPanel } from "./ContractsPanel";
import { StaffPanel } from "./StaffPanel";
import { BannerStack, CoinsPill, DecorModeOverlay, HarborChip, HudToolbar, MenuDrawer, PhotoModeOverlay, navItems } from "./HudShell";
import { WEB_E2E_IDS } from "../e2e/webE2eIds";

export { formatCoins } from "./hudFormat";

const BLOCKOUT_URLS: Record<string, string> = {
  "sunrise_pier_blockout.glb": sunriseSceneUrl,
  "moon_cove_blockout.glb": moonSceneUrl,
  "obsidian_jetty_blockout.glb": jettySceneUrl,
  "northlight_harbor_blockout.glb": northlightSceneUrl,
  "grand_marina_blockout.glb": grandMarinaSceneUrl,
  "coral_lagoon_blockout.glb": coralLagoonSceneUrl,
  "storm_quay_blockout.glb": stormQuaySceneUrl,
  "ember_wharf_blockout.glb": emberWharfSceneUrl,
  "mist_cove_blockout.glb": mistCoveSceneUrl,
  "prism_reach_blockout.glb": prismReachSceneUrl,
  "aurora_inlet_blockout.glb": auroraInletSceneUrl,
  "tideglass_bay_blockout.glb": tideglassBaySceneUrl,
  "saffron_quay_blockout.glb": saffronQuaySceneUrl,
  "cobalt_sound_blockout.glb": cobaltSoundSceneUrl,
};

/** Track viewport aspect so portrait chrome follows resized windows, not only OS orientation. */
function usePortraitLayout(): boolean {
  const [portrait, setPortrait] = useState(() =>
    typeof window === "undefined" ? false : isPortraitViewport(window.innerWidth, window.innerHeight),
  );
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      const w = vv?.width ?? window.innerWidth;
      const h = vv?.height ?? window.innerHeight;
      setPortrait(isPortraitViewport(w, h));
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);
  return portrait;
}

/** The harbor is the home screen; panels open over it (blueprint "Navigation rules"). */
export function App() {
  const [host] = useState(() => new GameHost());
  // QA hook (`?fsdebug`): screenshot scripts can reach the host, like sceneBridge.
  if (typeof location !== "undefined" && location.search.includes("fsdebug")) (window as unknown as { __fsHost?: GameHost }).__fsHost = host;
  const state = useSyncExternalStore(host.subscribe, host.getState);
  const [webgl2] = useState(hasWebGL2);
  const portrait = usePortraitLayout();

  useEffect(() => {
    const unlock = () => host.unlockAudio();
    const events = audioUnlockEvents();
    for (const ev of events) window.addEventListener(ev, unlock, { once: true });
    return () => {
      for (const ev of events) window.removeEventListener(ev, unlock);
    };
  }, [host]);

  if (!webgl2) {
    return (
      <CenterCard title="WebGL 2 is not available">
        {t("lifecycle.webgl2Gate")}
      </CenterCard>
    );
  }
  // Landscape stays primary; portrait reflows the same chrome (no rotate-to-play gate).
  return (
    <div
      className={`game ${portrait ? "is-portrait" : "is-landscape"}`}
      data-portrait={portrait ? "true" : "false"}
      data-harbor-meta-frac={harborMetaMaxFraction(portrait)}
      data-top-actions-frac={topActionsMaxFraction(portrait)}
      style={portraitCssVars(portrait) as CSSProperties}
    >
      <World host={host} />
      {state.status === "title" ? (
        <TitleScreen host={host} state={state} />
      ) : (
        <Hud host={host} state={state} portrait={portrait} />
      )}
      <MessageTicker host={host} enabled={state.status === "ready" ? state.settings.captionsEnabled : true} />
    </div>
  );
}

function World({ host }: { host: GameHost }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = new HarborScene(canvas);
    scene.onContextStateChange = (lost) => setContextLost(lost);
    sceneBridge.scene = scene;
    sceneBridge.canvas = canvas;
    let raf = 0;
    let disposed = false;
    let loadGen = 0;

    const resize = () => scene.resize(canvas.clientWidth, canvas.clientHeight);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const ensureScene = async (asset: string) => {
      const url = BLOCKOUT_URLS[asset] ?? sunriseSceneUrl;
      const gen = ++loadGen;
      await scene.load(url);
      return gen === loadGen;
    };

    const loop = (now: number) => {
      host.frame(now);
      const view = host.latestView;
      if (view) {
        const url = BLOCKOUT_URLS[view.blockoutAsset] ?? sunriseSceneUrl;
        if (scene.loadedUrl !== url) {
          void ensureScene(view.blockoutAsset);
        }
      }
      if (!host.settingsReducedMotion()) {
        scene.enqueueTransfers(host.drainFlyingTransfers());
        scene.enqueueBursts(host.drainWorldBursts());
        scene.enqueueShakes(host.drainShakes());
      } else {
        host.drainFlyingTransfers();
        host.drainWorldBursts();
        host.drainShakes();
      }
      const bannerId = host.visibleCosmeticBannerId(view?.unlockedCosmetics ?? []);
      scene.render(now, view, host.renderQuality(), host.settingsReducedMotion(), bannerId);
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      const hidden = document.hidden;
      if (shouldSuspendAudioWhenHidden(hidden)) host.setAudioLifecycleSuspended(true);
      else host.setAudioLifecycleSuspended(false);
      if (shouldPauseForVisibility(hidden)) host.pause();
      else if (host.getState().status === "ready") host.resume();
    };
    const onPageHide = () => {
      if (shouldCheckpointOnPageHide()) host.pause();
    };

    let tapDown: { x: number; y: number; id: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      tapDown = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    const onPointerUp = (e: PointerEvent) => {
      // Tap-to-move: short presses only (ignore drag). HUD chrome sits above and eats its own taps.
      const down = tapDown;
      tapDown = null;
      if (!down || down.id !== e.pointerId || e.button !== 0) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) return;
      const st = host.getState();
      if (st.status !== "ready" || !st.settings.tapToMove || host.isWorldHeld()) return;
      if (st.pauseOpen || st.settingsOpen || st.bagOpen || st.stationOpen || st.upgradesOpen
        || st.staffOpen || st.questsOpen || st.contractsOpen || st.mapOpen || st.warehouseOpen
        || st.speciesBookOpen || st.dashboardOpen || st.offlineReport) {
        return;
      }
      const view = host.latestView;
      if (!view) return;
      const r = canvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const ndcX = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ndcY = -(((e.clientY - r.top) / r.height) * 2 - 1);
      const hit = CameraRig.groundFromNdc(ndcX, ndcY, r.width / r.height, view.player.xMm, view.player.zMm);
      if (hit) host.setTapMove(hit.xMm, hit.zMm);
    };

    void (async () => {
      await host.start();
      if (disposed) return;
      const asset = host.latestView?.blockoutAsset ?? "sunrise_pier_blockout.glb";
      await ensureScene(asset);
      if (disposed) return;
      raf = requestAnimationFrame(loop);
    })();
    const onOnline = () => {
      void host.flushCloudOfflineQueue();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onOnline);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      host.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onOnline);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      scene.onContextStateChange = null;
      if (sceneBridge.scene === scene) {
        sceneBridge.scene = null;
        sceneBridge.canvas = null;
      }
      scene.dispose();
    };
  }, [host]);

  return (
    <>
      <canvas ref={canvasRef} className="world" aria-label="Harbor" />
      {contextLost ? (
        <div className="pill context-loss-banner" role="status" aria-live="assertive">
          {t("lifecycle.contextLoss")}
        </div>
      ) : null}
    </>
  );
}

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

function isTextInput(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

function Hud({ host, state, portrait }: { host: GameHost; state: HostState; portrait: boolean }) {
  const upgradesOpen = state.status === "ready" && state.upgradesOpen;
  const staffOpen = state.status === "ready" && state.staffOpen;
  const questsOpen = state.status === "ready" && state.questsOpen;
  const contractsOpen = state.status === "ready" && state.contractsOpen;
  const mapOpen = state.status === "ready" && state.mapOpen;
  const warehouseOpen = state.status === "ready" && state.warehouseOpen;
  const speciesBookOpen = state.status === "ready" && state.speciesBookOpen;
  const dashboardOpen = state.status === "ready" && state.dashboardOpen;
  const pauseOpen = state.status === "ready" && state.pauseOpen;
  const settingsOpen = state.status === "ready" && state.settingsOpen;
  const bagOpen = state.status === "ready" && state.bagOpen;
  const stationOpen = state.status === "ready" && state.stationOpen;
  const offlineReport = state.status === "ready" ? state.offlineReport : null;
  const [touch, setTouch] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);
  /** Phase 22: dwell ms on the current tutorial step for friction nudges. */
  const [tutorialDwellMs, setTutorialDwellMs] = useState(0);
  /** Cozy art pass 5: play / photo / decor modes + compact-nav menu drawer. */
  const [mode, setMode] = useState<"play" | "photo" | "decor">("play");
  const [menuOpen, setMenuOpen] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 1100);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1100);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard: WASD / arrows move, U/H/G/J/M/I panels, Escape closes the panel.
  useEffect(() => {
    const held = new Set<string>();
    const apply = () => {
      let x = 0, y = 0;
      held.forEach((k) => { const d = KEY_DIRS[k]; if (d) { x += d[0]; y += d[1]; } });
      host.setMove(Math.sign(x), Math.sign(y));
    };
    const down = (e: KeyboardEvent) => {
      if (isTextInput(e.target) || mode !== "play" || menuOpen) return;
      if (e.code === "KeyO" && !e.repeat) { host.setMove(0, 0); setMode("photo"); return; }
      if (e.code === "KeyK" && !e.repeat) { host.setMove(0, 0); setMode("decor"); return; }
      if (e.code === "Escape") {
        if (offlineReport) host.dismissOfflineReport();
        else if (pauseOpen) host.setPauseOpen(false);
        else if (settingsOpen) host.setSettingsOpen(false);
        else if (bagOpen) host.setBagOpen(false);
        else if (stationOpen) host.setStationOpen(false);
        else if (upgradesOpen) host.setUpgradesOpen(false);
        else if (staffOpen) host.setStaffOpen(false);
        else if (questsOpen) host.setQuestsOpen(false);
        else if (contractsOpen) host.setContractsOpen(false);
        else if (mapOpen) host.setMapOpen(false);
        else if (warehouseOpen) host.setWarehouseOpen(false);
        else if (speciesBookOpen) host.setSpeciesBookOpen(false);
        else if (dashboardOpen) host.setDashboardOpen(false);
        else host.setPauseOpen(true);
        return;
      }
      if (e.code === "KeyP" && !e.repeat) { host.setPauseOpen(!pauseOpen); return; }
      if (e.code === "KeyU" && !e.repeat) { host.setUpgradesOpen(!upgradesOpen); return; }
      if (e.code === "KeyH" && !e.repeat) { host.setStaffOpen(!staffOpen); return; }
      if (e.code === "KeyG" && !e.repeat) { host.setQuestsOpen(!questsOpen); return; }
      if (e.code === "KeyJ" && !e.repeat) { host.setContractsOpen(!contractsOpen); return; }
      if (e.code === "KeyM" && !e.repeat) { host.setMapOpen(!mapOpen); return; }
      if (e.code === "KeyI" && !e.repeat) { host.setWarehouseOpen(!warehouseOpen); return; }
      if (e.code === "KeyB" && !e.repeat) { host.setSpeciesBookOpen(!speciesBookOpen); return; }
      if (e.code === "KeyY" && !e.repeat) { host.setDashboardOpen(!dashboardOpen); return; }
      if ((e.code === "Space" || e.code === "KeyF") && !e.repeat) { e.preventDefault(); host.reel(); return; }
      if (e.code === "KeyR" && !e.repeat) {
        const ready = host.getState();
        if (ready.status === "ready" && ready.view.context?.stationId) {
          e.preventDefault();
          host.cycleStationRecipe(ready.view.context.stationId);
        }
        return;
      }
      if (KEY_DIRS[e.code]) { e.preventDefault(); held.add(e.code); apply(); }
    };
    const up = (e: KeyboardEvent) => {
      if (held.delete(e.code)) apply();
    };
    const blur = () => { held.clear(); apply(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [host, upgradesOpen, staffOpen, questsOpen, contractsOpen, mapOpen, warehouseOpen, speciesBookOpen, dashboardOpen, pauseOpen, settingsOpen, bagOpen, stationOpen, offlineReport, mode, menuOpen]);

  useEffect(() => {
    const onTouch = () => setTouch(true);
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  const tutorialStepId =
    state.status === "ready" ? state.view.objective?.tutorialStepId ?? null : null;
  useEffect(() => {
    setTutorialDwellMs(0);
    if (!tutorialStepId) return;
    const started = performance.now();
    const id = window.setInterval(() => {
      setTutorialDwellMs(performance.now() - started);
    }, 500);
    return () => window.clearInterval(id);
  }, [tutorialStepId]);

  if (state.status === "loading") return <CenterCard title="Loading harbor...">Preparing Sunrise Pier.</CenterCard>;
  if (state.status === "failed") return <CenterCard title="Something went wrong" danger>{state.message}</CenterCard>;
  if (state.status !== "ready") return null;

  const v = state.view;
  const frictionNudge = frictionNudgeText(v.objective?.tutorialStepId, tutorialDwellMs);
  const hudScale = state.settings.hudTextScale;
  const exitMode = () => setMode("play");
  if (mode === "photo") return <PhotoModeOverlay v={v} host={host} onExit={exitMode} />;
  if (mode === "decor") {
    return <DecorModeOverlay v={v} host={host} onExit={exitMode} onOpenShop={() => { setMode("play"); host.setQuestsOpen(true); }} />;
  }
  const nav = navItems(host, () => setMode("photo"), () => setMode("decor"));
  const compactNav = portrait || narrow || touch;
  return (
    <div
      className={`hud${portrait ? " hud-portrait" : " hud-landscape"}`}
      style={{ ["--hud-font-scale" as string]: String(hudScale) }}
    >
      <HarborChip v={v} portrait={portrait} />
      <CoinsPill coins={formatCoins(v.coins)} label={t("hud.coins")} />
      <BannerStack>
      {v.rush && (
        <div className="pill rush-banner" aria-live="polite">
          {v.rush.name} · {formatRushSeconds(v.rush.ticksRemaining)}s
        </div>
      )}
      {v.seasonalEvent && (
        <div className="pill seasonal-banner" aria-live="polite" data-a11y-live="festival_hud">
          {v.seasonalEvent.name} · {formatRushSeconds(v.seasonalEvent.ticksRemaining)}s
        </div>
      )}
      {(v.rivalPressureActive || (v.activeRivalIds?.length ?? 0) > 0) && (
        <div
          className="pill rival-banner"
          role="status"
          aria-live="polite"
          data-a11y-live="rival_pressure"
          aria-label={t("a11y.rivalPressureActive")}
        >
          {t("hud.rivalPressure")}
        </div>
      )}
      {(() => {
        const bannerId = resolveVisibleCosmetic(
          host.equippedCosmeticId(),
          host.previewCosmeticIdValue(),
          v.unlockedCosmetics,
        );
        if (!bannerId) return null;
        const previewing = !!host.previewCosmeticIdValue();
        return (
          <div className="pill cosmetic-banner" aria-live="polite">
            {previewing ? "Preview" : "Banner"} · {cosmeticTitle(bannerId)}
          </div>
        );
      })()}
      {v.supervisorOnDuty && (
        <div className="pill supervisor-banner" aria-live="polite">Supervisor on duty</div>
      )}
      {state.settings.showBalanceStrip && (
        <div className="pill balance-strip" aria-live="polite" title="Balance telemetry strip">
          Abandon {Math.trunc(v.telemetryRates.abandonPermille / 10)}%
          {" · "}Wage {Math.trunc(v.telemetryRates.wageRatioPermille / 10)}%
          {v.telemetryRates.topSpecies[0]
            ? ` · Top ${v.telemetryRates.topSpecies[0].name} ${Math.trunc(v.telemetryRates.topSpecies[0].sharePermille / 10)}%`
            : ""}
        </div>
      )}
      </BannerStack>
      <HudToolbar items={nav} compact={compactNav} onMenu={() => setMenuOpen(true)} ariaLabel={t("hud.toolbar")} />
      {menuOpen && <MenuDrawer items={nav} onClose={() => setMenuOpen(false)} />}
      {v.objective && (
        <div className={`panel objective${portrait ? " objective-portrait" : ""}`}>
          <div className="eyebrow">
            {v.objective.eyebrow}
            {v.objective.detail ? <span className="objective-detail"> {v.objective.detail}</span> : null}
          </div>
          <div>{v.objective.text}</div>
          {frictionNudge ? (
            <div
              className="small muted"
              style={{ marginTop: 6 }}
              role="status"
              aria-live="polite"
              aria-label={t("a11y.frictionNudgeLive")}
              data-testid={WEB_E2E_IDS.FRICTION_NUDGE}
            >
              {frictionNudge}
            </div>
          ) : null}
        </div>
      )}
      {touch ? (
        <>
          <Joystick
            side={state.settings.joystickSide}
            scale={state.settings.joystickScale}
            onMove={(x, y) => host.setMove(x, y)}
          />
          {state.settings.tapToMove && (
            <div className={`panel keys-hint keys-hint-${state.settings.joystickSide === "left" ? "right" : "left"}${portrait ? " keys-hint-portrait" : ""}`}>
              {tapToMoveHint()}
            </div>
          )}
        </>
      ) : (
        <div className={`panel keys-hint keys-hint-${state.settings.joystickSide}${portrait ? " keys-hint-portrait" : ""}`}>
          {desktopKeysHint({ tapToMove: state.settings.tapToMove })}
        </div>
      )}
      {v.context && (
        <StationCard
          card={v.context}
          stations={v.stations}
          shapeCues={state.settings.shapeCues}
          onOpen={() => host.setStationOpen(true)}
          onCycleRecipe={v.context.stationId ? () => host.cycleStationRecipe(v.context!.stationId!) : undefined}
        />
      )}
      {v.fishingCanReel && (
        <div className="reel-stack">
          {v.castPhase && (
            <div className="small muted" aria-live="polite">
              {v.castPhase === "waiting" ? "Waiting…"
                : v.castPhase === "strike" ? "Strike!"
                  : v.castPhase === "fight" ? "Fighting"
                    : v.castPhase}
            </div>
          )}
          {state.settings.timingAssist && v.fishingProgress != null && (
            <TimingMeter
              progress01={v.fishingProgress}
              goodStart={v.timingGoodStart01}
              goodEnd={v.timingGoodEnd01}
              perfectStart={v.timingPerfectStart01}
              perfectEnd={v.timingPerfectEnd01}
              tier={v.fishingTimingTier}
              strikeStart={v.castStrikeStart01}
              strikeEnd={v.castStrikeEnd01}
            />
          )}
          <button
            className={`button reel ${v.fishingTimingWindow ? "hot" : ""} ${v.fishingTimingTier === "perfect" ? "perfect" : ""}`}
            onClick={() => host.reel()}
          >
            {state.settings.shapeCues && v.fishingTimingTier === "perfect" ? "★ " : ""}
            {state.settings.shapeCues && v.fishingTimingTier === "good" ? "● " : ""}
            {v.fishingTimingTier === "perfect" ? "Perfect!"
              : v.fishingTimingTier === "good" ? "Good!"
                : v.castPhase === "strike" ? "Strike reel!"
                  : "Reel"} <kbd>F</kbd>
          </button>
        </div>
      )}
      <CarryIndicator v={v} onOpen={() => host.setBagOpen(true)} />
      {warehouseOpen && (
        <WarehousePanel warehouse={v.warehouse} onClose={() => host.setWarehouseOpen(false)} />
      )}
      {upgradesOpen && (
        <UpgradePanel upgrades={v.upgrades} coins={v.coins} onBuy={(id) => host.purchase(id)} onClose={() => host.setUpgradesOpen(false)} />
      )}
      {staffOpen && (
        <StaffPanel
          staff={v.staff}
          workers={v.workers}
          staffGear={v.staffGear}
          automationIssues={v.automationIssues}
          stations={v.stations}
          onShiftCount={v.onShiftCount}
          freeOnShiftSlots={v.freeOnShiftSlots}
          overtimeOnShiftCount={v.overtimeOnShiftCount}
          wagePerWorkerPerHour={v.workerWagePerWorkerPerHour}
          maintenanceCoinsPerStation={v.maintenanceCoinsPerStation}
          economyUnlocked={v.economyUnlocked}
          bagFishSpoilActive={v.bagFishSpoilActive}
          coins={v.coins}
          onOpenDashboard={() => host.setDashboardOpen(true)}
          onHire={(id) => host.hire(id)}
          onSetShift={(id, on) => host.setWorkerShift(id, on)}
          onAssignGear={(workerId, upgradeId) => host.assignWorkerGear(workerId, upgradeId)}
          onUnequipGear={(workerId, slotId) => host.unequipWorkerGear(workerId, slotId)}
          onTrainBranch={(workerId, branchId) => host.trainWorkerBranch(workerId, branchId)}
          onSelectBranch={(workerId, branchId) => host.selectWorkerBranch(workerId, branchId)}
          onSetSchedule={(workerId, scheduleId) => host.setWorkerSchedule(workerId, scheduleId)}
          onRepair={(id) => host.repairMachine(id)}
          onClose={() => host.setStaffOpen(false)}
        />
      )}
      {dashboardOpen && (
        <BusinessDashboardPanel
          dash={v.businessDashboard}
          journalLines={offlineReport?.journalLines}
          onClose={() => host.setDashboardOpen(false)}
        />
      )}
      {questsOpen && (
        <QuestLogPanel
          quests={v.quests}
          prestigeUnlocked={v.prestigeUnlocked}
          prestigeLockedReason={v.prestigeLockedReason}
          harborRating={v.harborRating}
          prestige={v.prestige}
          unlockedCosmetics={v.unlockedCosmetics}
          seasonalEvent={v.seasonalEvent}
          bank={v.bank}
          coins={v.coins}
          decorOffers={v.decorOffers}
          cosmeticIapOffers={v.cosmeticIapOffers}
          decorPatienceBonusTicks={v.decorPatienceBonusTicks}
          trophySets={v.trophySets}
          trophiesCount={v.trophies.length}
          speciesDiscovered={v.speciesBook.discovered}
          speciesTotal={v.speciesBook.total}
          onOpenSpeciesBook={() => host.setSpeciesBookOpen(true)}
          onPurchaseDecor={(id) => host.purchaseDecor(id)}
          onPurchaseIapCosmetic={(sku) => host.purchaseIapCosmetic(sku)}
          onRestorePurchases={() => host.restorePurchases()}
          equippedCosmeticId={host.equippedCosmeticId()}
          previewCosmeticId={host.previewCosmeticIdValue()}
          onEquipCosmetic={(id) => {
            host.setPreviewCosmeticId(null);
            host.setEquippedCosmeticId(id);
          }}
          onUnequipCosmetic={() => host.setEquippedCosmeticId(null)}
          onPreviewCosmetic={(id) => host.setPreviewCosmeticId(id)}
          onClearPreview={() => host.setPreviewCosmeticId(null)}
          onTakeLoan={(productId) => host.takeLoan(productId)}
          onRepayLoan={() => host.repayLoan()}
          onSetCoinGoal={(amount) => host.setCoinGoal(amount)}
          dailyLoginStreak={v.dailyLoginStreak}
          dailyGoals={v.dailyGoals}
          onClaimDailyGoal={(id) => host.claimDailyGoal(id)}
          weeklyGoals={v.weeklyGoals}
          onClaimWeeklyGoal={(id) => host.claimWeeklyGoal(id)}
          endgameUnlocked={v.endgameUnlocked}
          endgameLockedReason={v.endgameLockedReason}
          endgameMarkCount={v.endgameMarkCount}
          endgameCrestCount={v.endgameCrestCount}
          endgameTiers={v.endgameTiers}
          endgameChallenges={v.endgameChallenges}
          onClose={() => {
            host.setPreviewCosmeticId(null);
            host.setQuestsOpen(false);
          }}
        />
      )}
      {speciesBookOpen && (
        <SpeciesBookPanel book={v.speciesBook} onClose={() => host.setSpeciesBookOpen(false)} />
      )}
      {contractsOpen && (
        <ContractsPanel
          unlocked={v.contractsUnlocked}
          lockedReason={v.contractsLockedReason}
          offers={v.contractOffers}
          active={v.activeContracts}
          refreshTicksLeft={v.contractRefreshTicksLeft}
          failStreak={v.contractFailStreak}
          failStreakThreshold={v.contractFailStreakThreshold}
          ticksUntilNearestContractDeadline={v.ticksUntilNearestContractDeadline}
          contractBoardPressurePermille={v.contractBoardPressurePermille}
          onAccept={(id) => host.acceptContract(id)}
          onDeliver={(id) => host.deliverContract(id)}
          onClose={() => host.setContractsOpen(false)}
        />
      )}
      {mapOpen && (
        <HarborMapPanel
          harbors={v.harbors}
          fullHarborUnlock={v.fullHarborUnlock}
          onTravel={(id) => host.travelToHarbor(id)}
          onUnlockAll={() => host.purchaseFullHarborUnlock()}
          onRestoreUnlock={() => host.restoreFullHarborUnlock()}
          onClose={() => host.setMapOpen(false)}
        />
      )}
      {pauseOpen && (
        <PausePanel
          onResume={() => host.setPauseOpen(false)}
          onSettings={() => host.setSettingsOpen(true)}
          onTitle={() => void host.returnToTitle()}
        />
      )}
      {settingsOpen && state.status === "ready" && (
        <SettingsPanel
          settings={state.settings}
          cloudAvailable={host.cloudAvailable()}
          saveStatus={host.saveStatus()}
          telemetryRates={v.telemetryRates}
          analyticsAlertActive={host.hasAnalyticsDashboardAlerts()}
          achievements={v.achievements}
          unlockedAchievementsCount={v.unlockedAchievementsCount}
          onChange={(partial) => host.updateSettings(partial)}
          onExportTelemetry={() => host.exportTelemetryJson()}
          onExportBalance={() => host.exportBalanceJson()}
          onExportAnalyticsDashboard={() => host.exportAnalyticsDashboardJson()}
          onClose={() => host.setSettingsOpen(false)}
        />
      )}
      {bagOpen && (
        <BagDetailPanel
          v={v}
          onSelectBait={(id) => host.selectBait(id)}
          onSelectTechnique={(id) => host.selectTechnique(id)}
          onClose={() => host.setBagOpen(false)}
        />
      )}
      {stationOpen && v.baitOffers.length > 0 && (
        <BaitKioskPanel
          offers={v.baitOffers}
          preferredBaitId={v.preferredBaitId}
          coins={v.coins}
          onBuy={(id) => host.buyBait(id)}
          onSelect={(id) => host.selectBait(id)}
          onClose={() => host.setStationOpen(false)}
        />
      )}
      {stationOpen && v.context && v.baitOffers.length === 0 && (
        <StationDetailPanel
          card={v.context}
          stations={v.stations}
          coins={v.coins}
          onCycleRecipe={v.context.stationId ? () => host.cycleStationRecipe(v.context!.stationId!) : undefined}
          onSetPaused={(id, paused) => host.setMachinePaused(id, paused)}
          onRepair={(id) => host.repairMachine(id)}
          onBuildPlot={v.context.plotId ? (id) => host.buildPlot(id) : undefined}
          onClose={() => host.setStationOpen(false)}
        />
      )}
      {offlineReport && (
        <OfflineSummaryPanel report={offlineReport} onContinue={() => host.dismissOfflineReport()} />
      )}
    </div>
  );
}

