/**
 * Renderer-independent presentation logic. Pure functions of SimView, so they are easy to
 * test and to mirror in the Android renderer (render/Presenters.kt). They never affect rules.
 */
import type { SimView } from "../engine";

/** Max pool size for flying transfer meshes (Fly_N_fish|portion in the GLB). */
export const FLYING_TRANSFER_POOL = 12;
/** Arc flight time in seconds. */
export const FLYING_TRANSFER_DURATION_S = 0.35;
/** Peak height of the parabolic arc above the ground (meters). */
export const FLYING_TRANSFER_ARC_HEIGHT_M = 0.9;
const FLYING_TRANSFER_BASE_Y_M = 0.25;

/** Quality-scaled VFX budget (Phase 29). Caps concurrent arcs; never exceeds GLB pool. */
export const FLYING_TRANSFER_POOL_BY_QUALITY = {
  low: 4,
  medium: 8,
  high: FLYING_TRANSFER_POOL,
} as const;

/**
 * Soft crowd draw cap by quality (Phase 29). Still transform/visibility only —
 * never creates meshes. Clamped to the GLB customer pool at bind time.
 */
export const CROWD_DRAW_CAP_BY_QUALITY = {
  low: 3,
  medium: 5,
  high: 8,
} as const;

export type PresenterQuality = keyof typeof FLYING_TRANSFER_POOL_BY_QUALITY;

export function flyingTransferPoolForQuality(quality: PresenterQuality): number {
  return FLYING_TRANSFER_POOL_BY_QUALITY[quality];
}

export function crowdDrawCapForQuality(quality: PresenterQuality, glbPool: number): number {
  return Math.max(0, Math.min(glbPool, CROWD_DRAW_CAP_BY_QUALITY[quality]));
}

/** Phase 31 — distance fade for zone pads / far helpers (presentation-only). */
export const OCCLUSION_NEAR_M = 14;
export const OCCLUSION_FAR_M = 32;
/** Soft crossfade duration when swapping harbor GLBs. */
export const HARBOR_TRANSITION_S = 0.35;

/** True for blockout nodes that may soft-fade with distance (Zone_* pads). */
export function isOcclusionFadeName(name: string): boolean {
  return name.startsWith("Zone_");
}

const STACK_SLOT = /^(Bag_\d+_(fish|portion)|In_.+_\d+|Out_.+_\d+|Stock_.+_\d+)$/;

/** True for pooled item slot nodes in the harbor GLB (mirrors Presenters.kt). */
export function isStackSlotName(name: string): boolean {
  return STACK_SLOT.test(name);
}

/**
 * 1 at/near the player, 0 beyond [farM]. Linear between near and far.
 * Pure helper mirrored in Presenters.kt.
 */
export function occlusionOpacity(
  distanceM: number,
  nearM = OCCLUSION_NEAR_M,
  farM = OCCLUSION_FAR_M,
): number {
  if (!(farM > nearM)) return distanceM <= nearM ? 1 : 0;
  if (distanceM <= nearM) return 1;
  if (distanceM >= farM) return 0;
  return 1 - (distanceM - nearM) / (farM - nearM);
}

const shortId = (id: string) => id.slice(id.indexOf(".") + 1);

/**
 * Which pooled item slots are visible. Slot names follow the GLB contract written by
 * shared/tools/generate_blockout.py (Phase 14 modular env): Bag_<i>_fish|portion, In_<station>_<i>, Out_<station>_<i>,
 * Stock_<counter>_<i>. Returns [name, visible] for every name in [slotNames].
 */
export function stackVisibility(v: SimView, slotNames: Iterable<string>): [string, boolean][] {
  const shown = new Set<string>();
  // Carried stack: items in bag order, one slot per carry unit.
  let i = 0;
  for (const item of v.bag) {
    const kind = item.itemId.startsWith("species.") ? "fish" : "portion";
    for (let n = 0; n < item.count; n++) shown.add(`Bag_${i++}_${kind}`);
  }
  for (const st of v.stations) {
    const s = shortId(st.stationId);
    for (let k = 0; k < st.inputCount; k++) shown.add(`In_${s}_${k}`);
    for (let k = 0; k < st.outputCount; k++) shown.add(`Out_${s}_${k}`);
  }
  for (const c of v.counters) {
    const s = shortId(c.counterId);
    for (let k = 0; k < c.stock; k++) shown.add(`Stock_${s}_${k}`);
  }
  return [...slotNames].map((n) => [n, shown.has(n)]);
}

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

