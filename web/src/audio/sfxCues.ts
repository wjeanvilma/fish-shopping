/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; AudioBus plays authored clips (or stays silent when muted).
 * Finish 2.0 Phase 21 adds achievement/festival/contract/goal/mastery/quest stingers.
 * Finish 3.0 Phase 23 adds rival/travel/hire/prestige/loan/trophy stingers.
 * Finish 4.0 Phase 23 adds decor/cosmetic/endgame/contract/bait/unlock/break/spoil stingers.
 * Finish 5.0 Phase 12 adds cast/spoil/service/contract/quest pressure stingers.
 * Finish 6.0 Phase 12 adds nest/roast/ferment/school/aurora cozy stingers.
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
  | "trophy_set"
  | "decor"
  | "cosmetic"
  | "endgame_tier"
  | "endgame_challenge"
  | "contract_accept"
  | "bait"
  | "full_unlock"
  | "machine_break"
  | "spoil"
  | "cast_strike"
  | "spoil_warn"
  | "service_queue"
  | "contract_deadline"
  | "quest_near"
  | "nest_settle"
  | "roast_ready"
  | "ferment_ready"
  | "school_flash"
  | "aurora_crest";

/** All authored pack cue ids (post-1.0 + Finish 2.0/3.0/4.0/5.0/6.0 packs). */
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
  "decor",
  "cosmetic",
  "endgame_tier",
  "endgame_challenge",
  "contract_accept",
  "bait",
  "full_unlock",
  "machine_break",
  "spoil",
  "cast_strike",
  "spoil_warn",
  "service_queue",
  "contract_deadline",
  "quest_near",
  "nest_settle",
  "roast_ready",
  "ferment_ready",
  "school_flash",
  "aurora_crest",
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

/** Pack-4 cue ids (Finish 4.0 Phase 23). */
export const SFX_PACK4_CUES: readonly SfxCue[] = [
  "decor",
  "cosmetic",
  "endgame_tier",
  "endgame_challenge",
  "contract_accept",
  "bait",
  "full_unlock",
  "machine_break",
  "spoil",
] as const;

/** Pack-5 cue ids (Finish 5.0 Phase 12). */
export const SFX_PACK5_CUES: readonly SfxCue[] = [
  "cast_strike",
  "spoil_warn",
  "service_queue",
  "contract_deadline",
  "quest_near",
] as const;

/** Pack-6 cue ids (Finish 6.0 Phase 12). */
export const SFX_PACK6_CUES: readonly SfxCue[] = [
  "nest_settle",
  "roast_ready",
  "ferment_ready",
  "school_flash",
  "aurora_crest",
] as const;

/** Cues that should also pulse a short haptic on Android / vibrate on web. */
export const HAPTIC_CUES: ReadonlySet<SfxCue> = new Set([
  "catch",
  "sale",
  "achievement",
  "rival_beat",
  "prestige",
  "trophy_set",
  "cosmetic",
  "endgame_tier",
  "endgame_challenge",
  "full_unlock",
  "cast_strike",
  "school_flash",
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
  | { type: "decor_purchased"; replayed?: boolean }
  | { type: "iap_cosmetic_granted"; replayed?: boolean }
  | { type: "endgame_tier_unlocked" }
  | { type: "endgame_challenge_completed" }
  | { type: "contract_accepted"; replayed?: boolean }
  | { type: "bait_purchased"; replayed?: boolean }
  | { type: "full_harbor_unlock_granted"; replayed?: boolean }
  | { type: "machine_broke" }
  | { type: "items_spoiled" }
  | { type: "cast_strike_reel" }
  | { type: "spoil_pressure_warn" }
  | { type: "service_queue_pressure" }
  | { type: "contract_deadline_warn" }
  | { type: "quest_near_complete" }
  | { type: "nest_settle_pulse" }
  | { type: "roast_cycle_ready" }
  | { type: "ferment_cycle_ready" }
  | { type: "school_flash" }
  | { type: "aurora_crest" }
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
    case "decor_purchased":
      return e.replayed ? null : "decor";
    case "iap_cosmetic_granted":
      return e.replayed ? null : "cosmetic";
    case "endgame_tier_unlocked":
      return "endgame_tier";
    case "endgame_challenge_completed":
      return "endgame_challenge";
    case "contract_accepted":
      return e.replayed ? null : "contract_accept";
    case "bait_purchased":
      return e.replayed ? null : "bait";
    case "full_harbor_unlock_granted":
      return e.replayed ? null : "full_unlock";
    case "machine_broke":
      return "machine_break";
    case "items_spoiled":
      return "spoil";
    case "cast_strike_reel":
      return "cast_strike";
    case "spoil_pressure_warn":
      return "spoil_warn";
    case "service_queue_pressure":
      return "service_queue";
    case "contract_deadline_warn":
      return "contract_deadline";
    case "quest_near_complete":
      return "quest_near";
    case "nest_settle_pulse":
      return "nest_settle";
    case "roast_cycle_ready":
      return "roast_ready";
    case "ferment_cycle_ready":
      return "ferment_ready";
    case "school_flash":
      return "school_flash";
    case "aurora_crest":
      return "aurora_crest";
    default:
      return null;
  }
}

/** Web public path for an authored clip. */
export function sfxPublicPath(cue: SfxCue): string {
  return `/sfx/${cue}.wav`;
}
