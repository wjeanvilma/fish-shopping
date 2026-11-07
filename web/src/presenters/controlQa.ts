/**
 * Phase 20 — touch & desktop control QA contracts (presentation-only).
 * Blueprint min touch target is 48dp; HUD owns essential copy (not world textures).
 */
import { JOYSTICK_BASE_DIAMETER, type GameSettings, type JoystickScale, type JoystickSide } from "../game/settingsStore";
import { TAP_ARRIVE_MM } from "./tapToMove";

/** Blueprint / design-token minimum interactive target. */
export const MIN_TOUCH_TARGET_DP = 48;

export const KEYBOARD_SHORTCUTS = [
  { keys: ["W", "A", "S", "D"], action: "Move" },
  { keys: ["↑", "↓", "←", "→"], action: "Move" },
  { keys: ["F", "Space"], action: "Reel" },
  { keys: ["R"], action: "Cycle recipe" },
  { keys: ["P"], action: "Pause" },
  { keys: ["Esc"], action: "Close panel / pause" },
  { keys: ["M"], action: "Map" },
  { keys: ["U"], action: "Upgrades" },
  { keys: ["H"], action: "Staff" },
  { keys: ["G"], action: "Goals" },
  { keys: ["J"], action: "Jobs" },
  { keys: ["I"], action: "Warehouse" },
  { keys: ["Y"], action: "Dashboard" },
  { keys: ["B"], action: "Species book" },
] as const;

/** Compact desktop pad copy — always HUD-backed, never a world texture. */
export function desktopKeysHint(opts: { tapToMove: boolean }): string {
  const base = "Move WASD / arrows · Reel F · Pause P";
  return opts.tapToMove ? `${base} · Tap harbor to walk` : base;
}

/** Full settings-panel controls blurb (HUD / settings sheet only). */
export function controlsHelpLine(): string {
  return "Move WASD / arrows · Reel Space / F · Recipe R · Pause P · Map M · Warehouse I · Goals G · Jobs J · Staff H · Dash Y · Species book B · Upgrades U · Esc closes panels";
}

/** Short touch tip when tap-to-move is enabled (HUD overlay, not world text). */
export function tapToMoveHint(): string {
  return "Tap the harbor to walk";
}

/** True when a GLB node name is a socket/pad — not player-facing instructional copy. */
export function isWorldSocketName(name: string): boolean {
  return /^(Zone_|Footprint_|In_|Out_|Stock_|Player|Pier|Ground_|Water|Decor_)/.test(name);
}

/** Rejects mesh names that look like sentences / tutorial copy baked into the world. */
export function looksLikeEssentialWorldText(name: string): boolean {
  if (isWorldSocketName(name)) return false;
  if (name.includes(" ")) return true;
  if (/tap|press|walk|reel|buy|sell|hire|upgrade|tutorial|hint/i.test(name)) return true;
  return false;
}

export function joystickDiameterDp(scale: JoystickScale): number {
  return JOYSTICK_BASE_DIAMETER * scale;
}

/** Defaults expected after a fresh install / empty settings store. */
export function controlDefaultsMatch(settings: Pick<
  GameSettings,
  "joystickSide" | "joystickScale" | "tapToMove"
>): boolean {
  return settings.joystickSide === "left"
    && settings.joystickScale === 1
    && settings.tapToMove === false;
}

export function assertControlQaInvariants(opts: {
  actionMinHeightPx: number;
  joystickSide: JoystickSide;
  joystickScale: JoystickScale;
  tapArriveMm?: number;
}): string[] {
  const errors: string[] = [];
  if (opts.actionMinHeightPx < MIN_TOUCH_TARGET_DP) {
    errors.push(`actionMinHeightPx ${opts.actionMinHeightPx} < ${MIN_TOUCH_TARGET_DP}`);
  }
  const diameter = joystickDiameterDp(opts.joystickScale);
  if (diameter < MIN_TOUCH_TARGET_DP) {
    errors.push(`joystick diameter ${diameter} < ${MIN_TOUCH_TARGET_DP}`);
  }
  if (opts.joystickSide !== "left" && opts.joystickSide !== "right") {
    errors.push(`invalid joystickSide ${opts.joystickSide}`);
  }
  const arrive = opts.tapArriveMm ?? TAP_ARRIVE_MM;
  if (arrive <= 0) errors.push("tap arrive distance must be positive");
  return errors;
}

/**
 * Essential player-facing strings that must come from HUD / sim view — never as the
 * sole source baked into harbor GLB mesh names.
 */
export const HUD_ESSENTIAL_COPY_KEYS = [
  "objective",
  "context",
  "coins",
  "station status",
  "tutorial / coaching",
] as const;