const LEAVE_SPEED_M_PER_S = 2;
/** Queued customers face the counter (toward -z, back at the player and camera). */
const QUEUE_YAW = Math.PI;

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

/**
 * Eases the player toward SimView and attaches walk/idle/carry/cast body language.
 */
export class PlayerSmoother {
  private x = Number.NaN;
  private z = 0;
  private yaw = 0;
  private walkPhase = 0;
  private idlePhase = 0;

  reset(): void {
    this.x = Number.NaN;
  }

  update(
    player: SimView["player"],
    dt: number,
    reducedMotion = false,
    extras: { bagUsedUnits?: number; fishingProgress?: number | null } = {},
  ): CharacterPose {
    const tx = player.xMm / 1000;
    const tz = player.zMm / 1000;
    const tyaw = Math.atan2(player.facingX, player.facingZ);
    const carrying = (extras.bagUsedUnits ?? 0) > 0;
    const cast01 = extras.fishingProgress ?? null;
    const casting = cast01 !== null && cast01 !== undefined;
    const clipOpts = { carrying, casting, cast01: cast01 ?? 0 };
    if (Number.isNaN(this.x) || reducedMotion) {
      this.x = tx;
      this.z = tz;
      this.yaw = tyaw;
      this.walkPhase = 0;
      this.idlePhase = 0;
      const snapped = locomoteFromMotion(tx, tz, tx, tz, tyaw, 0, 0, 0, false, clipOpts).pose;
      return reducedMotion
        ? { ...snapped, bobY: 0, swayRad: 0, leanRad: 0, cast01: casting ? snapped.cast01 : 0 }
        : snapped;
    }
    const prevX = this.x;
    const prevZ = this.z;
    const k = 1 - Math.exp(-PLAYER_SMOOTHING_PER_SECOND * dt);
    this.x += (tx - this.x) * k;
    this.z += (tz - this.z) * k;
    let d = tyaw - this.yaw;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    this.yaw += d * k;
    const moved = locomoteFromMotion(
      prevX, prevZ, this.x, this.z, this.yaw,
      this.walkPhase, this.idlePhase, dt, false, clipOpts,
    );
    this.walkPhase = moved.walkPhase;
    this.idlePhase = moved.idlePhase;
    return moved.pose;
  }
}

/**
 * Maps simulation customers onto a fixed pool of character models. Arriving and queued
 * customers follow their SimView position; customers that disappear from the view (paid
 * or gave up) walk back to the entry before their model is freed.
 */
export class CustomerCrowd {
  private readonly members: (null | {
    id: string; x: number; z: number; yaw: number; leaving: boolean; leaveTargetIndex: number;
    walkPhase: number; idlePhase: number;
  })[];
  /** Soft draw budget ≤ GLB pool (Phase 29). Indices ≥ drawCap stay unused. */
  private drawCap: number;

  constructor(poolSize: number) {
    this.members = Array.from({ length: poolSize }, () => null);
    this.drawCap = poolSize;
  }

  get poolSize(): number {
    return this.members.length;
  }

  /** Clamp how many customers may occupy pooled models. */
  setDrawCap(cap: number): void {
    this.drawCap = Math.max(0, Math.min(this.members.length, Math.floor(cap)));
    for (let i = this.drawCap; i < this.members.length; i++) this.members[i] = null;
  }

