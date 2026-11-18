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

export function ContractsPanel({ unlocked, lockedReason, offers, active, refreshTicksLeft, failStreak, failStreakThreshold, onAccept, onDeliver, onClose }: {
  unlocked: boolean;
  lockedReason: string | null;
  offers: ContractOfferView[];
  active: ActiveContractView[];
  refreshTicksLeft: number;
  failStreak: number;
  failStreakThreshold: number;
  onAccept: (offerId: string) => void;
  onDeliver: (contractId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("nav.jobs")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="grow">
            <h2>{t("nav.jobs")}</h2>
            {unlocked && refreshTicksLeft > 0 && (
              <div className="small muted">Board refreshes in {formatRushSeconds(refreshTicksLeft)}s</div>
            )}
            {unlocked && failStreak > 0 && (
              <div
                className={`small ${failStreak >= failStreakThreshold ? "danger" : "muted"}`}
                role="status"
                aria-label={t("a11y.failStreak", { count: failStreak })}
              >
                {t("a11y.failStreak", { count: failStreak })}
                {failStreak >= failStreakThreshold ? " · board pressure on" : ""}
              </div>
            )}
          </div>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
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
                  {job.chainId && (
                    <div className="small muted">Chain step {job.chainStep}/{job.chainLength}</div>
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
                  {offer.chainId && (
                    <div className="small muted">Delivery chain · {offer.chainLength} steps</div>
                  )}
                  {offer.requiresReputationBand != null && (
                    <div className="small muted">Needs reputation band {offer.requiresReputationBand}+</div>
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
