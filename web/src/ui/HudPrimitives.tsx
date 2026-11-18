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

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" width="72" height="72" role="img" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--ink)" />
      <path fill="var(--sky)" d="M10 34c8-12 22-16 34-10 4 2 8 6 10 10-2 4-6 8-10 10-12 6-26 2-34-10z" />
      <circle cx="42" cy="30" r="2.6" fill="var(--ink)" />
      <path fill="var(--reward)" d="M8 34l-5.5-4.2v8.4L8 34z" />
      <path fill="var(--action)" opacity="0.35" d="M18 38c6 4 16 6 24 2 2-1 4-3 5-5-3 6-12 10-22 8-4-.5-6-2-7-5z" />
    </svg>
  );
}

/** Finish 3.0 Phase 7 — theme-aware design-system primitives (CSS token backed). */
export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["panel", "ds-panel", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

export function Pill({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["pill", "ds-pill", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}

export function PrimaryButton({
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={["button", "ds-primary", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}

export function GhostButton({
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={["button", "ghost", "ds-ghost", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}

export function Scrim({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["scrim", "ds-scrim", className].filter(Boolean).join(" ")} {...rest} />;
}

export function CenterCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="center">
      <Panel className="center-card ds-center-card">
        <h2 className={danger ? "danger" : undefined}>{title}</h2>
        <p>{children}</p>
      </Panel>
    </div>
  );
}