  update(v: SimView, dt: number): (CharacterPose | null)[] {
    const present = new Map(v.customers.map((c) => [c.id, c]));
    const leavePath = buildLeavePathMeters(v);
    const k = 1 - Math.exp(-CROWD_SMOOTHING_PER_SECOND * dt);

    // Departures: anyone we track who is no longer in the simulation walks out along the reverse approach.
    for (const m of this.members) {
      if (m && !m.leaving && !present.has(m.id)) {
        m.leaving = true;
        m.leaveTargetIndex = 0;
      }
    }

    // Arrivals: give new customers a free model at their (entry) position.
    for (const c of v.customers) {
      if (this.members.some((m) => m?.id === c.id)) continue;
      let free = -1;
      for (let i = 0; i < this.drawCap; i++) {
        if (this.members[i] === null) { free = i; break; }
      }
      if (free < 0) continue; // pool / quality budget exhausted: customer simply is not drawn
      this.members[free] = {
        id: c.id, x: c.xMm / 1000, z: c.zMm / 1000, yaw: 0,
        leaving: false, leaveTargetIndex: 0, walkPhase: 0, idlePhase: 0,
      };
    }

    return this.members.map((m, i) => {
      if (!m) return null;
      if (m.leaving) {
        while (m.leaveTargetIndex < leavePath.length) {
          const [tx, tz] = leavePath[m.leaveTargetIndex]!;
          const dx = tx - m.x, dz = tz - m.z;
          const d = Math.hypot(dx, dz);
          const stepLen = LEAVE_SPEED_M_PER_S * dt;
          if (d <= Math.max(stepLen, 0.05)) {
            m.leaveTargetIndex++;
            continue;
          }
          const prevX = m.x;
          const prevZ = m.z;
          m.yaw = Math.atan2(dx, dz);
          m.x += (dx / d) * stepLen;
          m.z += (dz / d) * stepLen;
          const moved = locomoteFromMotion(
            prevX, prevZ, m.x, m.z, m.yaw, m.walkPhase, m.idlePhase, dt, false,
          );
          m.walkPhase = moved.walkPhase;
          m.idlePhase = moved.idlePhase;
          return moved.pose;
        }
        this.members[i] = null;
        return null;
      }
      const c = present.get(m.id)!;
      const tx = c.xMm / 1000;
      const tz = c.zMm / 1000;
      const dx = tx - m.x, dz = tz - m.z;
      const targetYaw = Math.hypot(dx, dz) > 0.02 ? Math.atan2(dx, dz) : c.arrived ? QUEUE_YAW : m.yaw;
      const prevX = m.x;
      const prevZ = m.z;
      m.x += dx * k;
      m.z += dz * k;
      let dy = targetYaw - m.yaw;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      m.yaw += dy * k;
      const moved = locomoteFromMotion(
        prevX, prevZ, m.x, m.z, m.yaw, m.walkPhase, m.idlePhase, dt, c.arrived,
      );
      m.walkPhase = moved.walkPhase;
      m.idlePhase = moved.idlePhase;
      return moved.pose;
    });
  }
}

/**
 * Maps on-shift workers onto a fixed pool of Worker_* models (Phase 15).
 * Off-shift workers release their slot; motion drives walk/carry clips.
 */
export class WorkerCrowd {
  private readonly members: (null | {
    id: string; x: number; z: number; yaw: number;
    walkPhase: number; idlePhase: number;
  })[];

  constructor(poolSize = WORKER_POOL) {
    this.members = Array.from({ length: poolSize }, () => null);
  }

  get poolSize(): number {
    return this.members.length;
  }

  update(v: SimView, dt: number): (CharacterPose | null)[] {
    const present = new Map(
      v.workers.filter((w) => w.onShift).map((w) => [w.id, w]),
    );
    const k = 1 - Math.exp(-WORKER_SMOOTHING_PER_SECOND * dt);

    for (let i = 0; i < this.members.length; i++) {
      const m = this.members[i];
      if (m && !present.has(m.id)) this.members[i] = null;
    }

    for (const w of present.values()) {
      if (this.members.some((m) => m?.id === w.id)) continue;
      let free = -1;
      for (let i = 0; i < this.members.length; i++) {
        if (this.members[i] === null) { free = i; break; }
      }
      if (free < 0) continue;
      this.members[free] = {
        id: w.id, x: w.xMm / 1000, z: w.zMm / 1000, yaw: 0,
        walkPhase: 0, idlePhase: 0,
      };
    }

    return this.members.map((m) => {
      if (!m) return null;
      const w = present.get(m.id)!;
      const tx = w.xMm / 1000;
      const tz = w.zMm / 1000;
      const dx = tx - m.x, dz = tz - m.z;
      const targetYaw = Math.hypot(dx, dz) > 0.02 ? Math.atan2(dx, dz) : m.yaw;
      const prevX = m.x;
      const prevZ = m.z;
      m.x += dx * k;
      m.z += dz * k;
      let dy = targetYaw - m.yaw;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      m.yaw += dy * k;
      const moved = locomoteFromMotion(
        prevX, prevZ, m.x, m.z, m.yaw, m.walkPhase, m.idlePhase, dt, false,
        { carrying: w.bagUsedUnits > 0 },
      );
      m.walkPhase = moved.walkPhase;
      m.idlePhase = moved.idlePhase;
      return moved.pose;
    });
  }
}

