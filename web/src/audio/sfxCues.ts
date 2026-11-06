/**
 * Presentation-only SFX cues derived from sim events. No new sim APIs —
 * hosts map GameEvent → cue and the AudioBus plays (or stays silent when muted).
 */
export type SfxCue =
  | "catch"
  | "machine_done"
  | "sale"
  | "abandon"
  | "upgrade"
  | "rush";

/** Cues that should also pulse a short haptic on Android. */
export const HAPTIC_CUES: ReadonlySet<SfxCue> = new Set(["catch", "sale"]);

/** Minimal event shape so Kotlin/TS hosts can share the mapping rules. */
export type SfxEvent =
  | { type: "fish_caught" }
  | { type: "batch_completed" }
  | { type: "sale_committed" }
  | { type: "customer_left"; paid: boolean }
  | { type: "upgrade_purchased"; replayed: boolean }
  | { type: "rush_started" }
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
    default:
      return null;
  }
}
