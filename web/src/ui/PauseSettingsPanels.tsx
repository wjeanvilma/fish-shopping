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

export function PausePanel({ onResume, onSettings, onTitle }: {
  onResume: () => void; onSettings: () => void; onTitle: () => void;
}) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => resumeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onResume}>
      <div
        className="panel sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("pause.title")}
        data-testid={WEB_E2E_IDS.PAUSE_ROOT}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{t("pause.title")}</h2>
        </div>
        <div className="title-actions">
          <button
            ref={resumeRef}
            className="button"
            data-testid={WEB_E2E_IDS.PAUSE_RESUME}
            onClick={onResume}
          >
            {t("pause.resume")}
          </button>
          <button
            className="button"
            data-testid={WEB_E2E_IDS.PAUSE_SETTINGS}
            onClick={onSettings}
          >
            {t("pause.settings")}
          </button>
          <button
            className="button ghost"
            data-testid={WEB_E2E_IDS.PAUSE_TITLE}
            onClick={onTitle}
          >
            {t("pause.titleScreen")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel({ settings, cloudAvailable, saveStatus, telemetryRates, analyticsAlertActive, achievements, unlockedAchievementsCount, onChange, onExportTelemetry, onExportBalance, onExportAnalyticsDashboard, onClose }: {
  settings: GameSettings;
  cloudAvailable: boolean;
  saveStatus: SaveStatusView;
  telemetryRates: SimView["telemetryRates"];
  analyticsAlertActive: boolean;
  achievements: SimView["achievements"];
  unlockedAchievementsCount: number;
  onChange: (partial: Partial<GameSettings>) => void;
  onExportTelemetry: () => string | null;
  onExportBalance: () => string | null;
  onExportAnalyticsDashboard: () => string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const [showLicenses, setShowLicenses] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  useEffect(() => closeRef.current?.focus(), [showLicenses, showAchievements]);
  const scales: JoystickScale[] = [0.75, 1, 1.25];
  const copyJson = async (label: string, json: string | null, emptyMsg: string) => {
    if (!json) { setExportNote(emptyMsg); return; }
    try {
      await navigator.clipboard.writeText(json);
      setExportNote(`${label} copied`);
    } catch {
      setExportNote(`Could not copy ${label.toLowerCase()}`);
    }
  };
  if (showAchievements) {
    return (
      <AchievementsPanel
        achievements={achievements}
        unlockedCount={unlockedAchievementsCount}
        closeRef={closeRef}
        onClose={() => setShowAchievements(false)}
        onDismiss={onClose}
      />
    );
  }
  if (showLicenses) {
    return (
      <div className="scrim" onClick={onClose}>
        <div
          className="panel sheet settings-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={LICENSES_SCREEN_TITLE}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sheet-header">
            <h2>{LICENSES_SCREEN_TITLE}</h2>
            <button ref={closeRef} className="button ghost" onClick={() => setShowLicenses(false)}>Close</button>
          </div>
          <div className="small muted" style={{ marginBottom: 12 }}>{LICENSES_SCREEN_INTRO}</div>
          <div className="small" style={{ marginBottom: 8 }}><strong>First-party assets</strong></div>
          <div className="small muted" style={{ marginBottom: 16 }}>{licensesCatalog.defaultLicense.spdx}</div>
          <div style={{ display: "grid", gap: 12, maxHeight: "50vh", overflow: "auto" }}>
            {licensesCatalog.ossNotices.map((n) => (
              <div key={n.id}>
                <div className="small"><strong>{ossHeadline(n)}</strong></div>
                <div className="small muted">{n.notice}</div>
                <a className="small" href={n.url} target="_blank" rel="noreferrer">{n.url}</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet settings-sheet" role="dialog" aria-modal="true" aria-label={t("settings.title")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t("settings.title")}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("settings.close")}</button>
        </div>
        <ul className="upgrade-list">
          <li>
            <div className="grow">
              <strong>{t("settings.language")}</strong>
              <div className="small muted">{t("settings.languageHint")}</div>
            </div>
            <div className="quality-row">
              {([
                ["en", "settings.languageEn"],
                ["es", "settings.languageEs"],
                ["pt", "settings.languagePt"],
              ] as const).map(([loc, key]) => (
                <button
                  key={loc}
                  className={settings.locale === loc ? "button" : "button ghost"}
                  aria-pressed={settings.locale === loc}
                  onClick={() => onChange({ locale: loc })}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </li>
          <li aria-label={t("a11y.themeGroup")}>
            <div className="grow">
              <strong>{t("settings.theme")}</strong>
              <div className="small muted">{t("settings.themeHint")}</div>
            </div>
            <div className="quality-row">
              {([
                ["system", "settings.themeSystem"],
                ["light", "settings.themeLight"],
                ["dark", "settings.themeDark"],
              ] as const).map(([pref, key]) => (
                <button
                  key={pref}
                  className={settings.themePreference === pref ? "button" : "button ghost"}
                  aria-pressed={settings.themePreference === pref}
                  onClick={() => onChange({ themePreference: pref })}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </li>
          <li>
            <div className="grow">
              <strong>{t("settings.mute")}</strong>
              <div className="small muted">Master silence for music beds and stingers. Haptics stay independent.</div>
            </div>
            <button className="button" aria-pressed={settings.muted} onClick={() => onChange({ muted: !settings.muted })}>
              {settings.muted ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Music</strong>
              <div className="small muted">Harbor / shop music beds under gameplay.</div>
            </div>
            <div className="quality-row">
              {VOLUME_STEPS.map((step) => (
                <button
                  key={`music-${step}`}
                  className={settings.musicVolume === step ? "button" : "button ghost"}
                  aria-pressed={settings.musicVolume === step}
                  onClick={() => onChange({ musicVolume: step })}
                >
                  {step === 0 ? "Off" : step === 0.35 ? "Low" : step === 0.7 ? "Med" : "High"}
                </button>
              ))}
            </div>
          </li>
          <li>
            <div className="grow">
              <strong>SFX</strong>
              <div className="small muted">Catch, sale, machine, rush, and upgrade stingers.</div>
            </div>
            <div className="quality-row">
              {VOLUME_STEPS.map((step) => (
                <button
                  key={`sfx-${step}`}
                  className={settings.sfxVolume === step ? "button" : "button ghost"}
                  aria-pressed={settings.sfxVolume === step}
                  onClick={() => onChange({ sfxVolume: step })}
                >
                  {step === 0 ? "Off" : step === 0.35 ? "Low" : step === 0.7 ? "Med" : "High"}
                </button>
              ))}
            </div>
          </li>
          <li>
            <div className="grow">
              <strong>Haptics</strong>
              <div className="small muted">Short vibration on catch and sale when the device supports it.</div>
            </div>
            <button
              className="button"
              aria-pressed={settings.hapticsEnabled}
              onClick={() => onChange({ hapticsEnabled: !settings.hapticsEnabled })}
            >
              {settings.hapticsEnabled ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Tap to move</strong>
              <div className="small muted">Tap the harbor to walk there. Stick and keys still work.</div>
            </div>
            <button className="button" aria-pressed={settings.tapToMove} onClick={() => onChange({ tapToMove: !settings.tapToMove })}>
              {settings.tapToMove ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Cloud sync</strong>
              <div className="small muted">
                {cloudAvailable
                  ? "Optional anonymous link. Newest checksummed save wins; local play works with this off."
                  : "Optional. Set VITE_FIREBASE_API_KEY + VITE_FIREBASE_PROJECT_ID (see web/.env.example). Local saves still work offline."}
                {saveStatus.cloudPendingUpload ? " Pending upload will retry when online." : ""}
              </div>
            </div>
            <button
              className="button"
              aria-pressed={settings.cloudSyncEnabled}
              onClick={() => onChange({ cloudSyncEnabled: !settings.cloudSyncEnabled })}
            >
              {settings.cloudSyncEnabled
                ? saveStatus.cloudPendingUpload
                  ? "On · pending"
                  : "On"
                : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Analytics</strong>
              <div className="small muted">
                Privacy-safe events only (tutorial, first sale, harbors, offline, save recovery, frame timing, sessions).
                Never includes account ids, bag contents, or full saves.
                {settings.analyticsConsent && analyticsAlertActive
                  ? " Stability alert: crash-free session rate below 99%."
                  : ""}
              </div>
            </div>
            <button
              className="button"
              aria-pressed={settings.analyticsConsent}
              onClick={() => onChange({
                analyticsConsent: !settings.analyticsConsent,
                analyticsConsentDecided: true,
              })}
            >
              {settings.analyticsConsent
                ? analyticsAlertActive
                  ? "On · alert"
                  : "On"
                : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Daily goal reminders</strong>
              <div className="small muted">
                Local evening reminder when you still have unclaimed daily goals. Opt-in; uses this browser&apos;s
                notification permission (no remote push).
              </div>
            </div>
            <button
              className="button"
              aria-pressed={settings.dailyGoalRemindersEnabled}
              onClick={() => onChange({ dailyGoalRemindersEnabled: !settings.dailyGoalRemindersEnabled })}
            >
              {settings.dailyGoalRemindersEnabled ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Accessibility preset</strong>
              <div className="small muted">
                Turns on reduced motion, captions, larger HUD text, shape status cues, and the reel timing meter.
                Timing Sights / Master Reel upgrades still widen the sim window.
              </div>
            </div>
            <button
              className="button"
              onClick={() => onChange(accessibilityPreset())}
            >
              Apply
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Reduced motion</strong>
              <div className="small muted">Snaps the camera follow and skips flying transfer VFX.</div>
            </div>
            <button
              className="button"
              aria-pressed={settings.reducedMotion}
              onClick={() => onChange({ reducedMotion: !settings.reducedMotion })}
            >
              {settings.reducedMotion ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Captions</strong>
              <div className="small muted">Toast text for sales, alerts, and other one-off feedback.</div>
            </div>
            <button
              className="button"
              aria-pressed={settings.captionsEnabled}
              onClick={() => onChange({ captionsEnabled: !settings.captionsEnabled })}
            >
              {settings.captionsEnabled ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>HUD text size</strong>
              <div className="small muted">Scales HUD labels and buttons without changing 48px touch targets.</div>
            </div>
            <div className="quality-row">
              {HUD_TEXT_SCALES.map((step) => (
                <button
                  key={`hud-${step}`}
                  className={settings.hudTextScale === step ? "button" : "button ghost"}
                  aria-pressed={settings.hudTextScale === step}
                  onClick={() => onChange({ hudTextScale: step as HudTextScale })}
                >
                  {hudTextScaleLabel(step)}
                </button>
              ))}
            </div>
          </li>
          <li>
            <div className="grow">
              <strong>Shape cues</strong>
              <div className="small muted">Adds ▶ ■ ◆ glyphs beside station and reel status so colour is not the only signal.</div>
            </div>
            <button
              className="button"
              aria-pressed={settings.shapeCues}
              onClick={() => onChange({ shapeCues: !settings.shapeCues })}
            >
              {settings.shapeCues ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Timing meter</strong>
              <div className="small muted">
                Shows Good / Perfect bands while casting. Buy Timing Sights or Master Reel in Upgrades to widen the window.
              </div>
            </div>
            <button
              className="button"
              aria-pressed={settings.timingAssist}
              onClick={() => onChange({ timingAssist: !settings.timingAssist })}
            >
              {settings.timingAssist ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Balance strip</strong>
              <div className="small muted">In-dev HUD rates: abandon, wage ratio, top catch share.</div>
            </div>
            <button
              className="button"
              aria-pressed={settings.showBalanceStrip}
              onClick={() => onChange({ showBalanceStrip: !settings.showBalanceStrip })}
            >
              {settings.showBalanceStrip ? "On" : "Off"}
            </button>
          </li>
          <li>
            <div className="grow">
              <strong>Save status</strong>
              <div className="small muted">
                {saveStatus.persistent ? "Local slots: latest + previous backup." : t("lifecycle.storageUnavailableSettings")}
                {" "}{saveStatus.lastSavedLabel}
                {saveStatus.cloudEnabled
                  ? saveStatus.cloudAvailable
                    ? saveStatus.cloudLinked
                      ? saveStatus.cloudPendingUpload
                        ? " · Cloud linked · pending upload"
                        : " · Cloud linked"
                      : " · Cloud on, linking…"
                    : " · Cloud on, keys missing"
                  : " · Cloud off"}
              </div>
            </div>
            <span className="num">{saveStatus.persistent ? "Disk" : "RAM"}</span>
          </li>
        </ul>
        <div className="small" style={{ marginTop: 12 }}>Controls</div>
        <div className="small muted">{controlsHelpLine()}</div>
        <div className="small" style={{ marginTop: 12 }}>Telemetry</div>
        <div className="small muted">Privacy-safe counters (fish.telemetry.v2) and content balance knobs. Copied as JSON.</div>
        <div className="small reward" style={{ marginTop: 6 }}>
          Abandon {Math.trunc(telemetryRates.abandonPermille / 10)}%
          {" · "}Wage {Math.trunc(telemetryRates.wageRatioPermille / 10)}%
          {telemetryRates.topSpecies[0]
            ? ` · Top ${telemetryRates.topSpecies[0].name} ${Math.trunc(telemetryRates.topSpecies[0].sharePermille / 10)}%`
            : " · No catches yet"}
        </div>
        <div className="quality-row">
          <button
            className="button"
            onClick={() => void copyJson("Play stats", onExportTelemetry(), "Start a harbor to export play stats")}
          >
            Copy stats
          </button>
          <button
            className="button ghost"
            onClick={() => void copyJson("Balance knobs", onExportBalance(), "Balance export unavailable")}
          >
            Copy balance
          </button>
          <button
            className="button ghost"
            onClick={() => void copyJson(
              "Analytics dashboard",
              onExportAnalyticsDashboard(),
              "Analytics dashboard unavailable",
            )}
          >
            Copy analytics
          </button>
        </div>
        {exportNote && <div className="small" style={{ marginTop: 8 }}>{exportNote}</div>}
        <div className="small" style={{ marginTop: 12 }}>Quality</div>
        <div className="small muted">Targets ~60 FPS @1080 mid desktop. Soft-downgrades if frames stay over budget.</div>
        <div className="quality-row">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              className={settings.quality === q ? "button" : "button ghost"}
              aria-pressed={settings.quality === q}
              onClick={() => onChange({ quality: q })}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="small" style={{ marginTop: 12 }}>Joystick side</div>
        <div className="quality-row">
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              className={settings.joystickSide === side ? "button" : "button ghost"}
              aria-pressed={settings.joystickSide === side}
              onClick={() => onChange({ joystickSide: side })}
            >
              {side}
            </button>
          ))}
        </div>
        <div className="small" style={{ marginTop: 12 }}>Joystick size</div>
        <div className="quality-row">
          {scales.map((s) => {
            const label = s === 0.75 ? "S" : s === 1.25 ? "L" : "M";
            return (
              <button
                key={s}
                className={settings.joystickScale === s ? "button" : "button ghost"}
                aria-pressed={settings.joystickScale === s}
                onClick={() => onChange({ joystickScale: s })}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="small" style={{ marginTop: 12 }}>Progress</div>
        <button
          className="button"
          style={{ width: "100%", minHeight: 48 }}
          onClick={() => setShowAchievements(true)}
        >
          {t("settings.achievements")} ({t("achievements.count", {
            unlocked: unlockedAchievementsCount,
            total: achievements.length,
          })})
        </button>
        <div className="small" style={{ marginTop: 12 }}>Legal</div>
        <div className="small muted">{STORE_SHORT_DESCRIPTION}</div>
        <div className="small muted" style={{ marginTop: 6 }}>{SUPPORT_RESTORE_HELP}</div>
        <div className="quality-row" style={{ marginTop: 8 }}>
          <a className="button" href={PRIVACY_PAGE_PATH} target="_blank" rel="noreferrer">{t("landing.ctaPrivacy")}</a>
          <a className="button ghost" href={`${SUPPORT_PAGE_PATH}#restore`} target="_blank" rel="noreferrer">{t("landing.ctaSupport")}</a>
        </div>
        <button
          className="button ghost"
          style={{ marginTop: 8, width: "100%", minHeight: 48 }}
          onClick={() => setShowLicenses(true)}
        >
          Licenses
        </button>
      </div>
    </div>
  );
}

export function AchievementsPanel({ achievements, unlockedCount, closeRef, onClose, onDismiss }: {
  achievements: SimView["achievements"];
  unlockedCount: number;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="scrim" onClick={onDismiss}>
      <div
        className="panel sheet settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t("achievements.title")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-header">
          <h2>{t("achievements.title")}</h2>
          <span className="num">{t("achievements.count", { unlocked: unlockedCount, total: achievements.length })}</span>
          <button ref={closeRef as React.RefObject<HTMLButtonElement>} className="button ghost" onClick={onClose}>{t("common.back")}</button>
        </div>
        <div className="small muted" style={{ marginBottom: 12 }}>
          Lifetime milestones. Unlocks grant a small coin reward once.
        </div>
        <ul className="upgrade-list" style={{ maxHeight: "50vh", overflow: "auto" }}>
          {achievements.map((a) => (
            <li key={a.id}>
              <div className="grow">
                <strong>{a.name}</strong>
                <div className="small muted">{a.category}</div>
                <div className="small">{a.description}</div>
                {a.rewardCoins > 0 && (
                  <div className="small reward">Reward: {formatCoins(a.rewardCoins)} coins</div>
                )}
                {a.status === "active" && (
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={a.goalAtLeast}
                    aria-valuenow={a.progress}
                  >
                    <div style={{ width: `${Math.min(100, Math.max(0, (a.progress / a.goalAtLeast) * 100))}%` }} />
                  </div>
                )}
              </div>
              <span
                className={a.status === "unlocked" ? "owned" : "num"}
                aria-label={a.status === "unlocked" ? t("a11y.achievementUnlocked") : t("a11y.achievementLocked")}
              >
                {a.status === "unlocked" ? t("a11y.achievementUnlocked") : `${a.progress}/${a.goalAtLeast}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