/** Reverse approach waypoints, then the harbor entry (meters). */
function buildLeavePathMeters(v: SimView): [number, number][] {
  const points: [number, number][] = [];
  for (let i = v.customerPathWaypoints.length - 1; i >= 0; i--) {
    const p = v.customerPathWaypoints[i]!;
    points.push([p.xMm / 1000, p.zMm / 1000]);
  }
  points.push([v.customerEntryXMm / 1000, v.customerEntryZMm / 1000]);
  return points;
}

/** One sim-authoritative transfer cue (from ItemsTransferred endpoints). */
export interface FlyingTransferCue {
  fromXMm: number;
  fromZMm: number;
  toXMm: number;
  toZMm: number;
  itemId: string;
}

export interface FlyingTransferPose {
  x: number;
  y: number;
  z: number;
  /** "fish" | "portion" — matches Fly_<i>_<kind> GLB nodes. */
  kind: string;
  /** Phase 16: spin while arcing. */
  yaw: number;
  /** Phase 16: slight scale pulse mid-flight. */
  scale: number;
}

/**
 * Resolve ItemsTransferred inventory ids to world anchors on the current SimView.
 * Returns null when either endpoint is unknown (stale worker, etc.).
 */
export function resolveFlyingTransfer(
  v: SimView,
  fromInventoryId: string,
  toInventoryId: string,
  itemId: string,
): FlyingTransferCue | null {
  const from = v.transferAnchors.find((a) => a.inventoryId === fromInventoryId);
  const to = v.transferAnchors.find((a) => a.inventoryId === toInventoryId);
  if (!from || !to) return null;
  return { fromXMm: from.xMm, fromZMm: from.zMm, toXMm: to.xMm, toZMm: to.zMm, itemId };
}

/**
 * Ephemeral bag ↔ pad ↔ counter arcs. Driven by ItemsTransferred cues; never changes
 * stack visibility (sim stacks stay authoritative).
 */
export class FlyingTransfers {
  private slots: (null | {
    fromX: number; fromZ: number; toX: number; toZ: number;
    kind: string; age: number;
  })[];
  private budget: number;

  constructor(poolSize = FLYING_TRANSFER_POOL) {
    this.slots = Array.from({ length: poolSize }, () => null);
    this.budget = poolSize;
  }

  get poolSize(): number {
    return this.slots.length;
  }

  /**
   * Quality VFX budget. Growing expands capacity up to the GLB pool; shrinking
   * drops the oldest excess arcs immediately.
   */
  setBudget(n: number): void {
    const next = Math.max(0, Math.min(this.slots.length, Math.floor(n)));
    this.budget = next;
    for (let i = next; i < this.slots.length; i++) this.slots[i] = null;
  }

  clear(): void {
    for (let i = 0; i < this.slots.length; i++) this.slots[i] = null;
  }

  /** Enqueue a cue; drops silently when the quality budget is full. */
  spawn(cue: FlyingTransferCue): boolean {
    let free = -1;
    for (let i = 0; i < this.budget; i++) {
      if (this.slots[i] === null) { free = i; break; }
    }
    if (free < 0) return false;
    this.slots[free] = {
      fromX: cue.fromXMm / 1000,
      fromZ: cue.fromZMm / 1000,
      toX: cue.toXMm / 1000,
      toZ: cue.toZMm / 1000,
      kind: cue.itemId.startsWith("species.") ? "fish" : "portion",
      age: 0,
    };
    return true;
  }

  update(dt: number): (FlyingTransferPose | null)[] {
    return this.slots.map((s, i) => {
      if (!s) return null;
      s.age += dt;
      const t = Math.min(1, s.age / FLYING_TRANSFER_DURATION_S);
      const e = t * (2 - t); // ease-out quad
      const x = s.fromX + (s.toX - s.fromX) * e;
      const z = s.fromZ + (s.toZ - s.fromZ) * e;
      const y = FLYING_TRANSFER_BASE_Y_M + 4 * FLYING_TRANSFER_ARC_HEIGHT_M * t * (1 - t);
      const yaw = t * Math.PI * 2.4;
      const scale = 1 + 0.35 * Math.sin(Math.PI * t);
      if (t >= 1) {
        this.slots[i] = null;
        return null;
      }
      return { x, y, z, kind: s.kind, yaw, scale };
    });
  }
}

