import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import sunriseSceneUrl from "../../../shared/assets/models/sunrise_pier_blockout.glb?url";
import moonSceneUrl from "../../../shared/assets/models/moon_cove_blockout.glb?url";
import jettySceneUrl from "../../../shared/assets/models/obsidian_jetty_blockout.glb?url";
import type { ActiveContractView, AutomationIssueView, BaitOfferView, BankView, ContextCard, ContractOfferView, DecorOfferView, HarborMapEntryView, OfflineReport, PrestigeView, QuestView, SeasonalEventBannerView, SimView, StaffGearView, StaffHireView, StationView, TrophySetView, UpgradeView, WorkerView } from "../engine";
import { CameraRig } from "../game/cameraRig";
import type { GameSettings, JoystickScale } from "../game/settingsStore";
import { GameHost, type HostState } from "../game/GameHost";
import { HarborScene, hasWebGL2 } from "../render/HarborScene";
import { Joystick } from "./Joystick";

const BLOCKOUT_URLS: Record<string, string> = {
  "sunrise_pier_blockout.glb": sunriseSceneUrl,
  "moon_cove_blockout.glb": moonSceneUrl,
  "obsidian_jetty_blockout.glb": jettySceneUrl,
};

/** The harbor is the home screen; panels open over it (blueprint "Navigation rules"). */
export function App() {
  const [host] = useState(() => new GameHost());
  const state = useSyncExternalStore(host.subscribe, host.getState);
  const [webgl2] = useState(hasWebGL2);

  useEffect(() => {
    const unlock = () => host.unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [host]);

  if (!webgl2) {
    return (
      <CenterCard title="WebGL 2 is not available">
        Fish Shopping needs a browser with WebGL 2. Try a current version of Chrome, Firefox, Edge or Safari,
        and make sure hardware acceleration is turned on.
      </CenterCard>
    );
  }
  return (
    <div className="game">
      <World host={host} />
      {state.status === "title" ? (
        <TitleScreen host={host} hasSave={state.hasSave} />
      ) : (
        <Hud host={host} state={state} />
      )}
      <MessageTicker host={host} />
    </div>
  );
}

function TitleScreen({ host, hasSave }: { host: GameHost; hasSave: boolean }) {
  const startNew = () => {
    if (hasSave && !window.confirm("Start a new game? Your saved harbor will be erased.")) return;
    void host.newGame();
  };
  return (
    <div className="center">
      <div className="panel center-card" role="dialog" aria-label="Fish Shopping">
        <h2>Fish Shopping</h2>
        <p className="title-tagline">Catch, cut, sell — run your harbor market</p>
        <div className="title-actions">
          {hasSave ? (
            <>
              <button className="button" onClick={() => void host.continueGame()}>Continue</button>
              <button className="button ghost" onClick={startNew}>New Game</button>
            </>
          ) : (
            <button className="button" onClick={startNew}>Play</button>
          )}
        </div>
        {!hasSave && (
          <p className="title-funnel-hint">First session: fish → cut → stock → sell</p>
        )}
      </div>
    </div>
  );
}

/** Canvas host: owns renderer creation/teardown and the single animation-frame loop. */
function World({ host }: { host: GameHost }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const scene = new HarborScene(canvas);
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
      scene.enqueueTransfers(host.drainFlyingTransfers());
      scene.render(now, view, host.renderQuality());
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => {
      if (document.hidden) host.pause();
      else if (host.getState().status === "ready") host.resume();
    };
    const onPageHide = () => host.pause();

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
      if (st.status !== "ready" || !st.settings.tapToMove) return;
      if (st.pauseOpen || st.settingsOpen || st.bagOpen || st.stationOpen || st.upgradesOpen
        || st.staffOpen || st.questsOpen || st.contractsOpen || st.mapOpen || st.offlineReport) {
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
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      host.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      scene.dispose();
    };
  }, [host]);

  return <canvas ref={canvasRef} className="world" aria-label="Harbor" />;
}

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

