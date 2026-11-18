/**
 * Cozy art pass 5 — redesigned HUD chrome + new play modes.
 *
 *  - HarborChip: harbor name, rating and a compact time/weather line with icons.
 *  - HudToolbar: wide screens get one tidy row of icon buttons; narrow / portrait screens
 *    get Upgrades + a Menu button that opens MenuDrawer (no more wrapping button wall).
 *  - PhotoModeOverlay: hides the HUD, orbit/zoom camera, time-of-day scrubber, save/share PNG.
 *  - DecorModeOverlay: pick an owned decor item, drag a ghost preview, rotate, place or store.
 *
 * Presentation + intent only: every rule (ownership, placement validity) lives in the engine.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { DecorOfferView, SimView } from "../engine";
import type { GameHost } from "../game/GameHost";
import { CameraRig } from "../game/cameraRig";
import { WEB_E2E_IDS } from "../e2e/webE2eIds";
import { t } from "../i18n/strings";
import { atmosphereFrame } from "../render/atmosphere";
import { sceneBridge } from "../render/sceneBridge";

// --------------------------------------------------------------------------- icons

const ICONS: Record<string, string> = {
  pause: "M7 5h3v14H7zM14 5h3v14h-3z",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  warehouse: "M3 9l9-5 9 5v11H3zM7 20v-6h10v6M7 14h10",
  goals: "M6 21V4M6 4h11l-2 4 2 4H6",
  jobs: "M8 4h8v3H8zM6 6h12v15H6zM9 11h6M9 15h4",
  staff: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M19 20c0-2.5-1-4.4-3-5.4",
  dash: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  upgrades: "M12 4l7 7h-4v9H9v-9H5z",
  photo: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  decor: "M12 3v4M12 7c-3 0-5 2-5 5h10c0-3-2-5-5-5zM9 12v3l3 6 3-6v-3",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6L6 18",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  cloud: "M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z",
  rain: "M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3",
  fog: "M4 9h16M2 13h20M4 17h16",
  wind: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7",
  rotate: "M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5",
  store: "M4 7h16v13H4zM4 7l2-3h12l2 3M9 12h6",
  check: "M5 12l5 5L20 7",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  share: "M12 3v12M8 7l4-4 4 4M5 13v7h14v-7",
};

export function Icon({ name, size = 20 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={ICONS[name] ?? ICONS.goals} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function weatherIconName(weatherId: string): string {
  if (weatherId.includes("gale")) return "wind";
  if (weatherId.includes("rain")) return "rain";
  if (weatherId.includes("fog")) return "fog";
  if (weatherId.includes("overcast")) return "cloud";
  return "sun";
}

export function dayIconName(dayPartId: string): string {
  return dayPartId === "night" || dayPartId === "dusk" ? "moon" : "sun";
}

// --------------------------------------------------------------------------- top bar

export function HarborChip({ v, portrait }: { v: SimView; portrait: boolean }) {
  const rep = Math.trunc(v.reputationScorePermille / 10);
  return (
    <div className="pill top-left harbor-chip" title={v.harborSpecializationDescription ?? undefined}>
      <div className="harbor-chip-title">
        <span className="harbor-name">{v.harborName}</span>
        {v.harborRating > 0 ? <span className="rating" aria-label={`${v.harborRating} star harbor`}>{"★".repeat(v.harborRating)}</span> : null}
        <span className="rep" title={`${v.reputationLabel} · ${rep}%`}>Rep {rep}%</span>
      </div>
      <div
        className="harbor-chip-meta day-part"
        role="status"
        aria-live="polite"
        aria-label={`${t("hud.weatherTide")}: ${v.dayPartName}, ${v.weatherName}, ${v.tidePhaseName}`}
        title={`${v.weatherDescription} · ${v.tidePhaseName}`}
      >
        <span className="meta-item"><Icon name={dayIconName(v.dayPartId)} size={14} />{v.dayPartName}</span>
        <span className="meta-item"><Icon name={weatherIconName(v.weatherId)} size={14} />{v.weatherName}</span>
        {!portrait && <span className="meta-item muted">{v.tidePhaseName}</span>}
        {!portrait && v.harborSpecializationName ? <span className="meta-item muted spec">{v.harborSpecializationName}</span> : null}
      </div>
    </div>
  );
}

export function CoinsPill({ coins, label }: { coins: string; label: string }) {
  return (
    <div className="pill coins top-coins" aria-live="polite">
      <Icon name="coin" size={18} />
      <span className="num">{coins}</span>
      <span className="coins-label">{label}</span>
    </div>
  );
}

interface NavItem {
  id: string;
  testId: string;
  icon: string;
  label: string;
  key?: string;
  onClick: () => void;
}

export function navItems(host: GameHost, onPhoto: () => void, onDecor: () => void): NavItem[] {
  return [
    { id: "pause", testId: WEB_E2E_IDS.NAV_PAUSE, icon: "pause", label: t("nav.pause"), key: "P", onClick: () => host.setPauseOpen(true) },
    { id: "map", testId: WEB_E2E_IDS.NAV_MAP, icon: "map", label: t("nav.map"), key: "M", onClick: () => host.setMapOpen(true) },
    { id: "warehouse", testId: WEB_E2E_IDS.NAV_WAREHOUSE, icon: "warehouse", label: t("nav.warehouse"), key: "I", onClick: () => host.setWarehouseOpen(true) },
    { id: "goals", testId: WEB_E2E_IDS.NAV_GOALS, icon: "goals", label: t("nav.goals"), key: "G", onClick: () => host.setQuestsOpen(true) },
    { id: "jobs", testId: WEB_E2E_IDS.NAV_JOBS, icon: "jobs", label: t("nav.jobs"), key: "J", onClick: () => host.setContractsOpen(true) },
    { id: "staff", testId: WEB_E2E_IDS.NAV_STAFF, icon: "staff", label: t("nav.staff"), key: "H", onClick: () => host.setStaffOpen(true) },
    { id: "dash", testId: WEB_E2E_IDS.NAV_DASH, icon: "dash", label: t("nav.dash"), key: "Y", onClick: () => host.setDashboardOpen(true) },
    { id: "decor", testId: WEB_E2E_IDS.NAV_DECOR, icon: "decor", label: "Decorate", key: "K", onClick: onDecor },
    { id: "photo", testId: WEB_E2E_IDS.NAV_PHOTO, icon: "photo", label: "Photo", key: "O", onClick: onPhoto },
    { id: "upgrades", testId: WEB_E2E_IDS.NAV_UPGRADES, icon: "upgrades", label: t("nav.upgrades"), key: "U", onClick: () => host.setUpgradesOpen(true) },
  ];
}

/** Wide: one row of icon buttons. Compact: Upgrades + Menu (opens MenuDrawer). */
export function HudToolbar({
  items, compact, onMenu, ariaLabel,
}: { items: NavItem[]; compact: boolean; onMenu: () => void; ariaLabel: string }) {
  const upgrades = items.find((i) => i.id === "upgrades")!;
  return (
    <div
      className={`top-actions hud-toolbar${compact ? " compact" : ""}`}
      role="toolbar"
      aria-label={ariaLabel}
      data-testid={WEB_E2E_IDS.HUD_TOOLBAR}
    >
      {compact ? (
        <>
          <button className="button icon-button" onClick={upgrades.onClick} aria-label={upgrades.label} title={upgrades.label}>
            <Icon name="upgrades" />
          </button>
          <button className="button icon-button menu-button" onClick={onMenu} aria-label="Menu" data-testid={WEB_E2E_IDS.NAV_MENU}>
            <Icon name="menu" />
          </button>
        </>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            className={`button tool-button${item.id === "upgrades" ? " primary" : ""}`}
            data-testid={item.testId}
            onClick={item.onClick}
            title={item.key ? `${item.label} (${item.key})` : item.label}
          >
            <Icon name={item.icon} />
            <span className="tool-label">{item.label}</span>
          </button>
        ))
      )}
    </div>
  );
}

