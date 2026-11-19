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
import { WEB_E2E_IDS } from "../e2e/webE2eIds";
import { formatAwayDuration, formatCoins, formatRushSeconds, prestigeRewardBits } from "./hudFormat";

export function WarehousePanel({ warehouse, onClose }: { warehouse: WarehouseView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="panel sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("panels.warehouse")}
        data-testid={WEB_E2E_IDS.WAREHOUSE_PANEL}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{t("panels.warehouse")}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <div className="small muted num" aria-label={t("a11y.warehouseSection")}>
          {t("warehouse.availableReserved", {
            available: warehouse.available,
            reserved: warehouse.reserved,
            total: warehouse.quantity,
          })}
        </div>
        {!warehouse.reconcileOk && (
          <div className="small danger" role="alert">
            Inventory mismatch{warehouse.reconcileError ? `: ${warehouse.reconcileError}` : ""}
          </div>
        )}
        {warehouse.empty ? (
          <p className="muted">{t("warehouse.empty")}</p>
        ) : (
          <ul className="upgrade-list">
            {warehouse.lines.map((line) => (
              <li key={line.itemId}>
                <div className="grow">
                  <strong>{line.name}</strong>
                  <div className="small num">
                    {line.available} available
                    {line.reserved > 0 ? ` · ${line.reserved} reserved` : ""}
                    {` · ${line.quantity} total`}
                  </div>
                  {!line.reconcileOk && (
                    <div className="small danger">Location totals do not match</div>
                  )}
                  <div className="small muted">
                    {line.locations.map((loc) => (
                      <div key={loc.id}>
                        {loc.label}: {loc.available}
                        {loc.reserved > 0 ? ` (${loc.reserved} reserved)` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function HarborMapPanel({ harbors, fullHarborUnlock, onTravel, onUnlockAll, onRestoreUnlock, onClose }: {
  harbors: HarborMapEntryView[];
  fullHarborUnlock: boolean;
  onTravel: (harborId: string) => void;
  onUnlockAll: () => void;
  onRestoreUnlock: () => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("panels.map")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t("panels.map")}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
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
        <div className="small muted" style={{ marginTop: 12 }}>
          Sunrise Pier is free. Full unlock opens every harbor — access only, no rate boosts.
        </div>
        <div className="quality-row" style={{ marginTop: 8 }}>
          {fullHarborUnlock ? (
            <span className="small reward">All harbors unlocked</span>
          ) : (
            <button className="button" onClick={onUnlockAll}>Unlock all harbors</button>
          )}
          <button className="button ghost" onClick={onRestoreUnlock}>Restore purchase</button>
        </div>
      </div>
    </div>
  );
}
