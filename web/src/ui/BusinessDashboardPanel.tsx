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

export function BusinessDashboardPanel({
  dash,
  journalLines,
  onClose,
}: {
  dash: BusinessDashboardView;
  journalLines?: string[];
  onClose: () => void;
}) {
  const offlineLines = journalLines?.length ? journalLines : dash.offlineJournalLines;
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("panels.dashboard")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t("panels.dashboard")}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <div className="small muted num">
          Session {dash.sessionLabel} · rates {dash.rateIntervalLabel}
        </div>
        <div className="small muted">Committed sales only — wallet coins are not counted as revenue.</div>
        {dash.dailyLoginStreak > 0 && (
          <div className="small reward">Harbor streak: {dash.dailyLoginStreak} day{dash.dailyLoginStreak === 1 ? "" : "s"}</div>
        )}
        {dash.empty && (
          <p className="muted">No committed sales yet — serve customers or complete a contract.</p>
        )}
        <ul className="upgrade-list">
          {dash.dailyGoals.map((g) => (
            <li key={g.objectiveId}>
              <div className="grow">
                <strong>{g.name}</strong>
                <div className="small">{g.description}</div>
                <div className="small muted">{g.progress}/{g.target} · reward {formatCoins(g.rewardCoins)}</div>
              </div>
              <span className={g.claimed ? "owned" : g.complete ? "num" : "muted"}>
                {g.claimed ? "Claimed" : g.complete ? "Ready" : "Daily"}
              </span>
            </li>
          ))}
          {offlineLines.length > 0 && offlineLines.map((line) => (
            <li key={line}>
              <div className="grow"><div className="small">{line}</div></div>
            </li>
          ))}
          {!dash.empty && (
            <>
              <li>
                <div className="grow">
                  <strong>Committed revenue</strong>
                  <div className="small num">
                    {formatCoins(dash.committedRevenue)} sales
                    {dash.contractRevenue > 0 ? ` · ${formatCoins(dash.contractRevenue)} contracts` : ""}
                  </div>
                  <div className="small muted">
                    {dash.salesCount} sales · {dash.itemsSold} items
                    {` · ${formatCoins(dash.revenuePerMinute)} ${dash.rateIntervalLabel}`}
                  </div>
                </div>
                <span className="num">{formatCoins(dash.committedRevenue + dash.contractRevenue)}</span>
              </li>
              <li>
                <div className="grow">
                  <strong>Abandon rate</strong>
                  <div className="small muted">{dash.lostCustomers} lost customers</div>
                </div>
                <span className="num">{Math.trunc(dash.abandonPermille / 10)}%</span>
              </li>
              <li>
                <div className="grow">
                  <strong>Wage ratio</strong>
                  <div className="small muted">{formatCoins(dash.wagesPaid)} wages vs sales revenue</div>
                </div>
                <span className="num">{Math.trunc(dash.wageRatioPermille / 10)}%</span>
              </li>
              <li>
                <div className="grow">
                  <strong>{t("dashboard.operatingCosts")}</strong>
                  <div className="small muted">
                    {formatCoins(dash.wagesPaid)} wages
                    {dash.maintenancePaid > 0 ? ` · ${formatCoins(dash.maintenancePaid)} upkeep` : ""}
                    {dash.repairSpent > 0 ? ` · ${formatCoins(dash.repairSpent)} repairs` : ""}
                  </div>
                </div>
                <span className="num">{formatCoins(dash.operatingCosts)}</span>
              </li>
              <li>
                <div className="grow">
                  <strong>{t("dashboard.netOperating")}</strong>
                  <div className="small muted">
                    Committed sales − wages/upkeep/repairs
                    {dash.itemsSpoiled > 0 ? ` · ${dash.itemsSpoiled} spoiled` : ""}
                    {dash.loanInterestAccrued > 0 ? ` · ${formatCoins(dash.loanInterestAccrued)} loan interest` : ""}
                    {dash.loanCollected > 0 ? ` · ${formatCoins(dash.loanCollected)} loan collected` : ""}
                  </div>
                </div>
                <span className="num">{formatCoins(dash.netOperatingProfit)}</span>
              </li>
              <li>
                <div className="grow">
                  <strong>{t("dashboard.marketTip")}</strong>
                  <div className="small muted">
                    Scarcity tip {Math.trunc(dash.activeScarcityTipPermille / 10)}%
                    {dash.reputationLabel ? ` · reputation ${dash.reputationLabel}` : ""}
                  </div>
                </div>
                <span className="num">{Math.trunc(dash.reputationScorePermille / 10)}%</span>
              </li>
              <li>
                <div className="grow">
                  <strong>Sales pace</strong>
                  <div className="small muted">{dash.rateIntervalLabel}</div>
                </div>
                <span className="num">{dash.salesPerMinute}/min</span>
              </li>
              {dash.topSpecies.map((sp) => (
                <li key={sp.speciesId}>
                  <div className="grow">
                    <strong>{sp.name}</strong>
                    <div className="small muted">{sp.catches} catches</div>
                  </div>
                  <span className="num">{Math.trunc(sp.sharePermille / 10)}%</span>
                </li>
              ))}
            </>
          )}
          {(dash.loansTaken > 0 || dash.loanOwed > 0 || dash.coinGoal > 0 || dash.ledgerLines.length > 0) && (
            <>
              <li>
                <div className="grow">
                  <strong>{t("dashboard.loanBook")}</strong>
                  <div className="small muted">
                    {formatCoins(dash.loanOwed)} owed
                    {` · ${dash.loansTaken} taken · ${formatCoins(dash.loanRepaid)} repaid`}
                  </div>
                </div>
                <span className="num">{formatCoins(dash.loanOwed)}</span>
              </li>
              <li>
                <div className="grow">
                  <strong>{t("dashboard.coinGoalProgress")}</strong>
                  <div className="small muted">
                    {dash.coinGoal > 0
                      ? `${formatCoins(dash.coinGoal)} target · ${Math.trunc(dash.coinGoalProgressPermille / 10)}%`
                      : "No coin goal set"}
                  </div>
                </div>
                <span className="num">{Math.trunc(dash.coinGoalProgressPermille / 10)}%</span>
              </li>
              <li>
                <div className="grow">
                  <strong>{t("dashboard.ledgerCashflow")}</strong>
                  <div className="small muted">
                    {t("dashboard.contractShare")} {Math.trunc(dash.contractRevenueSharePermille / 10)}%
                  </div>
                </div>
                <span className="num">{formatCoins(dash.ledgerNetCashflow)}</span>
              </li>
              {dash.ledgerLines.length > 0 && (
                <li aria-label={t("a11y.dashboardLedgerSection")} data-testid={WEB_E2E_IDS.DASH_LEDGER}>
                  <div className="grow">
                    <strong>{t("dashboard.pierLedger")}</strong>
                    <div className="small muted">{t("a11y.dashboardLedgerSection")}</div>
                    {dash.ledgerLines.map((line) => (
                      <div key={line} className="small muted num">{line}</div>
                    ))}
                  </div>
                </li>
              )}
            </>
          )}
          {dash.bottlenecks.length === 0 ? (
            <li>
              <div className="grow">
                <strong>Bottlenecks</strong>
                <div className="small muted">None right now</div>
              </div>
              <span className="owned">Clear</span>
            </li>
          ) : (
            dash.bottlenecks.map((b) => (
              <li key={`${b.kind}:${b.id}`}>
                <div className="grow">
                  <strong>{b.label}</strong>
                  <div className="small danger">{b.reason}</div>
                  <div className="small muted">{b.kind}</div>
                </div>
                <span className="num">Issue</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
