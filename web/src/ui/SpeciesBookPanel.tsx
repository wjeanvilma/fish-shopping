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

export function SpeciesBookPanel({ book, onClose }: { book: SpeciesBookView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState<"all" | "logged" | "hidden" | string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => closeRef.current?.focus(), []);
  const selected = selectedId ? book.entries.find((e) => e.speciesId === selectedId) ?? null : null;
  const filtered = book.entries.filter((e) => {
    if (filter === "all") return true;
    if (filter === "logged") return e.discovered;
    if (filter === "hidden") return !e.discovered;
    return e.family === filter;
  });
  if (selected) {
    return (
      <div className="scrim" onClick={onClose}>
        <div className="panel sheet" role="dialog" aria-modal="true" aria-label={`${t("codex.detail")}: ${selected.name}`} onClick={(e) => e.stopPropagation()}>
          <div className="sheet-header">
            <h2>{selected.name}</h2>
            <button ref={closeRef} className="button ghost" onClick={() => setSelectedId(null)}>{t("common.back")}</button>
          </div>
          <div className="small muted" style={{ marginBottom: 8 }}>
            {selected.family} · {selected.rarityBand}
            {selected.discovered ? ` · base ${formatCoins(selected.baseValue)}` : ""}
          </div>
          {selected.discovered ? (
            <>
              {selected.lore && <p className="small">{selected.lore}</p>}
              {selected.journalTip && <p className="small reward">{selected.journalTip}</p>}
              <div className="small muted" style={{ marginTop: 6 }}>
                Mastery Lv {selected.masteryLevel}
                {selected.masteryXpToNext != null
                  ? ` · ${selected.masteryXp} XP · ${selected.masteryXpToNext} to next`
                  : ` · ${selected.masteryXp} XP · max`}
              </div>
              <div className="small num" style={{ marginTop: 8 }}>
                {selected.catches} caught
                {selected.catchValueEstimate > 0 ? ` · ~${formatCoins(selected.catchValueEstimate)} dock value` : ""}
                {selected.trophyBestSizePermille != null
                  ? ` · best ${selected.trophyBestSizePermille}% · ${formatCoins(selected.trophyBestValueCoins ?? 0)}`
                  : ""}
              </div>
              {selected.harborNames.length > 0 && (
                <div className="small muted" style={{ marginTop: 6 }}>Harbors: {selected.harborNames.join(" · ")}</div>
              )}
              {selected.recipeNames.length > 0 && (
                <div className="small muted" style={{ marginTop: 6 }}>
                  Recipes: {selected.recipeNames.join(" · ")}
                </div>
              )}
              {selected.baseSpeciesId && (
                <div className="small reward" style={{ marginTop: 6 }}>Rare upgrade form</div>
              )}
            </>
          ) : (
            <>
              <p className="small muted">Not discovered yet.</p>
              {selected.habitatHint && (
                <p className="small">Hint: {selected.habitatHint}</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="scrim" onClick={onClose}>
      <div className="panel sheet" role="dialog" aria-modal="true" aria-label={t("panels.codex")} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{t("panels.codex")}</h2>
          <button ref={closeRef} className="button ghost" onClick={onClose}>{t("common.close")}</button>
        </div>
        <div className="small muted num">
          {book.discovered}/{book.total} discovered
        </div>
        <div className="quality-row" style={{ marginTop: 8, flexWrap: "wrap" }} role="group" aria-label={t("panels.codex")}>
          {(["all", "logged", "hidden"] as const).map((f) => (
            <button
              key={f}
              className={filter === f ? "button" : "button ghost"}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? t("a11y.filterAll") : f === "logged" ? t("a11y.filterLogged") : t("a11y.filterHidden")}
            </button>
          ))}
          {book.families.map((fam) => (
            <button
              key={fam}
              className={filter === fam ? "button" : "button ghost"}
              aria-pressed={filter === fam}
              onClick={() => setFilter(fam)}
            >
              {fam}
            </button>
          ))}
        </div>
        {book.empty ? (
          <p className="muted">No catches yet — cast from a pier to fill the journal.</p>
        ) : null}
        <ul className="upgrade-list" style={{ marginTop: 8, maxHeight: "50vh", overflow: "auto" }}>
          {filtered.map((entry) => (
            <li key={entry.speciesId}>
              <button
                className="grow"
                style={{ textAlign: "left", background: "transparent", border: 0, padding: 0, color: "inherit", cursor: "pointer" }}
                onClick={() => setSelectedId(entry.speciesId)}
              >
                <strong>{entry.name}</strong>
                {entry.discovered ? (
                  <>
                    <div className="small num">
                      {entry.catches} caught · {entry.rarityBand}
                      {entry.trophyBestSizePermille != null
                        ? ` · best ${entry.trophyBestSizePermille}%`
                        : ""}
                    </div>
                    {entry.lore && <div className="small muted">{entry.lore}</div>}
                  </>
                ) : (
                  <>
                    <div className="small muted">Not discovered · {entry.family}</div>
                    {entry.habitatHint && <div className="small">Hint: {entry.habitatHint}</div>}
                  </>
                )}
              </button>
              <span className={entry.discovered ? "owned" : "num"}>
                {entry.discovered ? "Open" : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
