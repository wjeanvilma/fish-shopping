import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import sceneUrl from "../../../shared/assets/models/sunrise_pier_blockout.glb?url";
import type { ContextCard, SimView, UpgradeView } from "../engine";
import { GameHost, type HostState } from "../game/GameHost";
import { HarborScene, hasWebGL2 } from "../render/HarborScene";
import { Joystick } from "./Joystick";

/** The harbor is the home screen; panels open over it (blueprint "Navigation rules"). */
export function App() {
  const [host] = useState(() => new GameHost());
  const state = useSyncExternalStore(host.subscribe, host.getState);
  const [webgl2] = useState(hasWebGL2);

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
      <Hud host={host} state={state} />
      <MessageTicker host={host} />
      <RotateHint />
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

    const resize = () => scene.resize(canvas.clientWidth, canvas.clientHeight);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const loop = (now: number) => {
      host.frame(now);
      scene.render(now, host.latestView);
      raf = requestAnimationFrame(loop);
    };
    const onVisibility = () => (document.hidden ? host.pause() : host.resume());
    const onPageHide = () => host.pause();

    void (async () => {
      await Promise.all([host.start(), scene.load(sceneUrl)]);
      if (disposed) return;
      host.resume();
      raf = requestAnimationFrame(loop);
    })();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      host.pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
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
  const [touch, setTouch] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);

  // Keyboard: WASD / arrows move, U opens upgrades, Escape closes the panel.
  useEffect(() => {
    const held = new Set<string>();
    const apply = () => {
      let x = 0, y = 0;
      held.forEach((k) => { const d = KEY_DIRS[k]; if (d) { x += d[0]; y += d[1]; } });
      host.setMove(Math.sign(x), Math.sign(y));
    };
    const down = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;
      if (e.code === "Escape") { host.setUpgradesOpen(false); return; }
      if (e.code === "KeyU" && !e.repeat) { host.setUpgradesOpen(!upgradesOpen); return; }
      if ((e.code === "Space" || e.code === "KeyF") && !e.repeat) { e.preventDefault(); host.reel(); return; }
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
  }, [host, upgradesOpen]);

  useEffect(() => {
    const onTouch = () => setTouch(true);
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, []);

  if (state.status === "loading") return <CenterCard title="Loading harbor...">Preparing Sunrise Pier.</CenterCard>;
  if (state.status === "failed") return <CenterCard title="Something went wrong" danger>{state.message}</CenterCard>;

  const v = state.view;
  return (
    <div className="hud">
      <div className="pill top-left">{v.harborName}</div>
      <div className="pill coins top-center" aria-live="polite">{formatCoins(v.coins)} coins</div>
      <button className="button top-right" onClick={() => host.setUpgradesOpen(true)}>
        Upgrades <kbd>U</kbd>
      </button>
      {v.tutorialText && (
        <div className="panel objective">
          <div className="eyebrow">Next</div>
          <div>{v.tutorialText}</div>
        </div>
      )}
      {touch ? (
        <Joystick className="joystick" onMove={(x, y) => host.setMove(x, y)} />
      ) : (
        <div className="panel keys-hint">Move with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys</div>
      )}
      {v.context && <StationCard card={v.context} />}
      {v.fishingCanReel && (
        <button
          className={`button reel ${v.fishingTimingWindow ? "hot" : ""}`}
          onClick={() => host.reel()}
        >
          {v.fishingTimingWindow ? "Reel!" : "Reel"} <kbd>F</kbd>
        </button>
      )}
      <CarryIndicator v={v} />
      {upgradesOpen && (
        <UpgradePanel upgrades={v.upgrades} coins={v.coins} onBuy={(id) => host.purchase(id)} onClose={() => host.setUpgradesOpen(false)} />
      )}
    </div>
  );
}

function StationCard({ card }: { card: ContextCard }) {
  return (
    <div className="panel station-card">
      <strong>{card.title}</strong>
      {card.lines.map((l) => <div key={l} className="num">{l}</div>)}
      {card.progress !== null && (
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(card.progress * 100)}>
          <div style={{ width: `${Math.min(100, Math.max(0, card.progress * 100))}%` }} />
        </div>
      )}
    </div>
  );
}

function CarryIndicator({ v }: { v: SimView }) {
  return (
    <div className="panel carry">
      <strong className="num">Bag {v.bagUsedUnits}/{v.bagCapacityUnits}</strong>
      {v.bag.length === 0 ? <div className="muted">Empty</div> : v.bag.map((i) => <div key={i.itemId} className="num">{i.count} x {i.name}</div>)}
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
function RotateHint() {
  return <div className="rotate-hint panel">Rotate your device to landscape to play.</div>;
}

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

/** Compact notation for display only; stored values keep full precision. */
export function formatCoins(c: number): string {
  if (c >= 1e9) return `${(c / 1e9).toFixed(1)}B`;
  if (c >= 1e6) return `${(c / 1e6).toFixed(1)}M`;
  if (c >= 1e4) return `${(c / 1e3).toFixed(1)}K`;
  return String(c);
}
