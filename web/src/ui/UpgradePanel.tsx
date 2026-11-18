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

export function UpgradePanel({ upgrades, coins, onBuy, onClose }: {
  upgrades: UpgradeView[]; coins: number; onBuy: (id: string) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div
        className="panel sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("panels.upgrades")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{t("panels.upgrades")}</h2>
          <span className="num">{t("common.coins", { count: formatCoins(coins) })}</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <ul className="upgrade-list" aria-label={t("a11y.upgradesSection")}>
          {upgrades.map((u) => (
            <li key={u.id}>
              <div className="grow">
                <strong>{u.name}</strong>
                <div className="small">{u.description}</div>
                {u.reason && <div className="small danger">{u.reason}</div>}
              </div>
              {u.owned ? <span className="owned">{t("upgrades.owned")}</span> : (
                <button className="button num" disabled={!u.purchasable} onClick={() => onBuy(u.id)}>{formatCoins(u.cost)}</button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
