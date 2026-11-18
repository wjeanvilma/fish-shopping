import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { ActiveContractView, AutomationIssueView, BaitOfferView, BankView, BusinessDashboardView, ContextCard, ContractOfferView, CosmeticIapOfferView, DailyGoalView, DecorOfferView, HarborMapEntryView, OfflineReport, PrestigeView, QuestView, SeasonalEventBannerView, SimView, SpeciesBookView, StaffGearView, StaffHireView, StationView, TrophySetView, UpgradeView, WarehouseView, WorkerView } from "../engine";
import { VOLUME_STEPS } from "../audio/audioBus";
import type { GameSettings, JoystickScale, SaveStatusView } from "../game/settingsStore";
import { t } from "../i18n/strings";
import { GameHost, type HostState } from "../game/GameHost";
import type { CloudConflictView, LocalRecoveryView, SnapshotChoiceRow } from "../game/snapshotChoice";
import {
  accessibilityPreset,
  HUD_TEXT_SCALES,
  hudTextScaleLabel,
  statusShapeFor,
  statusShapeGlyph,
  type HudTextScale,
} from "../presenters/accessibility";
import { controlsHelpLine, desktopKeysHint, tapToMoveHint } from "../presenters/controlQa";
import { PRIVACY_PAGE_PATH, SUPPORT_PAGE_PATH, STORE_SHORT_DESCRIPTION } from "../store/listing";
import { SUPPORT_RESTORE_HELP } from "../engine/supportRunbook";
import {
  LICENSES_SCREEN_INTRO,
  LICENSES_SCREEN_TITLE,
  licensesCatalog,
  ossHeadline,
} from "../store/licenses";
import { formatAwayDuration, formatCoins, formatRushSeconds, prestigeRewardBits } from "./hudFormat";

export function StationCard({
  card, stations, shapeCues, onOpen, onCycleRecipe,
}: {
  card: ContextCard;
  stations: StationView[];
  shapeCues: boolean;
  onOpen: () => void;
  onCycleRecipe?: () => void;
}) {
  const station = card.stationId ? stations.find((s) => s.stationId === card.stationId) : undefined;
  const shape = station && shapeCues ? statusShapeGlyph(statusShapeFor(station.status)) : null;
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
      <strong>
        {shape ? <span className="status-shape" aria-hidden="true">{shape} </span> : null}
        {card.title}
      </strong>
      {station && shapeCues && (
        <div className="small muted status-shape-line">
          <span className="status-shape" aria-hidden="true">{statusShapeGlyph(statusShapeFor(station.status))}</span>
          {" "}{station.statusText}
        </div>
      )}
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

export function TimingMeter({
  progress01, goodStart, goodEnd, perfectStart, perfectEnd, tier,
}: {
  progress01: number;
  goodStart: number;
  goodEnd: number;
  perfectStart: number;
  perfectEnd: number;
  tier: "perfect" | "good" | null;
}) {
  const pct = Math.min(100, Math.max(0, progress01 * 100));
  return (
    <div
      className={`timing-meter${tier ? ` tier-${tier}` : ""}`}
      role="meter"
      aria-label="Reel timing"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={tier === "perfect" ? "Perfect window" : tier === "good" ? "Good window" : "Outside window"}
    >
      <div className="timing-band good" style={{ left: `${goodStart * 100}%`, width: `${(goodEnd - goodStart) * 100}%` }} />
      <div className="timing-band perfect" style={{ left: `${perfectStart * 100}%`, width: `${(perfectEnd - perfectStart) * 100}%` }} />
      <div className="timing-needle" style={{ left: `${pct}%` }} />
    </div>
  );
}

export function CarryIndicator({ v, onOpen }: { v: SimView; onOpen: () => void }) {
  return (
    <button type="button" className="panel carry" onClick={onOpen} aria-label={`Bag ${v.bagUsedUnits} of ${v.bagCapacityUnits}`}>
      <strong className="num">Bag {v.bagUsedUnits}/{v.bagCapacityUnits}</strong>
      {v.bag.length === 0 ? <div className="muted">Empty</div> : v.bag.map((i) => <div key={i.itemId} className="num">{i.count} x {i.name}</div>)}
    </button>
  );
}

export function MessageTicker({ host, enabled }: { host: GameHost; enabled: boolean }) {
  const [message, setMessage] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => host.onMessage((text) => {
    if (!enabled) return;
    setMessage({ text, id: Date.now() });
  }), [host, enabled]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 1800);
    return () => clearTimeout(t);
  }, [message]);
  if (!enabled || !message) return null;
  return <div className="toast" role="status" aria-live="polite" key={message.id}>{message.text}</div>;
}