function isTextInput(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

function Hud({ host, state }: { host: GameHost; state: HostState }) {
  const upgradesOpen = state.status === "ready" && state.upgradesOpen;
  const staffOpen = state.status === "ready" && state.staffOpen;
  const questsOpen = state.status === "ready" && state.questsOpen;
  const contractsOpen = state.status === "ready" && state.contractsOpen;
  const mapOpen = state.status === "ready" && state.mapOpen;
  const pauseOpen = state.status === "ready" && state.pauseOpen;
  const settingsOpen = state.status === "ready" && state.settingsOpen;
  const bagOpen = state.status === "ready" && state.bagOpen;
  const stationOpen = state.status === "ready" && state.stationOpen;
  const offlineReport = state.status === "ready" ? state.offlineReport : null;
  const [touch, setTouch] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);

  // Keyboard: WASD / arrows move, U/H/G/J/M panels, Escape closes the panel.
  useEffect(() => {
    const held = new Set<string>();
    const apply = () => {
      let x = 0, y = 0;
      held.forEach((k) => { const d = KEY_DIRS[k]; if (d) { x += d[0]; y += d[1]; } });
      host.setMove(Math.sign(x), Math.sign(y));
    };
    const down = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;
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
        else host.setPauseOpen(true);
        return;
      }
      if (e.code === "KeyP" && !e.repeat) { host.setPauseOpen(!pauseOpen); return; }
      if (e.code === "KeyU" && !e.repeat) { host.setUpgradesOpen(!upgradesOpen); return; }
      if (e.code === "KeyH" && !e.repeat) { host.setStaffOpen(!staffOpen); return; }
      if (e.code === "KeyG" && !e.repeat) { host.setQuestsOpen(!questsOpen); return; }
      if (e.code === "KeyJ" && !e.repeat) { host.setContractsOpen(!contractsOpen); return; }
      if (e.code === "KeyM" && !e.repeat) { host.setMapOpen(!mapOpen); return; }
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
  }, [host, upgradesOpen, staffOpen, questsOpen, contractsOpen, mapOpen, pauseOpen, settingsOpen, bagOpen, stationOpen, offlineReport]);

  useEffect(() => {
    const onTouch = () => setTouch(true);
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  if (state.status === "loading") return <CenterCard title="Loading harbor...">Preparing Sunrise Pier.</CenterCard>;
  if (state.status === "failed") return <CenterCard title="Something went wrong" danger>{state.message}</CenterCard>;
  if (state.status !== "ready") return null;

  const v = state.view;
  return (
    <div className="hud">
      <div className="pill top-left">
        {v.harborName}
        {v.harborSpecializationName ? (
          <span className="spec" title={v.harborSpecializationDescription ?? undefined}>
            {" · "}{v.harborSpecializationName}
          </span>
        ) : null}
        {v.harborRating > 0 ? <span className="rating">{"★".repeat(v.harborRating)}</span> : null}
        <span className="rep" title={`${v.reputationLabel} · ${Math.trunc(v.reputationScorePermille / 10)}%`}>
          {" · Rep "}{Math.trunc(v.reputationScorePermille / 10)}%
        </span>
        <span className="day-part"> · {v.dayPartName}{v.tideChartOwned ? " · tides" : ""}{v.preferredBaitId ? " · bait set" : ""}</span>
      </div>
      <div className="pill coins top-center" aria-live="polite">{formatCoins(v.coins)} coins</div>
      {v.rush && (
        <div className="pill rush-banner" aria-live="polite">
          {v.rush.name} · {formatRushSeconds(v.rush.ticksRemaining)}s
        </div>
      )}
      {v.seasonalEvent && (
        <div className="pill seasonal-banner" aria-live="polite">
          {v.seasonalEvent.name} · {formatRushSeconds(v.seasonalEvent.ticksRemaining)}s
        </div>
      )}
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
      <div className="top-actions" role="toolbar" aria-label="Harbor actions">
        <button className="button" onClick={() => host.setPauseOpen(true)}>
          Pause <kbd>P</kbd>
        </button>
        <button className="button" onClick={() => host.setMapOpen(true)}>
          Map <kbd>M</kbd>
        </button>
        <button className="button" onClick={() => host.setQuestsOpen(true)}>
          Goals <kbd>G</kbd>
        </button>
        <button className="button" onClick={() => host.setContractsOpen(true)}>
          Jobs <kbd>J</kbd>
        </button>
        <button className="button" onClick={() => host.setStaffOpen(true)}>
          Staff <kbd>H</kbd>
        </button>
        <button className="button" onClick={() => host.setUpgradesOpen(true)}>
          Upgrades <kbd>U</kbd>
        </button>
      </div>
      {v.objective && (
        <div className="panel objective">
          <div className="eyebrow">
            {v.objective.eyebrow}
            {v.objective.detail ? <span className="objective-detail"> {v.objective.detail}</span> : null}
          </div>
          <div>{v.objective.text}</div>
        </div>
      )}
      {touch ? (
        <Joystick
          side={state.settings.joystickSide}
          scale={state.settings.joystickScale}
          onMove={(x, y) => host.setMove(x, y)}
        />
      ) : (
        <div className={`panel keys-hint keys-hint-${state.settings.joystickSide}`}>
          Move with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys
        </div>
      )}
      {v.context && (
        <StationCard
          card={v.context}
          onOpen={() => host.setStationOpen(true)}
          onCycleRecipe={v.context.stationId ? () => host.cycleStationRecipe(v.context!.stationId!) : undefined}
        />
      )}
      {v.fishingCanReel && (
        <button
          className={`button reel ${v.fishingTimingWindow ? "hot" : ""} ${v.fishingTimingTier === "perfect" ? "perfect" : ""}`}
          onClick={() => host.reel()}
        >
          {v.fishingTimingTier === "perfect" ? "Perfect!" : v.fishingTimingTier === "good" ? "Good!" : "Reel"} <kbd>F</kbd>
        </button>
      )}
      <CarryIndicator v={v} onOpen={() => host.setBagOpen(true)} />
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
          onHire={(id) => host.hire(id)}
          onSetShift={(id, on) => host.setWorkerShift(id, on)}
          onAssignGear={(workerId, upgradeId) => host.assignWorkerGear(workerId, upgradeId)}
          onUnequipGear={(workerId, slotId) => host.unequipWorkerGear(workerId, slotId)}
          onRepair={(id) => host.repairMachine(id)}
          onClose={() => host.setStaffOpen(false)}
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
          decorPatienceBonusTicks={v.decorPatienceBonusTicks}
          trophySets={v.trophySets}
          trophiesCount={v.trophies.length}
          onPurchaseDecor={(id) => host.purchaseDecor(id)}
          onTakeLoan={() => host.takeLoan()}
          onRepayLoan={() => host.repayLoan()}
          onSetCoinGoal={(amount) => host.setCoinGoal(amount)}
          onClose={() => host.setQuestsOpen(false)}
        />
      )}
      {contractsOpen && (
        <ContractsPanel
          unlocked={v.contractsUnlocked}
          lockedReason={v.contractsLockedReason}
          offers={v.contractOffers}
          active={v.activeContracts}
          refreshTicksLeft={v.contractRefreshTicksLeft}
          onAccept={(id) => host.acceptContract(id)}
          onDeliver={(id) => host.deliverContract(id)}
          onClose={() => host.setContractsOpen(false)}
        />
      )}
      {mapOpen && (
        <HarborMapPanel
          harbors={v.harbors}
          onTravel={(id) => host.travelToHarbor(id)}
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
          telemetryRates={v.telemetryRates}
          onChange={(partial) => host.updateSettings(partial)}
          onExportTelemetry={() => host.exportTelemetryJson()}
          onExportBalance={() => host.exportBalanceJson()}
          onClose={() => host.setSettingsOpen(false)}
        />
      )}
      {bagOpen && (
        <BagDetailPanel
          v={v}
          onSelectBait={(id) => host.selectBait(id)}
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
          onClose={() => host.setStationOpen(false)}
        />
      )}
      {offlineReport && (
        <OfflineSummaryPanel report={offlineReport} onContinue={() => host.dismissOfflineReport()} />
      )}
    </div>
  );
}

