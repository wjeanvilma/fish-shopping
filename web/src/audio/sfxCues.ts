/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; AudioBus plays authored clips (or stays silent when muted).
 * Finish 2.0 Phase 21 adds achievement/festival/contract/goal/mastery/quest stingers.
 * Finish 3.0 Phase 23 adds rival/travel/hire/prestige/loan/trophy stingers.
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
  | "quest_done"
  | "rival_open"
  | "rival_steal"
  | "rival_beat"
  | "harbor_travel"
  | "hire"
  | "prestige"
  | "loan"
  | "trophy_set";

/** All authored pack cue ids (post-1.0 Phase 19 + Finish 2.0 Phase 21 + Finish 3.0 Phase 23). */
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
  "rival_open",
  "rival_steal",
  "rival_beat",
  "harbor_travel",
  "hire",
  "prestige",
  "loan",
  "trophy_set",
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

/** Pack-3 cue ids (Finish 3.0 Phase 23). */
export const SFX_PACK3_CUES: readonly SfxCue[] = [
  "rival_open",
  "rival_steal",
  "rival_beat",
  "harbor_travel",
  "hire",
  "prestige",
  "loan",
  "trophy_set",
] as const;

/** Cues that should also pulse a short haptic on Android / vibrate on web. */
export const HAPTIC_CUES: ReadonlySet<SfxCue> = new Set([
  "catch",
  "sale",
  "achievement",
  "rival_beat",
  "prestige",
  "trophy_set",
]);

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
  | { type: "rival_market_opened" }
  | { type: "rival_sale_stolen" }
  | { type: "rival_beaten" }
  | { type: "harbor_traveled"; replayed?: boolean }
  | { type: "worker_hired"; replayed?: boolean }
  | { type: "prestige_unlocked" }
  | { type: "loan_taken"; replayed?: boolean }
  | { type: "trophy_set_completed" }
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
    case "rival_market_opened":
      return "rival_open";
    case "rival_sale_stolen":
      return "rival_steal";
    case "rival_beaten":
      return "rival_beat";
    case "harbor_traveled":
      return e.replayed ? null : "harbor_travel";
    case "worker_hired":
      return e.replayed ? null : "hire";
    case "prestige_unlocked":
      return "prestige";
    case "loan_taken":
      return e.replayed ? null : "loan";
    case "trophy_set_completed":
      return "trophy_set";
    default:
      return null;
  }
}

/** Web public path for an authored clip. */
export function sfxPublicPath(cue: SfxCue): string {
  return `/sfx/${cue}.wav`;
}
