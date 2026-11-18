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

export function StaffPanel({ staff, workers, staffGear, automationIssues, stations, onShiftCount, freeOnShiftSlots, overtimeOnShiftCount, wagePerWorkerPerHour, maintenanceCoinsPerStation, economyUnlocked, bagFishSpoilActive, coins, onOpenDashboard, onHire, onSetShift, onAssignGear, onUnequipGear, onTrainBranch, onSelectBranch, onSetSchedule, onRepair, onClose }: {
  staff: StaffHireView[]; workers: WorkerView[]; staffGear: StaffGearView[]; automationIssues: AutomationIssueView[]; stations: StationView[]; onShiftCount: number; freeOnShiftSlots: number; overtimeOnShiftCount: number;
  onOpenDashboard: () => void;
  wagePerWorkerPerHour: number; maintenanceCoinsPerStation: number; economyUnlocked: boolean; bagFishSpoilActive: boolean;
  coins: number; onHire: (roleId: string) => void; onSetShift: (workerId: string, onShift: boolean) => void;
  onAssignGear: (workerId: string, upgradeId: string) => void; onUnequipGear: (workerId: string, slotId: string) => void;
  onTrainBranch: (workerId: string, branchId: string) => void;
  onSelectBranch: (workerId: string, branchId: string | null) => void;
  onSetSchedule: (workerId: string, scheduleId: string | null) => void;
  onRepair: (stationId: string) => void; onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const freeGear = staffGear.filter((g) => !g.equippedOnWorkerId);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("nav.staff")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <div className="grow">
            <h2>{t("nav.staff")}</h2>
            <div className="small muted">
              {onShiftCount} on shift · {freeOnShiftSlots} free slots
              {overtimeOnShiftCount > 0 ? ` · ${overtimeOnShiftCount} overtime` : ""}
              {wagePerWorkerPerHour > 0 ? ` · ${wagePerWorkerPerHour} coins/hr` : ""}
              {economyUnlocked && maintenanceCoinsPerStation > 0 ? ` · upkeep ${maintenanceCoinsPerStation}/station` : ""}
              {bagFishSpoilActive ? " · bag fish spoil" : ""}
            </div>
          </div>
          <span className="num">{formatCoins(coins)} coins</span>
          <button ref={closeRef} className="button ghost" onClick={onClose}>Close</button>
        </div>
        <div className="row wrap" style={{ gap: 6, marginBottom: 8 }}>
          <button className="button" onClick={onOpenDashboard}>
            Business dashboard <kbd>Y</kbd>
          </button>
        </div>
        {workers.length > 0 && (
          <ul className="upgrade-list">
            {workers.map((w) => (
              <li key={w.id}>
                <div className="grow">
                  <strong>{w.roleName} · Lv {w.level}</strong>
                  <div className="small">
                    {w.xpToNext === null ? "Max level" : `${w.xpToNext} XP to next`}
                    {w.traitNames.length > 0 ? ` · ${w.traitNames.join(", ")}` : ""}
                  </div>
                  {w.blockedReason && <div className="small danger">{w.blockedReason}</div>}
                  {w.equipment.length > 0 && (
                    <div className="small">
                      {w.equipment.map((eq) => (
                        <button
                          key={eq.slotId}
                          className="button ghost"
                          style={{ marginRight: 4, marginTop: 4 }}
                          onClick={() => onUnequipGear(w.id, eq.slotId)}
                          title={`Unequip ${eq.upgradeName}`}
                        >
                          {eq.slotName}: {eq.upgradeName} ×
                        </button>
                      ))}
                    </div>
                  )}
                  {freeGear.length > 0 && (
                    <div className="small">
                      {freeGear.map((g) => (
                        <button
                          key={g.upgradeId}
                          className="button ghost"
                          style={{ marginRight: 4, marginTop: 4 }}
                          onClick={() => onAssignGear(w.id, g.upgradeId)}
                        >
                          Equip {g.slotName}
                        </button>
                      ))}
                    </div>
                  )}
                  {w.branches.length > 0 && (
                    <div className="small" style={{ marginTop: 4 }}>
                      Branch{w.activeBranchName ? `: ${w.activeBranchName}` : ""}
                      <div>
                        {w.branches.map((b) => (
                          <button
                            key={b.id}
                            className="button ghost"
                            style={{ marginRight: 4, marginTop: 4 }}
                            disabled={b.active || (!b.unlocked && !b.canTrain)}
                            title={b.trainReason ?? b.description}
                            onClick={() => {
                              if (b.unlocked) onSelectBranch(w.id, b.active ? null : b.id);
                              else onTrainBranch(w.id, b.id);
                            }}
                          >
                            {b.active ? `Using ${b.name}` : b.unlocked ? `Use ${b.name}` : `Train ${b.name} · ${formatCoins(b.trainingCostCoins)}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {w.schedules.length > 0 && (
                    <div className="small" style={{ marginTop: 4 }}>
                      Schedule{w.scheduleName ? `: ${w.scheduleName}` : ""}
                      <div>
                        {w.schedules.map((sch) => (
                          <button
                            key={sch.id}
                            className="button ghost"
                            style={{ marginRight: 4, marginTop: 4 }}
                            onClick={() => onSetSchedule(w.id, sch.active ? null : sch.id)}
                            title={sch.description}
                          >
                            {sch.active ? `Using ${sch.name}` : sch.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="button ghost"
                  onClick={() => onSetShift(w.id, !w.onShift)}
                >
                  {w.onShift ? "On shift" : "Off shift"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {staffGear.length > 0 && (
          <div className="small muted" style={{ marginBottom: 8 }}>
            Gear: {staffGear.map((g) =>
              g.equippedOnRoleName
                ? `${g.name} → ${g.equippedOnRoleName}`
                : `${g.name} (free)`,
            ).join(" · ")}
          </div>
        )}
        {automationIssues.length > 0 && (
          <ul className="upgrade-list">
            {automationIssues.map((issue) => {
              const station = issue.kind === "machine"
                ? stations.find((s) => s.stationId === issue.id)
                : undefined;
              const canRepair = !!station?.needsRepair;
              return (
                <li key={`${issue.kind}:${issue.id}`}>
                  <div className="grow">
                    <strong>{issue.label}</strong>
                    <div className="small danger">{issue.reason}</div>
                  </div>
                  {canRepair ? (
                    <button
                      className="button num"
                      disabled={coins < (station?.repairCost ?? 0)}
                      onClick={() => onRepair(issue.id)}
                    >
                      Repair · {formatCoins(station!.repairCost)}
                    </button>
                  ) : (
                    <span className="small muted">{issue.kind}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ul className="upgrade-list">
          {staff.map((row) => (
            <li key={row.roleId}>
              <div className="grow">
                <strong>{row.name}</strong>
                <div className="small">{row.roleKind} · {row.hired}/{row.maxHired} hired</div>
                {row.reason && <div className="small danger">{row.reason}</div>}
              </div>
              <button className="button num" disabled={!row.purchasable} onClick={() => onHire(row.roleId)}>{formatCoins(row.cost)}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