function StationCard({ card, onOpen, onCycleRecipe }: { card: ContextCard; onOpen: () => void; onCycleRecipe?: () => void }) {
  return (
    <div
      className="panel station-card"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      tabIndex={0}
      role="group"
      aria-label={card.title}
    >
      <strong>{card.title}</strong>
      {card.lines.map((l) => <div key={l} className="num">{l}</div>)}
      {card.progress !== null && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(card.progress * 100)}>
          <div style={{ width: `${Math.min(100, Math.max(0, card.progress * 100))}%` }} />
        </div>
      )}
      {onCycleRecipe && card.recipeModeLabel && (
        <button className="button" style={{ marginTop: 8, width: "100%" }} onClick={(e) => { e.stopPropagation(); onCycleRecipe(); }}>
          Recipe: {card.recipeModeLabel} <kbd>R</kbd>
        </button>
      )}
    </div>
  );
}

function CarryIndicator({ v, onOpen }: { v: SimView; onOpen: () => void }) {
  return (
    <button type="button" className="panel carry" onClick={onOpen} aria-label={`Bag ${v.bagUsedUnits} of ${v.bagCapacityUnits}`}>
      <strong className="num">Bag {v.bagUsedUnits}/{v.bagCapacityUnits}</strong>
      {v.bag.length === 0 ? <div className="muted">Empty</div> : v.bag.map((i) => <div key={i.itemId} className="num">{i.count} x {i.name}</div>)}
    </button>
  );
}

