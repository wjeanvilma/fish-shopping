/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; AudioBus plays authored Phase 19 clips (or stays silent when muted).
 */
export type SfxCue =
  | "catch"
  | "machine_done"
  | "sale"
  | "ui"
  | "abandon"
  | "upgrade"
  | "rush";

/** All authored pack cue ids (Phase 19). */
export const SFX_CUES: readonly SfxCue[] = [
  "catch",
  "machine_done",
  "sale",
  "ui",
  "abandon",
  "upgrade",
  "rush",
] as const;

/** Cues that should also pulse a short haptic on Android / vibrate on web. */
export const HAPTIC_CUES: ReadonlySet<SfxCue> = new Set(["catch", "sale"]);

/** Minimal event shape so Kotlin/TS hosts can share the mapping rules. */
export type SfxEvent =
  | { type: "fish_caught" }
  | { type: "batch_completed" }
  | { type: "sale_committed" }
  | { type: "customer_left"; paid: boolean }
  | { type: "upgrade_purchased"; replayed: boolean }
  | { type: "rush_started" }
  | { type: "panel_opened" }
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
    default:
      return null;
  }
}

/** Web public path for an authored clip. */
export function sfxPublicPath(cue: SfxCue): string {
  return `/sfx/${cue}.wav`;
}
