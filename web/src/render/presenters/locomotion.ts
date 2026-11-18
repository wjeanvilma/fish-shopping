/**
 * Finish 4.0 Phase 6 — renderer presenters (split from monolithic presenters.ts).
 */
/** Phase 15 locomotion clips driven by presenters (no sim mutation). */
export type LocomotionClip = "idle" | "walk" | "carry" | "cast";

/** Character pose (Phase 22/15). Roots use x/z/yaw; bodies use bobY/swayRad/clip. */
export interface CharacterPose {
  x: number;
  z: number;
  yaw: number;
  walkPhase: number;
  speed01: number;
  bobY: number;
  swayRad: number;
  idle: boolean;
  /** Active clip for body language (cast rod tip, carry lean, walk sway). */
  clip: LocomotionClip;
  /** 0..1 cast progress when clip === "cast"; otherwise 0. */
  cast01: number;
  /** Forward lean (radians) — stronger while carrying. */
  leanRad: number;
}

/** @deprecated Alias kept for older call sites; prefer CharacterPose. */
export type CrowdMember = CharacterPose;

export const WALK_SPEED_REF_M_PER_S = 1.4;
export const WALK_STRIDE_RAD_PER_M = 4.2;
export const WALK_BOB_AMP_M = 0.05;
export const WALK_SWAY_RAD = 0.08;
export const IDLE_SPEED_M_PER_S = 0.05;
export const IDLE_BREATH_AMP_M = 0.012;
export const IDLE_BREATH_RAD_PER_S = 2.2;
export const QUEUE_IDLE_BREATH_MULT = 1.35;
export const PLAYER_SMOOTHING_PER_SECOND = 18;
export const CROWD_SMOOTHING_PER_SECOND = 10;
export const WORKER_SMOOTHING_PER_SECOND = 12;
/** Rest local Y of PlayerBody / CustomerBody_N / WorkerBody_N in the harbor GLB. */
export const PLAYER_BODY_REST_Y = 0.8;
export const CUSTOMER_BODY_REST_Y = 0.75;
export const WORKER_BODY_REST_Y = 0.78;
export const PLAYER_NOSE_REST_Y = 1.25;
export const PLAYER_NOSE_REST_Z = 0.32;
export const PLAYER_ROD_REST_Y = 0.55;
export const PLAYER_ROD_REST_X = 0.28;
export const PLAYER_ROD_REST_Z = 0.05;
export const WORKER_POOL = 12;

/** Pick idle/walk/carry/cast from motion + inventory + fishing (presentation only). */
export function pickLocomotionClip(opts: {
  moving: boolean;
  carrying: boolean;
  casting: boolean;
}): LocomotionClip {
  if (opts.casting) return "cast";
  if (opts.moving && opts.carrying) return "carry";
  if (opts.moving) return "walk";
  if (opts.carrying) return "carry";
  return "idle";
}

export const LEAVE_SPEED_M_PER_S = 2;
/** Queued customers face the counter (toward -z, back at the player and camera). */
export const QUEUE_YAW = Math.PI;

/**
 * Advance walk/idle phases from smoothed displacement. Pure helper for unit tests.
 * [queuedIdle] boosts breath when standing in a customer queue.
 */
export function locomoteFromMotion(
  prevX: number,
  prevZ: number,
  x: number,
  z: number,
  yaw: number,
  walkPhase: number,
  idlePhase: number,
  dt: number,
  queuedIdle = false,
  opts: { carrying?: boolean; casting?: boolean; cast01?: number } = {},
): { pose: CharacterPose; walkPhase: number; idlePhase: number } {
  const speed = dt > 1e-6 ? Math.hypot(x - prevX, z - prevZ) / dt : 0;
  const speed01 = Math.min(1, speed / WALK_SPEED_REF_M_PER_S);
  const idle = speed < IDLE_SPEED_M_PER_S;
  const carrying = !!opts.carrying;
  const casting = !!opts.casting;
  const cast01 = casting ? Math.min(1, Math.max(0, opts.cast01 ?? 0)) : 0;
  const clip = pickLocomotionClip({ moving: !idle, carrying, casting });
  let wp = walkPhase;
  let ip = idlePhase;
  if (clip === "cast") ip += dt * IDLE_BREATH_RAD_PER_S;
  else if (!idle) wp += speed * WALK_STRIDE_RAD_PER_M;
  else ip += dt * IDLE_BREATH_RAD_PER_S;
  const breath = IDLE_BREATH_AMP_M * (queuedIdle ? QUEUE_IDLE_BREATH_MULT : 1);
  let bobY: number;
  let swayRad: number;
  let leanRad: number;
  if (clip === "cast") {
    bobY = breath * 0.5 * Math.sin(ip);
    swayRad = -0.12 - 0.25 * cast01;
    leanRad = -0.08 - 0.18 * cast01;
  } else if (clip === "carry") {
    bobY = idle
      ? breath * Math.sin(ip)
      : WALK_BOB_AMP_M * 0.7 * Math.abs(Math.sin(wp)) * speed01;
    swayRad = idle
      ? 0.02 * Math.sin(ip)
      : WALK_SWAY_RAD * 0.75 * Math.sin(wp) * speed01;
    leanRad = 0.12 + (idle ? 0 : 0.08 * speed01);
  } else if (clip === "walk") {
    bobY = WALK_BOB_AMP_M * Math.abs(Math.sin(wp)) * speed01;
    swayRad = WALK_SWAY_RAD * Math.sin(wp) * speed01;
    leanRad = 0.04 * speed01;
  } else {
    bobY = breath * Math.sin(ip);
    swayRad = (queuedIdle ? 0.035 : 0.015) * Math.sin(ip * (queuedIdle ? 0.65 : 1));
    leanRad = 0;
  }
  return {
    pose: { x, z, yaw, walkPhase: wp, speed01, bobY, swayRad, idle, clip, cast01, leanRad },
    walkPhase: wp,
    idlePhase: ip,
  };
}
