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

export function BagDetailPanel({ v, onSelectBait, onSelectTechnique, onClose }: {
  v: SimView;
  onSelectBait: (baitId: string | null) => void;
  onSelectTechnique: (techniqueId: string | null) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const baitIds = new Set(v.baitOffers.map((b) => b.id));
  // Prefer catalog ids from pack via itemId prefix when kiosk offers empty.
  const isBait = (itemId: string) => itemId.startsWith("bait.") || baitIds.has(itemId);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("panels.bag")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t("panels.bag")}</h2>
          <span className="num">{v.bagUsedUnits}/{v.bagCapacityUnits}</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        {v.bagFishSpoilActive && <p className="small danger">Fish in your bag can spoil.</p>}
        {v.bagFishSpoilActive && v.ticksUntilBagSpoil != null && (
          <p className="small danger">
            Spoil in ~{Math.max(0, Math.floor(v.ticksUntilBagSpoil / 20))}s
            {v.bagSpoilPressurePermille > 1000 ? ` · pressure ${v.bagSpoilPressurePermille}` : ""}
          </p>
        )}
        {v.serviceQueuePressurePermille >= 700 && (
          <p className="small muted">
            Queue pressure {v.serviceQueuePressurePermille}
            {v.minPatienceTicksLeft != null ? ` · patience ${v.minPatienceTicksLeft}` : ""}
          </p>
        )}
        {v.nextQuestProgressPermille != null && v.nextQuestProgressPermille >= 800 && (
          <p className="small">Quest nearly done · {v.nextQuestProgressPermille}/1000</p>
        )}
        {v.preferredBaitId && (
          <p className="small">
            Preferred bait locked in.
            {" "}
            <button className="button ghost" onClick={() => onSelectBait(null)}>Use auto</button>
          </p>
        )}
        <div className="small muted" style={{ marginBottom: 8 }}>
          Rod technique · mastery {v.masteryGlobalLevel}
        </div>
        <ul className="upgrade-list" style={{ marginBottom: 12 }}>
          {v.techniques.map((tech) => (
            <li key={tech.id}>
              <div className="grow">
                <strong>{tech.name}</strong>
                <div className="small muted">{tech.description}</div>
                {!tech.unlocked && (
                  <div className="small">Unlocks at mastery {tech.requiresMasteryLevel}</div>
                )}
              </div>
              {tech.active ? (
                <span className="small reward">Active</span>
              ) : tech.unlocked ? (
                <button className="button ghost" onClick={() => onSelectTechnique(tech.id)}>Use</button>
              ) : (
                <span className="small muted">Locked</span>
              )}
            </li>
          ))}
        </ul>
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

export function BaitKioskPanel({ offers, preferredBaitId, coins, onBuy, onSelect, onClose }: {
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

export function StationDetailPanel({ card, stations, coins, onCycleRecipe, onSetPaused, onRepair, onBuildPlot, onClose }: {
  card: ContextCard;
  stations: StationView[];
  coins: number;
  onCycleRecipe?: () => void;
  onSetPaused: (stationId: string, paused: boolean) => void;
  onRepair: (stationId: string) => void;
  onBuildPlot?: (plotId: string) => void;
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
        {(onCycleRecipe || card.stationId || (onBuildPlot && card.plotId)) && (
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
            {onBuildPlot && card.plotId && card.plotCost != null && (
              <button
                className="button"
                disabled={!card.plotBuildable}
                onClick={() => onBuildPlot(card.plotId!)}
              >
                Build · {formatCoins(card.plotCost)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
