/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; AudioBus plays authored clips (or stays silent when muted).
 * Finish 2.0 Phase 21 adds achievement/festival/contract/goal/mastery/quest stingers.
 */
export type SfxCue =
  | "catch"
  | "machine_done"
  | "sale"
  | "ui"
  | "abandon"
  | "upgrade"
  | "rush"
  | "achievement"
  | "festival"
  | "contract_done"
  | "contract_fail"
  | "goal_claim"
  | "mastery_up"
  | "quest_done";

/** All authored pack cue ids (post-1.0 Phase 19 + Finish 2.0 Phase 21). */
export const SFX_CUES: readonly SfxCue[] = [
  "catch",
  "machine_done",
  "sale",
  "ui",
  "abandon",
  "upgrade",
  "rush",
  "achievement",
  "festival",
  "contract_done",
  "contract_fail",
  "goal_claim",
  "mastery_up",
  "quest_done",
] as const;

/** Pack-2 cue ids (Finish 2.0 Phase 21). */
export const SFX_PACK2_CUES: readonly SfxCue[] = [
  "achievement",
  "festival",
  "contract_done",
  "contract_fail",
  "goal_claim",
  "mastery_up",
  "quest_done",
] as const;

/** Cues that should also pulse a short haptic on Android / vibrate on web. */
export const HAPTIC_CUES: ReadonlySet<SfxCue> = new Set(["catch", "sale", "achievement"]);

/** Minimal event shape so Kotlin/TS hosts can share the mapping rules. */
export type SfxEvent =
  | { type: "fish_caught" }
  | { type: "batch_completed" }
  | { type: "sale_committed" }
  | { type: "customer_left"; paid: boolean }
  | { type: "upgrade_purchased"; replayed: boolean }
  | { type: "rush_started" }
  | { type: "panel_opened" }
  | { type: "achievement_unlocked" }
  | { type: "seasonal_event_started" }
  | { type: "contract_completed" }
  | { type: "contract_failed" }
  | { type: "daily_goal_claimed"; replayed?: boolean }
  | { type: "mastery_level_up" }
  | { type: "quest_completed" }
  | { type: string; [k: string]: unknown };

export function sfxFromEvent(e: SfxEvent): SfxCue | null {
  switch (e.type) {
    case "fish_caught":
      return "catch";
    case "batch_completed":
      return "machine_done";
    case "sale_committed":
      return "sale";
    case "customer_left":
      return e.paid ? null : "abandon";
    case "upgrade_purchased":
      return e.replayed ? null : "upgrade";
    case "rush_started":
      return "rush";
    case "panel_opened":
      return "ui";
    case "achievement_unlocked":
      return "achievement";
    case "seasonal_event_started":
      return "festival";
    case "contract_completed":
      return "contract_done";
    case "contract_failed":
      return "contract_fail";
    case "daily_goal_claimed":
      return e.replayed ? null : "goal_claim";
    case "mastery_level_up":
      return "mastery_up";
    case "quest_completed":
      return "quest_done";
    default:
      return null;
  }
}

/** Web public path for an authored clip. */
export function sfxPublicPath(cue: SfxCue): string {
  return `/sfx/${cue}.wav`;
}
