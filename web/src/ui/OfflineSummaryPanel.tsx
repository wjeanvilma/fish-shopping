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
import { WEB_E2E_IDS } from "../e2e/webE2eIds";

export function OfflineSummaryPanel({ report, onContinue }: { report: OfflineReport; onContinue: () => void }) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => continueRef.current?.focus(), []);
  const lines: string[] = [];
  if (report.coinsDelta !== 0) lines.push(`${report.coinsDelta > 0 ? "+" : ""}${formatCoins(report.coinsDelta)} coins`);
  if (report.sales > 0) lines.push(`${report.sales} sales`);
  if (report.workerFishCaught > 0) lines.push(`${report.workerFishCaught} fish caught by staff`);
  if (report.workerItemsMoved > 0) lines.push(`${report.workerItemsMoved} items moved by staff`);
  if (report.journalLines?.length) lines.push(...report.journalLines);
  if (lines.length === 0 && !report.hadActivity) lines.push("Quiet shift — hire staff to earn while away");
  return (
    <div className="scrim" data-testid={WEB_E2E_IDS.OFFLINE_ROOT}>
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
        <button
          ref={continueRef}
          className="button"
          style={{ width: "100%", marginTop: 12 }}
          data-testid={WEB_E2E_IDS.OFFLINE_CONTINUE}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