export function MenuDrawer({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return (
    <div className="scrim menu-scrim" onClick={onClose}>
      <div className="panel menu-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Harbor menu</h2>
          <button className="button ghost icon-button" onClick={onClose} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <div className="menu-grid">
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={i === 0 ? firstRef : undefined}
              className="menu-tile"
              data-testid={item.testId}
              onClick={() => { onClose(); item.onClick(); }}
            >
              <span className="menu-tile-icon"><Icon name={item.icon} size={24} /></span>
              <span className="menu-tile-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BannerStack({ children }: { children: ReactNode }) {
  return <div className="hud-banners">{children}</div>;
}

// --------------------------------------------------------------------------- photo mode

function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(",");
  const mime = /data:([^;]+)/.exec(head ?? "")?.[1] ?? "image/png";
  const bin = atob(b64 ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function PhotoModeOverlay({ v, host, onExit }: { v: SimView; host: GameHost; onExit: () => void }) {
  const [timeOverride, setTimeOverride] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const exitRef = useRef(onExit);
  exitRef.current = onExit;

  useEffect(() => {
    host.setWorldHold(true);
    sceneBridge.scene?.setPhotoMode(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "KeyO") { e.preventDefault(); e.stopPropagation(); exitRef.current(); }
      if (e.code === "ArrowLeft") sceneBridge.scene?.orbitPhoto(-0.08, 0, 0);
      if (e.code === "ArrowRight") sceneBridge.scene?.orbitPhoto(0.08, 0, 0);
      if (e.code === "ArrowUp") sceneBridge.scene?.orbitPhoto(0, 0.05, 0);
      if (e.code === "ArrowDown") sceneBridge.scene?.orbitPhoto(0, -0.05, 0);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      const scene = sceneBridge.scene;
      if (scene) {
        scene.setPhotoMode(false);
        scene.photoAtmosphereOverride = null;
      }
      host.setWorldHold(false);
    };
  }, [host]);

  useEffect(() => {
    const scene = sceneBridge.scene;
    if (!scene) return;
    scene.photoAtmosphereOverride = timeOverride === null
      ? null
      : (a) => Object.assign(a, atmosphereFrame(timeOverride, v.weatherId));
  }, [timeOverride, v.weatherId]);

  const snap = async () => {
    const scene = sceneBridge.scene;
    if (!scene) return;
    const url = scene.capturePng();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 180);
    const name = `fish-shopping-${v.harborName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.png`;
    const blob = dataUrlToBlob(url);
    const file = typeof File !== "undefined" ? new File([blob], name, { type: "image/png" }) : null;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (file && nav.canShare?.({ files: [file] }) && typeof nav.share === "function") {
      try {
        await nav.share({ files: [file], title: "Fish Shopping", text: `My harbor: ${v.harborName}` });
        host.say("Photo shared");
        return;
      } catch {
        /* user cancelled share: fall back to download */
      }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    host.say("Photo saved");
  };

  return (
    <div
      className="photo-mode"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest(".photo-controls")) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }}
      onPointerMove={(e) => {
        const prev = pointers.current.get(e.pointerId);
        if (!prev) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size >= 2) {
          const [a, b] = [...pointers.current.values()];
          const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
          if (pinch.current !== null) sceneBridge.scene?.orbitPhoto(0, 0, (pinch.current - d) * 0.03);
          pinch.current = d;
          return;
        }
        sceneBridge.scene?.orbitPhoto((e.clientX - prev.x) * 0.008, (e.clientY - prev.y) * 0.005, 0);
      }}
      onPointerUp={(e) => { pointers.current.delete(e.pointerId); pinch.current = null; }}
      onPointerCancel={(e) => { pointers.current.delete(e.pointerId); pinch.current = null; }}
      onWheel={(e) => sceneBridge.scene?.orbitPhoto(0, 0, e.deltaY * 0.01)}
    >
      {flash && <div className="photo-flash" aria-hidden="true" />}
      <div className="photo-hint pill">Drag to orbit · scroll or pinch to zoom</div>
      <div className="photo-controls panel" role="toolbar" aria-label="Photo mode">
        <label className="photo-time">
          <span className="small">Time of day</span>
          <input
            type="range"
            min={0}
            max={999}
            value={timeOverride ?? v.dayProgressPermille}
            onChange={(e) => setTimeOverride(Number(e.target.value))}
            aria-label="Time of day"
          />
        </label>
        <button className="button ghost" onClick={() => setTimeOverride(null)} disabled={timeOverride === null}>Live</button>
        <button className="button snap-button" onClick={() => void snap()} data-testid={WEB_E2E_IDS.PHOTO_SNAP}>
          <Icon name="camera" /> Snap
        </button>
        <button className="button ghost" onClick={onExit} aria-label="Exit photo mode"><Icon name="close" /> Exit</button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- decorating