/** Phase 16/21 — pooled world bursts (catch / pay / celebrate / machine_done). */
export const VFX_BURST_POOL = 8;
export const VFX_BURST_POOL_BY_QUALITY = {
  low: 2,
  medium: 4,
  high: VFX_BURST_POOL,
} as const;

export function worldBurstPoolForQuality(quality: PresenterQuality): number {
  return VFX_BURST_POOL_BY_QUALITY[quality];
}

/** Finish 2.0 Phase 22 adds achievement/festival/contract_done/goal_claim. */
export type WorldBurstKind =
  | "catch"
  | "pay"
  | "celebrate"
  | "machine_done"
  | "achievement"
  | "festival"
  | "contract_done"
  | "goal_claim";

export interface WorldBurstCue {
  xMm: number;
  zMm: number;
  kind: WorldBurstKind;
}

export interface WorldBurstPose {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  kind: WorldBurstKind;
}

export interface MachineOperatePulse {
  /** Footprint_* node name in the harbor GLB. */
  footprintName: string;
  /** 0..1 emissive/brightness pulse while PROCESSING. */
  pulse01: number;
}

const BURST_DURATION_S: Record<WorldBurstKind, number> = {
  catch: 0.32,
  pay: 0.45,
  celebrate: 0.7,
  machine_done: 0.4,
  achievement: 0.55,
  festival: 0.6,
  contract_done: 0.4,
  goal_claim: 0.35,
};

/** Phase 21 — screen-shake kinds; Finish 2.0 Phase 22 adds achievement/festival. */
export type ShakeKind = "catch" | "cut" | "sale" | "celebrate" | "achievement" | "festival";

export const SHAKE_DURATION_S = 0.18;
/** Hard cap after quality scale (meters). */
export const MAX_SHAKE_AMPLITUDE_M = 0.12;
export const SHAKE_AMPLITUDE_M: Record<ShakeKind, number> = {
  catch: 0.04,
  cut: 0.03,
  sale: 0.05,
  celebrate: 0.08,
  achievement: 0.06,
  festival: 0.05,
};
export const SHAKE_SCALE_BY_QUALITY = {
  low: 0.5,
  medium: 0.85,
  high: 1.0,
} as const;

export function shakeScaleForQuality(quality: PresenterQuality): number {
  return SHAKE_SCALE_BY_QUALITY[quality];
}

export function cappedShakeAmplitudeM(kind: ShakeKind, quality: PresenterQuality): number {
  const raw = SHAKE_AMPLITUDE_M[kind] * shakeScaleForQuality(quality);
  return Math.min(MAX_SHAKE_AMPLITUDE_M, Math.max(0, raw));
}

export interface ShakeOffset {
  x: number;
  y: number;
}

/**
 * Decaying camera shake. Presentation-only; reduced-motion hosts skip update.
 * Concurrent triggers take the stronger remaining amplitude.
 */
export class ScreenShake {
  private amp = 0;
  private age = 0;
  private duration = SHAKE_DURATION_S;
  private quality: PresenterQuality = "medium";
  private phase = 0;

  setQuality(quality: PresenterQuality): void {
    this.quality = quality;
  }

  clear(): void {
    this.amp = 0;
    this.age = 0;
  }

  trigger(kind: ShakeKind): void {
    const next = cappedShakeAmplitudeM(kind, this.quality);
    const remaining = this.amp * Math.max(0, 1 - this.age / this.duration);
    if (next >= remaining) {
      this.amp = next;
      this.age = 0;
      this.duration = SHAKE_DURATION_S;
      this.phase += 1.7;
    }
  }

  update(dt: number): ShakeOffset {
    if (this.amp <= 0) return { x: 0, y: 0 };
    this.age += dt;
    const t = Math.min(1, this.age / this.duration);
    if (t >= 1) {
      this.amp = 0;
      return { x: 0, y: 0 };
    }
    const envelope = (1 - t) * (1 - t);
    const a = this.amp * envelope;
    const w = this.age * 62 + this.phase;
    return { x: Math.sin(w) * a, y: Math.cos(w * 1.3) * a * 0.55 };
  }
}

/** Footprint socket for a station id (`station.cutter_1` → `Footprint_cutter_1`). */
export function footprintNameForStation(stationId: string): string {
  return `Footprint_${shortId(stationId)}`;
}