function PausePanel({ onResume, onSettings, onTitle }: {
  onResume: () => void; onSettings: () => void; onTitle: () => void;
}) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => resumeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onResume}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Paused" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Paused</h2>
        </div>
        <div className="title-actions">
          <button ref={resumeRef} className="button" onClick={onResume}>Resume</button>
          <button className="button" onClick={onSettings}>Settings</button>
          <button className="button ghost" onClick={onTitle}>Title</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, cloudAvailable, telemetryRates, onChange, onExportTelemetry, onExportBalance, onClose }: {
  settings: GameSettings;
  cloudAvailable: boolean;
  telemetryRates: SimView["telemetryRates"];
  onChange: (partial: Partial<GameSettings>) => void;
  onExportTelemetry: () => string | null;
  onExportBalance: () => string | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const scales: JoystickScale[] = [0.75, 1, 1.25];
  const copyJson = async (label: string, json: string | null, emptyMsg: string) => {
    if (!json) { setExportNote(emptyMsg); return; }
    try {
      await navigator.clipboard.writeText(json);
      setExportNote(`${label} copied`);
    } catch {
      setExportNote(`Could not copy ${label.toLowerCase()}`);
    }
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet settings-sheet" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Settings</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        <ul className="upgrade-list">
          <li>
            <div className="grow">
              <strong>Mute</strong>
              <div className="small muted">Silences catch, sale, machine, rush, and upgrade stingers.</div>
            </div>
            <button className="button" aria-pressed={settings.muted} onClick={() => onChange({ muted: !settings.muted })}>
              {settings.muted ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Tap to move</strong>
              <div className="small muted">Tap the harbor to walk there. Stick and keys still work.</div>
            </div>
            <button className="button" aria-pressed={settings.tapToMove} onClick={() => onChange({ tapToMove: !settings.tapToMove })}>
              {settings.tapToMove ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Cloud sync</strong>
              <div className="small muted">
                {cloudAvailable
                  ? "Optional. Newest checksummed save wins across devices."
                  : "Optional. Set VITE_FIREBASE_API_KEY + VITE_FIREBASE_PROJECT_ID to link a remote."}
              </div>
            </div>
            <button
              className="button"
              aria-pressed={settings.cloudSyncEnabled}
              onClick={() => onChange({ cloudSyncEnabled: !settings.cloudSyncEnabled })}
            >
              {settings.cloudSyncEnabled ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Balance strip</strong>
              <div className="small muted">In-dev HUD rates: abandon, wage ratio, top catch share.</div>
            </div>
            <button
              className="button"
              aria-pressed={settings.showBalanceStrip}
              onClick={() => onChange({ showBalanceStrip: !settings.showBalanceStrip })}
            >
              {settings.showBalanceStrip ? "On" : "Off"}
            </button>
          </li>
        </ul>
        <div className="small" style={{ marginTop: 12 }}>Telemetry</div>
        <div className="small muted">Privacy-safe counters (fish.telemetry.v2) and content balance knobs. Copied as JSON.</div>
        <div className="small reward" style={{ marginTop: 6 }}>
          Abandon {Math.trunc(telemetryRates.abandonPermille / 10)}%
          {" · "}Wage {Math.trunc(telemetryRates.wageRatioPermille / 10)}%
          {telemetryRates.topSpecies[0]
            ? ` · Top ${telemetryRates.topSpecies[0].name} ${Math.trunc(telemetryRates.topSpecies[0].sharePermille / 10)}%`
            : " · No catches yet"}
        </div>
        <div className="quality-row">
          <button
            className="button"
            onClick={() => void copyJson("Play stats", onExportTelemetry(), "Start a harbor to export play stats")}
          >
            Copy stats
          </button>
          <button
            className="button ghost"
            onClick={() => void copyJson("Balance knobs", onExportBalance(), "Balance export unavailable")}
          >
            Copy balance
          </button>
        </div>
        {exportNote && <div className="small" style={{ marginTop: 8 }}>{exportNote}</div>}
        <div className="small" style={{ marginTop: 12 }}>Quality</div>
        <div className="quality-row">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              className={settings.quality === q ? "button" : "button ghost"}
              aria-pressed={settings.quality === q}
              onClick={() => onChange({ quality: q })}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="small" style={{ marginTop: 12 }}>Joystick side</div>
        <div className="quality-row">
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              className={settings.joystickSide === side ? "button" : "button ghost"}
              aria-pressed={settings.joystickSide === side}
              onClick={() => onChange({ joystickSide: side })}
            >
              {side}
            </button>
          ))}
        </div>
        <div className="small" style={{ marginTop: 12 }}>Joystick size</div>
        <div className="quality-row">
          {scales.map((s) => {
            const label = s === 0.75 ? "S" : s === 1.25 ? "L" : "M";
            return (
              <button
                key={s}
                className={settings.joystickScale === s ? "button" : "button ghost"}
                aria-pressed={settings.joystickScale === s}
                onClick={() => onChange({ joystickScale: s })}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BagDetailPanel({ v, onSelectBait, onClose }: {
  v: SimView; onSelectBait: (baitId: string | null) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const baitIds = new Set(v.baitOffers.map((b) => b.id));
  // Prefer catalog ids from pack via itemId prefix when kiosk offers empty.
  const isBait = (itemId: string) => itemId.startsWith("bait.") || baitIds.has(itemId);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Bag" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Bag</h2>
          <span className="num">{v.bagUsedUnits}/{v.bagCapacityUnits}</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        {v.bagFishSpoilActive && <p className="small danger">Fish in your bag can spoil.</p>}
        {v.preferredBaitId && (
          <p className="small">
            Preferred bait locked in.
            {" "}
            <button className="button ghost" onClick={() => onSelectBait(null)}>Use auto</button>
          </p>
        )}
        <ul className="upgrade-list">
          {v.bag.length === 0 ? (
            <li><div className="muted">Empty</div></li>
          ) : v.bag.map((i) => (
            <li key={i.itemId}>
              <div className="grow">
                <strong>{i.name}</strong>
                {isBait(i.itemId) && v.preferredBaitId === i.itemId && (
                  <div className="small">Preferred for casts</div>
                )}
              </div>
              <span className="num">{i.count}</span>
              {isBait(i.itemId) && v.preferredBaitId !== i.itemId && (
                <button className="button ghost" onClick={() => onSelectBait(i.itemId)}>Prefer</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BaitKioskPanel({ offers, preferredBaitId, coins, onBuy, onSelect, onClose }: {
  offers: BaitOfferView[];
  preferredBaitId: string | null;
  coins: number;
  onBuy: (id: string) => void;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Bait kiosk" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Bait kiosk</h2>
          <span className="num">{formatCoins(coins)} coins</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        <p className="small">Buy packs for rare bites. Prefer one for the next cast, or auto.</p>
        <div className="title-actions">
          <button className="button ghost" disabled={preferredBaitId === null} onClick={() => onSelect(null)}>
            Auto bait
          </button>
        </div>
        <ul className="upgrade-list">
          {offers.map((o) => (
            <li key={o.id}>
              <div className="grow">
                <strong>{o.name}</strong>
                <div className="small">{o.description}</div>
                <div className="small">Owned {o.ownedCount} · pack of {o.packQuantity}</div>
                {o.preferred && <div className="small">Preferred</div>}
                {o.reason && <div className="small danger">{o.reason}</div>}
              </div>
              {o.ownedCount > 0 && !o.preferred && (
                <button className="button ghost" onClick={() => onSelect(o.id)}>Prefer</button>
              )}
              <button className="button num" disabled={!o.purchasable} onClick={() => onBuy(o.id)}>
                {formatCoins(o.cost)}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StationDetailPanel({ card, stations, coins, onCycleRecipe, onSetPaused, onRepair, onClose }: {
  card: ContextCard;
  stations: StationView[];
  coins: number;
  onCycleRecipe?: () => void;
  onSetPaused: (stationId: string, paused: boolean) => void;
  onRepair: (stationId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const station = card.stationId ? stations.find((s) => s.stationId === card.stationId) : undefined;
  const paused = station?.status === "PAUSED" || station?.statusText === "Paused";
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={card.title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{card.title}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        {card.lines.map((l) => <div key={l} className="num">{l}</div>)}
        {station?.needsRepair && (
          <div className="small danger">
            {station.status === "NEEDS_REPAIR" ? "Broken — pay for a repair to resume." : "Running slow — repair clears the fault early."}
            {station.slowTicksRemaining > 0 ? ` · ${formatRushSeconds(station.slowTicksRemaining)}s left` : ""}
          </div>
        )}
        {card.progress !== null && (
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(card.progress * 100)}>
            <div style={{ width: `${Math.min(100, Math.max(0, card.progress * 100))}%` }} />
          </div>
        )}
        {(onCycleRecipe || card.stationId) && (
          <div className="title-actions">
            {onCycleRecipe && card.recipeModeLabel && (
              <button className="button" onClick={onCycleRecipe}>
                Recipe: {card.recipeModeLabel} <kbd>R</kbd>
              </button>
            )}
            {card.stationId && station?.needsRepair && (
              <button
                className="button"
                disabled={coins < station.repairCost}
                onClick={() => onRepair(card.stationId!)}
              >
                Repair · {formatCoins(station.repairCost)}
              </button>
            )}
            {card.stationId && (
              <button className="button" onClick={() => onSetPaused(card.stationId!, !paused)}>
                {paused ? "Resume machine" : "Pause machine"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradePanel({ upgrades, coins, onBuy, onClose }: {
  upgrades: UpgradeView[]; coins: number; onBuy: (id: string) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Upgrades" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Upgrades</h2>
          <span className="num">{formatCoins(coins)} coins</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        <ul className="upgrade-list">
          {upgrades.map((u) => (
            <li key={u.id}>
              <div className="grow">
                <strong>{u.name}</strong>
                <div className="small">{u.description}</div>
                {u.reason && <div className="small danger">{u.reason}</div>}
              </div>
              {u.owned ? <span className="owned">Owned</span> : (
                <button className="button num" disabled={!u.purchasable} onClick={() => onBuy(u.id)}>{formatCoins(u.cost)}</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function OfflineSummaryPanel({ report, onContinue }: { report: OfflineReport; onContinue: () => void }) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => continueRef.current?.focus(), []);
  const lines: string[] = [];
  if (report.coinsDelta !== 0) lines.push(`${report.coinsDelta > 0 ? "+" : ""}${formatCoins(report.coinsDelta)} coins`);
  if (report.sales > 0) lines.push(`${report.sales} sales`);
  if (report.workerFishCaught > 0) lines.push(`${report.workerFishCaught} fish caught by staff`);
  if (report.workerItemsMoved > 0) lines.push(`${report.workerItemsMoved} items moved by staff`);
  if (lines.length === 0 && !report.hadActivity) lines.push("Quiet shift — hire staff to earn while away");
  return (
    <div className="scrim">
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="While you were away" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>While you were away</h2>
        </div>
        <p className="small muted">
          {formatAwayDuration(report.elapsedMillis)}
          {report.capped ? " · capped at max offline time" : ""}
        </p>
        <p>Your staff kept the harbor running.</p>
        <ul className="upgrade-list">
          {lines.map((l) => <li key={l}><strong className="num">{l}</strong></li>)}
        </ul>
        <button ref={continueRef} className="button" style={{ width: "100%", marginTop: 12 }} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

function formatAwayDuration(elapsedMillis: number): string {
  const totalSec = Math.max(0, Math.floor(elapsedMillis / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `Away ${h}h ${m}m`;
  if (m > 0) return `Away ${m}m ${s}s`;
  return `Away ${s}s`;
}

function HarborMapPanel({ harbors, onTravel, onClose }: {
  harbors: HarborMapEntryView[];
  onTravel: (harborId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Harbor map" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Harbor map</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        <ul className="upgrade-list">
          {harbors.map((h) => (
            <li key={h.harborId}>
              <div className="grow">
                <strong>{h.name}</strong>
                {h.specializationName ? (
                  <div className="small muted" title={h.specializationDescription ?? undefined}>
                    {h.specializationName}
                    {h.specializationDescription ? ` — ${h.specializationDescription}` : ""}
                  </div>
                ) : null}
                <div className={`small ${h.unlocked ? "muted" : "danger"}`}>
                  {h.current ? "You are here" : h.unlocked ? "Ready to travel" : (h.reason ?? "Locked")}
                </div>
              </div>
              <button className="button" disabled={!h.travelEnabled} onClick={() => onTravel(h.harborId)}>
                {h.current ? "Here" : "Travel"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function prestigeRewardBits(p: PrestigeView): string[] {
  return [
    ...(p.rewardCoins > 0 ? [`${formatCoins(p.rewardCoins)} coins`] : []),
    ...(p.catchSpeedPermille > 1000 ? [`+${Math.trunc((p.catchSpeedPermille - 1000) / 10)}% catch`] : []),
    ...(p.priceBonusPermille > 1000 ? [`+${Math.trunc((p.priceBonusPermille - 1000) / 10)}% prices`] : []),
    ...(p.cosmetic ? [`Unlock ${p.cosmetic}`] : []),
  ];
}

function QuestLogPanel({
  quests,
  prestigeUnlocked,
  prestigeLockedReason,
  harborRating,
  prestige,
  unlockedCosmetics,
  seasonalEvent,
  bank,
  coins,
  decorOffers,
  decorPatienceBonusTicks,
  trophySets,
  trophiesCount,
  onPurchaseDecor,
  onTakeLoan,
  onRepayLoan,
  onSetCoinGoal,
  onClose,
}: {
  quests: QuestView[];
  prestigeUnlocked: boolean;
  prestigeLockedReason: string | null;
  harborRating: number;
  prestige: PrestigeView[];
  unlockedCosmetics: string[];
  seasonalEvent: SeasonalEventBannerView | null;
  bank: BankView;
  coins: number;
  decorOffers: DecorOfferView[];
  decorPatienceBonusTicks: number;
  trophySets: TrophySetView[];
  trophiesCount: number;
  onPurchaseDecor: (decorId: string) => void;
  onTakeLoan: () => void;
  onRepayLoan: () => void;
  onSetCoinGoal: (amount: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Goals" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Goals</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        <ul className="upgrade-list">
          {seasonalEvent && (
            <li>
              <div className="grow">
                <strong>{seasonalEvent.name}</strong>
                <div className="small">{seasonalEvent.description}</div>
                <div className="small reward">
                  {formatRushSeconds(seasonalEvent.ticksRemaining)}s left
                  {seasonalEvent.banner ? ` · ${seasonalEvent.banner}` : ""}
                </div>
              </div>
              <span className="num">Event</span>
            </li>
          )}
          <li>
            <div className="grow">
              <strong>Pier bank</strong>
              {!bank.unlocked ? (
                <div className="small danger">{bank.lockedReason ?? "Locked"}</div>
              ) : bank.loanOwed > 0 ? (
                <>
                  <div className="small">
                    Owed {formatCoins(bank.loanOwed)}
                    {bank.loanOverdue
                      ? " · overdue (auto-collect)"
                      : ` · due in ${formatRushSeconds(bank.loanDueTicksLeft)}s`}
                  </div>
                  <button
                    className="button"
                    disabled={!bank.canRepayLoan}
                    onClick={onRepayLoan}
                  >
                    Repay · up to {formatCoins(Math.min(coins, bank.loanOwed))}
                  </button>
                </>
              ) : (
                <>
                  <div className="small">
                    Borrow {formatCoins(bank.loanPrincipal)} · repay {formatCoins(bank.repayAmount)}
                    {" "}in {formatRushSeconds(bank.termTicks)}s
                  </div>
                  <button
                    className="button"
                    disabled={!bank.canTakeLoan}
                    onClick={onTakeLoan}
                  >
                    Take loan · {formatCoins(bank.loanPrincipal)}
                  </button>
                </>
              )}
            </div>
            <span className="num">Bank</span>
          </li>
          <li>
            <div className="grow">
              <strong>Coin goal</strong>
              <div className="small">
                {bank.coinGoal > 0
                  ? bank.coinGoalCelebrated
                    ? `Reached ${formatCoins(bank.coinGoal)}`
                    : `${formatCoins(coins)} / ${formatCoins(bank.coinGoal)}`
                  : "Pick a savings target"}
              </div>
              {bank.coinGoal > 0 && !bank.coinGoalCelebrated && (
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={bank.coinGoal} aria-valuenow={Math.min(coins, bank.coinGoal)}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (coins / Math.max(1, bank.coinGoal)) * 100))}%` }} />
                </div>
              )}
              <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                {bank.goalPresets.map((amount) => (
                  <button
                    key={amount}
                    className={`button ghost${bank.coinGoal === amount ? " active" : ""}`}
                    onClick={() => onSetCoinGoal(amount)}
                  >
                    {formatCoins(amount)}
                  </button>
                ))}
                {bank.coinGoal > 0 && (
                  <button className="button ghost" onClick={() => onSetCoinGoal(0)}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <span className="num">Goal</span>
          </li>
          <li>
            <div className="grow">
              <strong>Trophy board</strong>
              <div className="small">{trophiesCount} species mounted</div>
            </div>
            <span className="num">{trophiesCount}</span>
          </li>
          {trophySets.map((set) => (
            <li key={set.id}>
              <div className="grow">
                <strong>{set.name}</strong>
                <div className="small">{set.description}</div>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={set.total} aria-valuenow={set.mounted}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (set.mounted / Math.max(1, set.total)) * 100))}%` }} />
                </div>
              </div>
              <span className={set.completed ? "owned" : "num"}>
                {set.completed ? "Done" : `${set.mounted}/${set.total}`}
              </span>
            </li>
          ))}
          {quests.map((q) => {
            const rewardBits = [
              ...(q.rewardCoins > 0 ? [`${formatCoins(q.rewardCoins)} coins`] : []),
              ...q.rewardUnlockNames.map((n) => `Unlock ${n}`),
            ];
            return (
              <li key={q.id}>
                <div className="grow">
                  <strong>{q.name}</strong>
                  <div className="small">{q.description}</div>
                  {q.reason && <div className="small danger">{q.reason}</div>}
                  {rewardBits.length > 0 && <div className="small reward">Reward: {rewardBits.join(" · ")}</div>}
                  {q.status === "active" && (
                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={q.goalAtLeast} aria-valuenow={q.progress}>
                      <div style={{ width: `${Math.min(100, Math.max(0, (q.progress / q.goalAtLeast) * 100))}%` }} />
                    </div>
                  )}
                </div>
                <span className={q.status === "completed" ? "owned" : "num"}>
                  {q.status === "completed" ? "Done" : q.status === "locked" ? "Locked" : `${q.progress}/${q.goalAtLeast}`}
                </span>
              </li>
            );
          })}
          <li>
            <div className="grow">
              <strong>Prestige</strong>
              {!prestigeUnlocked ? (
                <div className="small danger">{prestigeLockedReason ?? "Locked"}</div>
              ) : (
                <>
                  <div className="small reward">Harbor rating {"★".repeat(Math.max(0, Math.min(5, harborRating)))}</div>
                  {unlockedCosmetics.length > 0 && (
                    <div className="small muted">Banners: {unlockedCosmetics.join(", ")}</div>
                  )}
                </>
              )}
            </div>
          </li>
          {prestigeUnlocked && prestige.map((p) => {
            const rewardBits = prestigeRewardBits(p);
            return (
              <li key={p.id}>
                <div className="grow">
                  <strong>{p.name}</strong>
                  <div className="small">{p.description}</div>
                  {p.reason && <div className="small danger">{p.reason}</div>}
                  {rewardBits.length > 0 && <div className="small reward">Reward: {rewardBits.join(" · ")}</div>}
                  {p.status === "active" && (
                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={p.goalAtLeast} aria-valuenow={p.progress}>
                      <div style={{ width: `${Math.min(100, Math.max(0, (p.progress / p.goalAtLeast) * 100))}%` }} />
                    </div>
                  )}
                </div>
                <span className={p.status === "completed" ? "owned" : "num"}>
                  {p.status === "completed" ? "Done" : p.status === "locked" ? "Locked" : `${p.progress}/${p.goalAtLeast}`}
                </span>
              </li>
            );
          })}
          <li>
            <div className="grow">
              <strong>Shop decor</strong>
              <div className="small muted">
                Placable cosmetics
                {decorPatienceBonusTicks > 0 ? ` · +${decorPatienceBonusTicks} customer patience` : ""}
              </div>
            </div>
          </li>
          {decorOffers.map((d) => (
            <li key={d.id}>
              <div className="grow">
                <strong>{d.name}</strong>
                <div className="small">{d.description}</div>
                <div className="small reward">+{d.patienceBonusTicks} patience · {formatCoins(d.cost)} coins</div>
                {d.reason && <div className="small danger">{d.reason}</div>}
              </div>
              {d.status === "owned" ? (
                <span className="owned">Owned</span>
              ) : (
                <button className="button" disabled={!d.canAfford} onClick={() => onPurchaseDecor(d.id)}>
                  Buy
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ContractsPanel({ unlocked, lockedReason, offers, active, refreshTicksLeft, onAccept, onDeliver, onClose }: {
  unlocked: boolean;
  lockedReason: string | null;
  offers: ContractOfferView[];
  active: ActiveContractView[];
  refreshTicksLeft: number;
  onAccept: (offerId: string) => void;
  onDeliver: (contractId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Jobs" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="grow">
            <h2>Jobs</h2>
            {unlocked && refreshTicksLeft > 0 && (
              <div className="small muted">Board refreshes in {formatRushSeconds(refreshTicksLeft)}s</div>
            )}
          </div>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        {!unlocked ? (
          <p className="danger">{lockedReason ?? "Locked"}</p>
        ) : (
          <ul className="upgrade-list">
            {active.length > 0 && (
              <li><strong>Active</strong></li>
            )}
            {active.map((job) => (
              <li key={job.contractId}>
                <div className="grow">
                  <strong>{job.name}</strong>
                  {job.standing && (
                    <div className="small muted">Standing · streak {job.standingStreak}</div>
                  )}
                  <div className="small">{job.delivered}/{job.quantity} {job.itemName} · {formatRushSeconds(job.ticksRemaining)}s left</div>
                  <div className="small reward">Pay {formatCoins(job.payout)} · fail −{formatCoins(job.penalty)}</div>
                </div>
                <button className="button" disabled={!job.deliverEnabled} onClick={() => onDeliver(job.contractId)}>Deliver</button>
              </li>
            ))}
            <li><strong>Board</strong></li>
            {offers.length === 0 && (
              <li><div className="small">No offers right now</div></li>
            )}
            {offers.map((offer) => (
              <li key={offer.offerId}>
                <div className="grow">
                  <strong>{offer.name}</strong>
                  {offer.standing && (
                    <div className="small muted">
                      Standing{offer.standingStreak > 0 ? ` · streak ${offer.standingStreak}` : ""}
                    </div>
                  )}
                  <div className="small">{offer.description}</div>
                  <div className="small">{offer.quantity}× {offer.itemName} · {formatRushSeconds(offer.durationTicks)}s</div>
                  <div className="small reward">+{formatCoins(offer.payout)} / −{formatCoins(offer.penalty)}</div>
                  {offer.reason && <div className="small danger">{offer.reason}</div>}
                </div>
                <button className="button" disabled={!offer.acceptEnabled} onClick={() => onAccept(offer.offerId)}>Accept</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StaffPanel({ staff, workers, staffGear, automationIssues, stations, onShiftCount, freeOnShiftSlots, overtimeOnShiftCount, wagePerWorkerPerHour, maintenanceCoinsPerStation, economyUnlocked, bagFishSpoilActive, coins, onHire, onSetShift, onAssignGear, onUnequipGear, onRepair, onClose }: {
  staff: StaffHireView[]; workers: WorkerView[]; staffGear: StaffGearView[]; automationIssues: AutomationIssueView[]; stations: StationView[]; onShiftCount: number; freeOnShiftSlots: number; overtimeOnShiftCount: number;
  wagePerWorkerPerHour: number; maintenanceCoinsPerStation: number; economyUnlocked: boolean; bagFishSpoilActive: boolean;
  coins: number; onHire: (roleId: string) => void; onSetShift: (workerId: string, onShift: boolean) => void;
  onAssignGear: (workerId: string, upgradeId: string) => void; onUnequipGear: (workerId: string, slotId: string) => void;
  onRepair: (stationId: string) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const freeGear = staffGear.filter((g) => !g.equippedOnWorkerId);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label="Staff" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="grow">
            <h2>Staff</h2>
            <div className="small muted">
              {onShiftCount} on shift · {freeOnShiftSlots} free slots
              {overtimeOnShiftCount > 0 ? ` · ${overtimeOnShiftCount} overtime` : ""}
              {wagePerWorkerPerHour > 0 ? ` · ${wagePerWorkerPerHour} coins/hr` : ""}
              {economyUnlocked && maintenanceCoinsPerStation > 0 ? ` · upkeep ${maintenanceCoinsPerStation}/station` : ""}
              {bagFishSpoilActive ? " · bag fish spoil" : ""}
            </div>
          </div>
          <span className="num">{formatCoins(coins)} coins</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        {workers.length > 0 && (
          <ul className="upgrade-list">
            {workers.map((w) => (
              <li key={w.id}>
                <div className="grow">
                  <strong>{w.roleName} · Lv {w.level}</strong>
                  <div className="small">
                    {w.xpToNext === null ? "Max level" : `${w.xpToNext} XP to next`}
                    {w.traitNames.length > 0 ? ` · ${w.traitNames.join(", ")}` : ""}
                  </div>
                  {w.blockedReason && <div className="small danger">{w.blockedReason}</div>}
                  {w.equipment.length > 0 && (
                    <div className="small">
                      {w.equipment.map((eq) => (
                        <button
                          key={eq.slotId}
                          className="button ghost"
                          style={{ marginRight: 4, marginTop: 4 }}
                          onClick={() => onUnequipGear(w.id, eq.slotId)}
                          title={`Unequip ${eq.upgradeName}`}
                        >
                          {eq.slotName}: {eq.upgradeName} ×
                        </button>
                      ))}
                    </div>
                  )}
                  {freeGear.length > 0 && (
                    <div className="small">
                      {freeGear.map((g) => (
                        <button
                          key={g.upgradeId}
                          className="button ghost"
                          style={{ marginRight: 4, marginTop: 4 }}
                          onClick={() => onAssignGear(w.id, g.upgradeId)}
                        >
                          Equip {g.slotName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="button ghost"
                  onClick={() => onSetShift(w.id, !w.onShift)}
                >
                  {w.onShift ? "On shift" : "Off shift"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {staffGear.length > 0 && (
          <div className="small muted" style={{ marginBottom: 8 }}>
            Gear: {staffGear.map((g) =>
              g.equippedOnRoleName
                ? `${g.name} → ${g.equippedOnRoleName}`
                : `${g.name} (free)`,
            ).join(" · ")}
          </div>
        )}
        {automationIssues.length > 0 && (
          <ul className="upgrade-list">
            {automationIssues.map((issue) => {
              const station = issue.kind === "machine"
                ? stations.find((s) => s.stationId === issue.id)
                : undefined;
              const canRepair = !!station?.needsRepair;
              return (
                <li key={`${issue.kind}:${issue.id}`}>
                  <div className="grow">
                    <strong>{issue.label}</strong>
                    <div className="small danger">{issue.reason}</div>
                  </div>
                  {canRepair ? (
                    <button
                      className="button num"
                      disabled={coins < (station?.repairCost ?? 0)}
                      onClick={() => onRepair(issue.id)}
                    >
                      Repair · {formatCoins(station!.repairCost)}
                    </button>
                  ) : (
                    <span className="small muted">{issue.kind}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ul className="upgrade-list">
          {staff.map((row) => (
            <li key={row.roleId}>
              <div className="grow">
                <strong>{row.name}</strong>
                <div className="small">{row.roleKind} · {row.hired}/{row.maxHired} hired</div>
                {row.reason && <div className="small danger">{row.reason}</div>}
              </div>
              <button className="button num" disabled={!row.purchasable} onClick={() => onHire(row.roleId)}>{formatCoins(row.cost)}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MessageTicker({ host }: { host: GameHost }) {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => host.onMessage((text) => setMessage({ text, id: Date.now() })), [host]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 1800);
    return () => clearTimeout(t);
  }, [message]);
  return message ? <div className="toast" role="status" key={message.id}>{message.text}</div> : null;
}

/** Portrait gameplay is later scope (blueprint "Responsive layout"): suggest rotating. */

function CenterCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="center">
      <div className="panel center-card">
        <h2 className={danger ? "danger" : undefined}>{title}</h2>
        <p>{children}</p>
      </div>
    </div>
  );
}

function formatRushSeconds(ticksRemaining: number): number {
  return Math.ceil(ticksRemaining / 20);
}

/** Compact notation for display only; stored values keep full precision. */
export function formatCoins(c: number): string {
  if (c >= 1e9) return `${(c / 1e9).toFixed(1)}B`;
  if (c >= 1e6) return `${(c / 1e6).toFixed(1)}M`;
  if (c >= 1e4) return `${(c / 1e3).toFixed(1)}K`;
  return String(c);
}
