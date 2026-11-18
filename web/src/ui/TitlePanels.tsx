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
import { formatCoins } from "./hudFormat";
import { BrandMark, CenterCard } from "./HudPrimitives";
import { WEB_E2E_IDS } from "../e2e/webE2eIds";

export function TitleScreen({ host, state }: { host: GameHost; state: Extract<HostState, { status: "title" }> }) {
  const startNew = () => {
    if (state.hasSave && !window.confirm("Start a new game? Your saved harbor will be erased.")) return;
    void host.newGame();
  };
  if (state.cloudConflict) {
    return <CloudConflictPanel host={host} conflict={state.cloudConflict} />;
  }
  if (state.localRecovery) {
    return <LocalRecoveryPanel host={host} recovery={state.localRecovery} />;
  }
  if (!state.settings.analyticsConsentDecided) {
    return (
      <div className="center">
        <div className="panel center-card title-card" role="dialog" aria-modal="true" aria-label="Analytics consent">
          <BrandMark className="title-brand" />
          <h1 className="title-wordmark" data-testid={WEB_E2E_IDS.TITLE_BRAND}>Fish Shopping</h1>
          <p className="title-tagline">Help improve the game with privacy-safe analytics?</p>
          <p className="small muted" style={{ maxWidth: 320, margin: "0 auto 12px" }}>
            Events cover tutorial steps, first sale, harbor unlocks, offline claims, save recovery, and frame timing.
            No account ids, positions, bag contents, or full saves are ever sent. You can change this later in Settings.
          </p>
          <div className="title-actions">
            <button
              className="button"
              data-testid={WEB_E2E_IDS.TITLE_ANALYTICS_ALLOW}
              onClick={() => host.setAnalyticsConsent(true)}
            >
              Allow analytics
            </button>
            <button
              className="button ghost"
              data-testid={WEB_E2E_IDS.TITLE_ANALYTICS_DECLINE}
              onClick={() => host.setAnalyticsConsent(false)}
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="center" data-testid={WEB_E2E_IDS.TITLE_ROOT}>
      <div className="panel center-card title-card" role="dialog" aria-label="Fish Shopping">
        <BrandMark className="title-brand" />
        <h1 className="title-wordmark" data-testid={WEB_E2E_IDS.TITLE_BRAND}>Fish Shopping</h1>
        <p className="title-tagline">Catch, cut, sell — run your harbor market</p>
        <div className="title-actions">
          {state.hasSave ? (
            <>
              <button
                className="button"
                data-testid={WEB_E2E_IDS.TITLE_CONTINUE}
                onClick={() => void host.continueGame()}
              >
                Continue
              </button>
              <button
                className="button ghost"
                data-testid={WEB_E2E_IDS.TITLE_NEW_GAME}
                onClick={startNew}
              >
                New Game
              </button>
            </>
          ) : (
            <button className="button" data-testid={WEB_E2E_IDS.TITLE_PLAY} onClick={startNew}>
              Play
            </button>
          )}
        </div>
        {!state.hasSave && (
          <p className="title-funnel-hint">First session: fish → cut → stock → sell</p>
        )}
      </div>
    </div>
  );
}

export function SnapshotChoiceCard({ row }: { row: SnapshotChoiceRow }) {
  return (
    <div className={`snapshot-choice${row.recommended ? " recommended" : ""}`}>
      <div className="snapshot-choice-head">
        <strong>{row.sourceLabel}</strong>
        {row.recommended ? <span className="small muted">Recommended</span> : null}
      </div>
      <div className="num">{row.harborName}</div>
      <div className="num">{formatCoins(row.coins)} coins · {row.playtimeLabel} play</div>
      <div className="small muted">{row.savedAtLabel}</div>
    </div>
  );
}

export function CloudConflictPanel({ host, conflict }: { host: GameHost; conflict: CloudConflictView }) {
  const recommendedRemote = conflict.recommended === "remote";
  return (
    <div className="center">
      <div className="panel center-card" role="dialog" aria-modal="true" aria-label="Choose a save">
        <h2>Choose a save</h2>
        <p className="small muted">
          This device and the cloud both have valid saves that differ ({conflict.reason}).
        </p>
        <div className="snapshot-choice-list">
          <SnapshotChoiceCard row={conflict.local} />
          <SnapshotChoiceCard row={conflict.remote} />
        </div>
        <div className="title-actions">
          <button
            className="button"
            onClick={() => void host.resolveCloudConflict(recommendedRemote ? "remote" : "local")}
          >
            {recommendedRemote ? "Use cloud (recommended)" : "Use this device (recommended)"}
          </button>
          <button
            className="button ghost"
            onClick={() => void host.resolveCloudConflict(recommendedRemote ? "local" : "remote")}
          >
            {recommendedRemote ? "Use this device instead" : "Use cloud instead"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LocalRecoveryPanel({ host, recovery }: { host: GameHost; recovery: LocalRecoveryView }) {
  return (
    <div className="center">
      <div className="panel center-card" role="dialog" aria-modal="true" aria-label="Recover save">
        <h2>Recover save</h2>
        <p className="small muted">{recovery.reason}</p>
        <div className="snapshot-choice-list">
          <SnapshotChoiceCard row={recovery.previous} />
        </div>
        <div className="title-actions">
          <button className="button" onClick={() => void host.confirmLocalRecovery()}>
            Recover previous backup
          </button>
          <button className="button ghost" onClick={() => host.dismissLocalRecovery()}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