/** Soft operate glow for PROCESSING stations (presentation-only). */
export function machineOperatePulses(v: SimView, elapsed: number): MachineOperatePulse[] {
  const out: MachineOperatePulse[] = [];
  for (const st of v.stations) {
    if (st.status !== "PROCESSING") continue;
    const progress = st.progress ?? 0;
    const breath = 0.55 + 0.45 * Math.sin(elapsed * 6 + progress * Math.PI);
    out.push({
      footprintName: footprintNameForStation(st.stationId),
      pulse01: Math.min(1, Math.max(0, breath)),
    });
  }
  return out;
}

/** Catch splash at the player (every fish_caught — Phase 21 juice). */
export function resolveCatchBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "catch" };
}

/** Pay burst at the selling customer, else first counter pad. */
export function resolvePayBurst(v: SimView, customerId: string): WorldBurstCue {
  const c = v.customers.find((x) => x.id === customerId);
  if (c) return { xMm: c.xMm, zMm: c.zMm, kind: "pay" };
  const counter = v.transferAnchors.find((a) => a.inventoryId.startsWith("inv.counter."));
  if (counter) return { xMm: counter.xMm, zMm: counter.zMm, kind: "pay" };
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "pay" };
}

/** Machine-done flash above the station output pad. */
export function resolveMachineDoneBurst(v: SimView, stationId: string): WorldBurstCue | null {
  const anchor = v.transferAnchors.find((a) => a.inventoryId === `inv.${stationId}.output`);
  if (!anchor) return null;
  return { xMm: anchor.xMm, zMm: anchor.zMm, kind: "machine_done" };
}

/** Celebrate at the player (rush / trophy / coin goal / perfect catch). */
export function resolveCelebrateBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "celebrate" };
}

/** Finish 2.0 Phase 22 — achievement sparkle at the player. */
export function resolveAchievementBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "achievement" };
}

/** Finish 2.0 Phase 22 — festival cue at the player (seasonal start). */
export function resolveFestivalBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "festival" };
}

/** Finish 2.0 Phase 22 — contract complete at the player. */
export function resolveContractDoneBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "contract_done" };
}

/** Finish 2.0 Phase 22 — daily goal claim at the player. */
export function resolveGoalClaimBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "goal_claim" };
}

/**
 * Ephemeral world bursts. Quality-budgeted; never mutates sim.
 */
export class WorldBursts {
  private slots: (null | {
    x: number; z: number; kind: WorldBurstKind; age: number; duration: number;
  })[];
  private budget: number;

  constructor(poolSize = VFX_BURST_POOL) {
    this.slots = Array.from({ length: poolSize }, () => null);
    this.budget = poolSize;
  }

  get poolSize(): number {
    return this.slots.length;
  }

  setBudget(n: number): void {
    const next = Math.max(0, Math.min(this.slots.length, Math.floor(n)));
    this.budget = next;
    for (let i = next; i < this.slots.length; i++) this.slots[i] = null;
  }

  clear(): void {
    for (let i = 0; i < this.slots.length; i++) this.slots[i] = null;
  }

  spawn(cue: WorldBurstCue): boolean {
    let free = -1;
    for (let i = 0; i < this.budget; i++) {
      if (this.slots[i] === null) { free = i; break; }
    }
    if (free < 0) return false;
    this.slots[free] = {
      x: cue.xMm / 1000,
      z: cue.zMm / 1000,
      kind: cue.kind,
      age: 0,
      duration: BURST_DURATION_S[cue.kind],
    };
    return true;
  }

  update(dt: number): (WorldBurstPose | null)[] {
    return this.slots.map((s, i) => {
      if (!s) return null;
      s.age += dt;
      const t = Math.min(1, s.age / s.duration);
      const rise = t * (2 - t);
      const kindScale =
        s.kind === "celebrate" || s.kind === "achievement" || s.kind === "festival" ? 1.4
          : s.kind === "catch" ? 0.85
          : 1.0;
      const scale = kindScale * (0.35 + 1.1 * rise);
      const opacity = 1 - t * t;
      const y = 0.35 + (
        s.kind === "celebrate" || s.kind === "achievement" || s.kind === "festival" ? 1.1
          : s.kind === "catch" ? 0.55
          : 0.7
      ) * rise;
      if (t >= 1) {
        this.slots[i] = null;
        return null;
      }
      return { x: s.x, y, z: s.z, scale, opacity, kind: s.kind };
    });
  }
}