const shortOf = (id: string) => id.slice(id.indexOf(".") + 1);

export function DecorModeOverlay({
  v, host, onExit, onOpenShop,
}: { v: SimView; host: GameHost; onExit: () => void; onOpenShop: () => void }) {
  const owned: DecorOfferView[] = useMemo(() => v.decorOffers.filter((d) => d.status === "owned"), [v.decorOffers]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ xMm: number; zMm: number; rot: number }>(() => ({
    xMm: Math.round((v.player.xMm + 0) / 250) * 250,
    zMm: Math.round((v.player.zMm + 2000) / 250) * 250,
    rot: 0,
  }));
  const dragging = useRef(false);

  useEffect(() => {
    host.setWorldHold(true);
    return () => {
      sceneBridge.scene?.setDecorGhost(null);
      host.setWorldHold(false);
    };
  }, [host]);

  // Start from an item's current spot when picking something already placed.
  const pick = (id: string) => {
    setSelected(id);
    const placed = v.decorPlacements.find((p) => p.decorId === id);
    if (placed) setGhost({ xMm: placed.xMm, zMm: placed.zMm, rot: placed.rotationQuarter });
  };

  const problem = selected ? host.decorPlacementProblem(selected, ghost.xMm, ghost.zMm) : null;

  useEffect(() => {
    sceneBridge.scene?.setDecorGhost(selected ? shortOf(selected) : null, ghost.xMm, ghost.zMm, ghost.rot, problem === null);
  }, [selected, ghost, problem]);

  const place = () => {
    if (!selected || problem) return;
    host.placeDecor(selected, ghost.xMm, ghost.zMm, ghost.rot);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.code === "KeyK") { e.preventDefault(); e.stopPropagation(); onExit(); return; }
      if (!selected) return;
      const step = 250;
      if (e.code === "KeyR") setGhost((g) => ({ ...g, rot: (g.rot + 1) % 4 }));
      // Screen-relative nudges (camera looks toward +z; screen right = world -x).
      if (e.code === "ArrowLeft" || e.code === "KeyA") setGhost((g) => ({ ...g, xMm: g.xMm + step }));
      if (e.code === "ArrowRight" || e.code === "KeyD") setGhost((g) => ({ ...g, xMm: g.xMm - step }));
      if (e.code === "ArrowUp" || e.code === "KeyW") setGhost((g) => ({ ...g, zMm: g.zMm + step }));
      if (e.code === "ArrowDown" || e.code === "KeyS") setGhost((g) => ({ ...g, zMm: g.zMm - step }));
      if (e.code === "Enter") place();
      if (e.code.startsWith("Arrow") || ["KeyR", "KeyA", "KeyD", "KeyW", "KeyS", "Enter"].includes(e.code)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const moveGhostTo = (clientX: number, clientY: number) => {
    const canvas = sceneBridge.canvas;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const ndcX = ((clientX - r.left) / r.width) * 2 - 1;
    const ndcY = -(((clientY - r.top) / r.height) * 2 - 1);
    const hit = CameraRig.groundFromNdc(ndcX, ndcY, r.width / r.height, v.player.xMm, v.player.zMm);
    if (hit) setGhost((g) => ({ ...g, xMm: Math.round(hit.xMm / 250) * 250, zMm: Math.round(hit.zMm / 250) * 250 }));
  };

  const isPlaced = (id: string) => v.decorPlacements.some((p) => p.decorId === id);

  return (
    <div
      className="decor-mode"
      onPointerDown={(e) => {
        if (!selected || (e.target as HTMLElement).closest(".decor-tray")) return;
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        moveGhostTo(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => { if (dragging.current) moveGhostTo(e.clientX, e.clientY); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <div className="pill decor-hint" role="status" aria-live="polite">
        {!selected
          ? "Pick a decoration to place"
          : problem
            ? problem
            : "Tap or drag to move · R to rotate · Enter to place"}
      </div>
      <div className="panel decor-tray" role="dialog" aria-label="Decorate your harbor">
        <div className="sheet-header">
          <h2>Decorate</h2>
          <button className="button ghost icon-button" onClick={onExit} aria-label="Done decorating"><Icon name="check" /></button>
        </div>
        {owned.length === 0 ? (
          <div className="decor-empty">
            <p className="small muted">You don't own any decorations yet. Buy lanterns, flower boxes and flags under Goals → Decor.</p>
            <button className="button" onClick={onOpenShop}>Open Goals</button>
          </div>
        ) : (
          <div className="decor-list">
            {owned.map((d) => (
              <button
                key={d.id}
                className={`decor-item${selected === d.id ? " selected" : ""}`}
                onClick={() => pick(d.id)}
                aria-pressed={selected === d.id}
              >
                <span className="decor-name">{d.name}</span>
                <span className="small muted">{isPlaced(d.id) ? "Placed · tap to move" : "In storage"}</span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="decor-actions">
            <button className="button ghost" onClick={() => setGhost((g) => ({ ...g, rot: (g.rot + 1) % 4 }))}>
              <Icon name="rotate" /> Rotate
            </button>
            {isPlaced(selected) && (
              <button className="button ghost" onClick={() => { host.storeDecor(selected); setSelected(null); }}>
                <Icon name="store" /> Store
              </button>
            )}
            <button className="button primary" disabled={!!problem} onClick={place} data-testid={WEB_E2E_IDS.DECOR_PLACE}>
              <Icon name="check" /> {isPlaced(selected) ? "Move here" : "Place"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
