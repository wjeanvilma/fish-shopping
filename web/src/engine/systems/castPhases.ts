/**
 * Finish 5.0 Phase 2 — cast phase helpers (waiting → strike → fight).
 * Ephemeral overlay on fishing progress; no save-schema bump.
 */
import { idiv } from "../foundations";
import type { ContentPack } from "../content";
import type { GameState } from "../state";
import { systemsBridge } from "./bridge";

export type CastPhase = "waiting" | "strike" | "fight";

export const CastPhases = {
  WAITING_END_PERMILLE: 400,
  STRIKE_END_PERMILLE: 580,
  /** Max widen applied from mastery perfect-window width. */
  STRIKE_WIDEN_CAP_PERMILLE: 80,

  /** Wider perfect windows (better techniques) widen the strike band slightly. */
  strikeWidenPermille(content: ContentPack, state: GameState): number {
    const w = systemsBridge.masteryTimingWindows(content, state);
    const width = Math.max(0, w.perfectEnd - w.perfectStart);
    return Math.min(CastPhases.STRIKE_WIDEN_CAP_PERMILLE, idiv(width, 2));
  },

  strikeEndPermille(content: ContentPack, state: GameState): number {
    return Math.min(
      900,
      CastPhases.STRIKE_END_PERMILLE + CastPhases.strikeWidenPermille(content, state),
    );
  },

  phaseAt(
    progress: number,
    duration: number,
    content: ContentPack,
    state: GameState,
  ): CastPhase {
    if (duration <= 0 || progress < 0) return "waiting";
    const permille = idiv(progress * 1000, duration);
    if (permille < CastPhases.WAITING_END_PERMILLE) return "waiting";
    if (permille < CastPhases.strikeEndPermille(content, state)) return "strike";
    return "fight";
  },

  /** Mastery XP multiplier for landing during the strike window (permille). */
  strikeXpMultPermille(phase: CastPhase, timingTier: "miss" | "good" | "perfect"): number {
    if (phase !== "strike") return 1000;
    if (timingTier === "perfect") return 1250;
    if (timingTier === "good") return 1100;
    return 1000;
  },
};
