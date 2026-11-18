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
import { cosmeticTitle } from "../engine/cosmeticPresentation";
import { formatCoins, formatRushSeconds, prestigeRewardBits } from "./hudFormat";

export function QuestLogPanel({
  quests,
  prestigeUnlocked,
  prestigeLockedReason,
  harborRating,
  prestige,
  unlockedCosmetics,
  seasonalEvent,
  bank,
  coins,
  decorOffers,
  cosmeticIapOffers,
  decorPatienceBonusTicks,
  trophySets,
  trophiesCount,
  speciesDiscovered,
  speciesTotal,
  onOpenSpeciesBook,
  onPurchaseDecor,
  onPurchaseIapCosmetic,
  onRestorePurchases,
  equippedCosmeticId,
  previewCosmeticId,
  onEquipCosmetic,
  onUnequipCosmetic,
  onPreviewCosmetic,
  onClearPreview,
  onTakeLoan,
  onRepayLoan,
  onSetCoinGoal,
  dailyLoginStreak,
  dailyGoals,
  onClaimDailyGoal,
  onClose,
}: {
  quests: QuestView[];
  prestigeUnlocked: boolean;
  prestigeLockedReason: string | null;
  harborRating: number;
  prestige: PrestigeView[];
  unlockedCosmetics: string[];
  seasonalEvent: SeasonalEventBannerView | null;
  bank: BankView;
  coins: number;
  decorOffers: DecorOfferView[];
  cosmeticIapOffers: CosmeticIapOfferView[];
  decorPatienceBonusTicks: number;
  trophySets: TrophySetView[];
  trophiesCount: number;
  speciesDiscovered: number;
  speciesTotal: number;
  onOpenSpeciesBook: () => void;
  onPurchaseDecor: (decorId: string) => void;
  onPurchaseIapCosmetic: (sku: string) => void;
  onRestorePurchases: () => void;
  equippedCosmeticId: string | null;
  previewCosmeticId: string | null;
  onEquipCosmetic: (cosmeticId: string) => void;
  onUnequipCosmetic: () => void;
  onPreviewCosmetic: (cosmeticId: string) => void;
  onClearPreview: () => void;
  onTakeLoan: () => void;
  onRepayLoan: () => void;
  onSetCoinGoal: (amount: number) => void;
  dailyLoginStreak: number;
  dailyGoals: DailyGoalView[];
  onClaimDailyGoal: (objectiveId: string) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("nav.goals")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t("nav.goals")}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <ul className="upgrade-list">
          <li>
            <div className="grow">
              <strong>{t("a11y.dailyGoalsSection")}</strong>
              <div className="small">
                {dailyLoginStreak > 0
                  ? `Login streak: ${dailyLoginStreak} day${dailyLoginStreak === 1 ? "" : "s"}`
                  : "Open each day to build a streak"}
              </div>
            </div>
            <span className="num">{dailyLoginStreak > 0 ? dailyLoginStreak : "—"}</span>
          </li>
          {dailyGoals.length === 0 ? (
            <li>
              <div className="grow">
                <div className="small muted">Sync your clock to roll today&apos;s objectives.</div>
              </div>
            </li>
          ) : (
            dailyGoals.map((g) => (
              <li key={g.objectiveId}>
                <div className="grow">
                  <strong>{g.name}</strong>
                  <div className="small">{g.description}</div>
                  <div className="small reward">Reward: {formatCoins(g.rewardCoins)}</div>
                  {!g.claimed && (
                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={g.target} aria-valuenow={g.progress}>
                      <div style={{ width: `${Math.min(100, Math.max(0, (g.progress / Math.max(1, g.target)) * 100))}%` }} />
                    </div>
                  )}
                </div>
                {g.claimed ? (
                  <span className="owned">Claimed</span>
                ) : g.claimEnabled ? (
                  <button className="button" onClick={() => onClaimDailyGoal(g.objectiveId)}>
                    Claim
                  </button>
                ) : (
                  <span className="num">{g.progress}/{g.target}</span>
                )}
              </li>
            ))
          )}
          {seasonalEvent && (
            <li aria-label={t("a11y.festivalSection")}>
              <div className="grow">
                <strong>{seasonalEvent.name}</strong>
                <div className="small muted">{t("a11y.festivalSection")}</div>
                <div className="small">{seasonalEvent.description}</div>
                <div className="small reward">
                  {formatRushSeconds(seasonalEvent.ticksRemaining)}s left
                  {seasonalEvent.banner ? ` · ${seasonalEvent.banner}` : ""}
                  {` · Crowd ×${(seasonalEvent.customerSpawnMultPermille / 1000).toFixed(2)}`}
                  {` · Prices ×${(seasonalEvent.priceMultPermille / 1000).toFixed(2)}`}
                </div>
              </div>
              <span className="num">Event</span>
            </li>
          )}
          <li aria-label={t("a11y.bankSection")}>
            <div className="grow">
              <strong>{t("bank.title")}</strong>
              {!bank.unlocked ? (
                <div className="small danger">{bank.lockedReason ?? "Locked"}</div>
              ) : bank.loanOwed > 0 ? (
                <>
                  <div className="small">
                    Owed {formatCoins(bank.loanOwed)}
                    {bank.loanOverdue
                      ? " · overdue (auto-collect)"
                      : ` · due in ${formatRushSeconds(bank.loanDueTicksLeft)}s`}
                  </div>
                  <button
                    className="button"
                    disabled={!bank.canRepayLoan}
                    onClick={onRepayLoan}
                  >
                    Repay · up to {formatCoins(Math.min(coins, bank.loanOwed))}
                  </button>
                </>
              ) : (
                <>
                  <div className="small">
                    Borrow {formatCoins(bank.loanPrincipal)} · repay {formatCoins(bank.repayAmount)}
                    {" "}in {formatRushSeconds(bank.termTicks)}s
                  </div>
                  <button
                    className="button"
                    disabled={!bank.canTakeLoan}
                    onClick={onTakeLoan}
                  >
                    Take loan · {formatCoins(bank.loanPrincipal)}
                  </button>
                </>
              )}
            </div>
            <span className="num">Bank</span>
          </li>
          <li>
            <div className="grow">
              <strong>Coin goal</strong>
              <div className="small">
                {bank.coinGoal > 0
                  ? bank.coinGoalCelebrated
                    ? `Reached ${formatCoins(bank.coinGoal)}`
                    : `${formatCoins(coins)} / ${formatCoins(bank.coinGoal)}`
                  : "Pick a savings target"}
              </div>
              {bank.coinGoal > 0 && !bank.coinGoalCelebrated && (
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={bank.coinGoal} aria-valuenow={Math.min(coins, bank.coinGoal)}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (coins / Math.max(1, bank.coinGoal)) * 100))}%` }} />
                </div>
              )}
              <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
                {bank.goalPresets.map((amount) => (
                  <button
                    key={amount}
                    className={`button ghost${bank.coinGoal === amount ? " active" : ""}`}
                    onClick={() => onSetCoinGoal(amount)}
                  >
                    {formatCoins(amount)}
                  </button>
                ))}
                {bank.coinGoal > 0 && (
                  <button className="button ghost" onClick={() => onSetCoinGoal(0)}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            <span className="num">Goal</span>
          </li>
          <li>
            <div className="grow">
              <strong>Species journal</strong>
              <div className="small">{speciesDiscovered}/{speciesTotal} discovered</div>
              <button className="button" onClick={onOpenSpeciesBook}>
                Open journal <kbd>B</kbd>
              </button>
            </div>
            <span className="num">{speciesDiscovered}/{speciesTotal}</span>
          </li>
          <li aria-label={t("a11y.trophySection")}>
            <div className="grow">
              <strong>{t("trophy.title")}</strong>
              <div className="small">{trophiesCount} species mounted</div>
            </div>
            <span className="num">{trophiesCount}</span>
          </li>
          {trophySets.map((set) => (
            <li key={set.id}>
              <div className="grow">
                <strong>{set.name}</strong>
                <div className="small">{set.description}</div>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={set.total} aria-valuenow={set.mounted}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (set.mounted / Math.max(1, set.total)) * 100))}%` }} />
                </div>
              </div>
              <span className={set.completed ? "owned" : "num"}>
                {set.completed ? "Done" : `${set.mounted}/${set.total}`}
              </span>
            </li>
          ))}
          {quests.map((q) => {
            const rewardBits = [
              ...(q.rewardCoins > 0 ? [`${formatCoins(q.rewardCoins)} coins`] : []),
              ...q.rewardUnlockNames.map((n) => `Unlock ${n}`),
            ];
            return (
              <li key={q.id}>
                <div className="grow">
                  <strong>{q.name}</strong>
                  <div className="small">{q.description}</div>
                  {q.reason && <div className="small danger">{q.reason}</div>}
                  {rewardBits.length > 0 && <div className="small reward">Reward: {rewardBits.join(" · ")}</div>}
                  {q.status === "active" && (
                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={q.goalAtLeast} aria-valuenow={q.progress}>
                      <div style={{ width: `${Math.min(100, Math.max(0, (q.progress / q.goalAtLeast) * 100))}%` }} />
                    </div>
                  )}
                </div>
                <span className={q.status === "completed" ? "owned" : "num"}>
                  {q.status === "completed" ? "Done" : q.status === "locked" ? "Locked" : `${q.progress}/${q.goalAtLeast}`}
                </span>
              </li>
            );
          })}
          <li>
            <div className="grow">
              <strong>Prestige</strong>
              {!prestigeUnlocked ? (
                <div className="small danger">{prestigeLockedReason ?? "Locked"}</div>
              ) : (
                <>
                  <div className="small reward">Harbor rating {"★".repeat(Math.max(0, Math.min(5, harborRating)))}</div>
                  {unlockedCosmetics.length > 0 && (
                    <div className="small muted">Banners: {unlockedCosmetics.join(", ")}</div>
                  )}
                </>
              )}
            </div>
          </li>
          {prestigeUnlocked && prestige.map((p) => {
            const rewardBits = prestigeRewardBits(p);
            return (
              <li key={p.id}>
                <div className="grow">
                  <strong>{p.name}</strong>
                  <div className="small">{p.description}</div>
                  {p.reason && <div className="small danger">{p.reason}</div>}
                  {rewardBits.length > 0 && <div className="small reward">Reward: {rewardBits.join(" · ")}</div>}
                  {p.status === "active" && (
                    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={p.goalAtLeast} aria-valuenow={p.progress}>
                      <div style={{ width: `${Math.min(100, Math.max(0, (p.progress / p.goalAtLeast) * 100))}%` }} />
                    </div>
                  )}
                </div>
                <span className={p.status === "completed" ? "owned" : "num"}>
                  {p.status === "completed" ? "Done" : p.status === "locked" ? "Locked" : `${p.progress}/${p.goalAtLeast}`}
                </span>
              </li>
            );
          })}
          <li aria-label={t("a11y.decorSection")}>
            <div className="grow">
              <strong>{t("decor.title")}</strong>
              <div className="small muted">
                Placable cosmetics
                {decorPatienceBonusTicks > 0 ? ` · +${decorPatienceBonusTicks} customer patience` : ""}
              </div>
            </div>
          </li>
          {decorOffers.map((d) => (
            <li key={d.id}>
              <div className="grow">
                <strong>{d.name}</strong>
                <div className="small">{d.description}</div>
                <div className="small reward">+{d.patienceBonusTicks} patience · {formatCoins(d.cost)} coins</div>
                {d.reason && <div className="small danger">{d.reason}</div>}
              </div>
              {d.status === "owned" ? (
                <span className="owned">Owned</span>
              ) : (
                <button className="button" disabled={!d.canAfford} onClick={() => onPurchaseDecor(d.id)}>
                  Buy
                </button>
              )}
            </li>
          ))}
          <li>
            <div className="grow">
              <strong>Harbor cosmetics</strong>
              <div className="small muted">Optional paid banners · visual only · never change rates</div>
              <div className="small muted">Equip one banner · Preview before buy · power-neutral</div>
              <button className="button ghost" onClick={onRestorePurchases} style={{ marginTop: 6 }}>
                Restore purchases
              </button>
            </div>
            <span className="num">IAP</span>
          </li>
          {cosmeticIapOffers.map((c) => {
            const owned = c.status === "owned";
            const equipped = equippedCosmeticId === c.grantsCosmetic;
            const previewing = previewCosmeticId === c.grantsCosmetic;
            return (
              <li key={c.id}>
                <div className="grow">
                  <strong>{c.title}</strong>
                  <div className="small">{c.description}</div>
                  {equipped && <div className="small reward">Equipped</div>}
                  {previewing && !equipped && <div className="small reward">Preview</div>}
                  <div className="quality-row" style={{ marginTop: 6, flexWrap: "wrap", gap: 6 }}>
                    <button className="button ghost" onClick={() => (previewing ? onClearPreview() : onPreviewCosmetic(c.grantsCosmetic))}>
                      {previewing ? "Clear preview" : "Preview"}
                    </button>
                    {owned ? (
                      <button
                        className="button"
                        onClick={() => (equipped ? onUnequipCosmetic() : onEquipCosmetic(c.grantsCosmetic))}
                      >
                        {equipped ? "Unequip" : "Equip"}
                      </button>
                    ) : (
                      <button className="button" onClick={() => onPurchaseIapCosmetic(c.sku)}>
                        Buy
                      </button>
                    )}
                  </div>
                </div>
                <span className={owned ? "owned" : "num"}>{owned ? "Owned" : "IAP"}</span>
              </li>
            );
          })}
          {unlockedCosmetics
            .filter((id) => !cosmeticIapOffers.some((c) => c.grantsCosmetic === id))
            .map((id) => {
              const equipped = equippedCosmeticId === id;
              const previewing = previewCosmeticId === id;
              return (
                <li key={id}>
                  <div className="grow">
                    <strong>{cosmeticTitle(id)}</strong>
                    <div className="small muted">Unlocked banner · visual only</div>
                    {equipped && <div className="small reward">Equipped</div>}
                    {previewing && !equipped && <div className="small reward">Preview</div>}
                    <div className="quality-row" style={{ marginTop: 6, flexWrap: "wrap", gap: 6 }}>
                      <button className="button ghost" onClick={() => (previewing ? onClearPreview() : onPreviewCosmetic(id))}>
                        {previewing ? "Clear preview" : "Preview"}
                      </button>
                      <button className="button" onClick={() => (equipped ? onUnequipCosmetic() : onEquipCosmetic(id))}>
                        {equipped ? "Unequip" : "Equip"}
                      </button>
                    </div>
                  </div>
                  <span className="owned">Owned</span>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}
