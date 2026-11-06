/**
 * Renderer-independent presentation logic. Pure functions of SimView, so they are easy to
 * test and to mirror in the Android renderer (render/Presenters.kt). They never affect rules.
 */
import type { SimView } from "../engine";

/** Default pool size for flying transfer meshes (Fly_N_fish|portion in the GLB). */
export const FLYING_TRANSFER_POOL = 12;
/** Arc flight time in seconds. */
export const FLYING_TRANSFER_DURATION_S = 0.35;
/** Peak height of the parabolic arc above the ground (meters). */
export const FLYING_TRANSFER_ARC_HEIGHT_M = 0.9;
const FLYING_TRANSFER_BASE_Y_M = 0.25;

const shortId = (id: string) => id.slice(id.indexOf(".") + 1);

/**
 * Which pooled item slots are visible. Slot names follow the GLB contract written by
 * shared/tools/generate_blockout.py: Bag_<i>_fish|portion, In_<station>_<i>, Out_<station>_<i>,
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

/** Grey-box locomotion pose (Phase 22). Roots use x/z/yaw; bodies use bobY/swayRad. */
export interface CharacterPose {
  x: number;
  z: number;
  yaw: number;
  walkPhase: number;
  speed01: number;
  bobY: number;
  swayRad: number;
  idle: boolean;
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
/** Rest local Y of PlayerBody / CustomerBody_N in the blockout GLB. */
export const PLAYER_BODY_REST_Y = 0.8;
export const CUSTOMER_BODY_REST_Y = 0.75;
export const PLAYER_NOSE_REST_Y = 1.25;
export const PLAYER_NOSE_REST_Z = 0.32;

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
): { pose: CharacterPose; walkPhase: number; idlePhase: number } {
  const speed = dt > 1e-6 ? Math.hypot(x - prevX, z - prevZ) / dt : 0;
  const speed01 = Math.min(1, speed / WALK_SPEED_REF_M_PER_S);
  const idle = speed < IDLE_SPEED_M_PER_S;
  let wp = walkPhase;
  let ip = idlePhase;
  if (!idle) wp += speed * WALK_STRIDE_RAD_PER_M;
  else ip += dt * IDLE_BREATH_RAD_PER_S;
  const breath = IDLE_BREATH_AMP_M * (queuedIdle ? QUEUE_IDLE_BREATH_MULT : 1);
  const bobY = idle
    ? breath * Math.sin(ip)
    : WALK_BOB_AMP_M * Math.abs(Math.sin(wp)) * speed01;
  const swayRad = idle
    ? (queuedIdle ? 0.035 : 0.015) * Math.sin(ip * (queuedIdle ? 0.65 : 1))
    : WALK_SWAY_RAD * Math.sin(wp) * speed01;
  return {
    pose: { x, z, yaw, walkPhase: wp, speed01, bobY, swayRad, idle },
    walkPhase: wp,
    idlePhase: ip,
  };
}

/**
 * Eases the player toward SimView and attaches grey-box walk/idle body language.
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

  update(player: SimView["player"], dt: number): CharacterPose {
    const tx = player.xMm / 1000;
    const tz = player.zMm / 1000;
    const tyaw = Math.atan2(player.facingX, player.facingZ);
    if (Number.isNaN(this.x)) {
      this.x = tx;
      this.z = tz;
      this.yaw = tyaw;
      return locomoteFromMotion(tx, tz, tx, tz, tyaw, 0, 0, 0).pose;
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
      this.walkPhase, this.idlePhase, dt, false,
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

  constructor(poolSize: number) {
    this.members = Array.from({ length: poolSize }, () => null);
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
      const free = this.members.findIndex((m) => m === null);
      if (free < 0) continue; // pool exhausted: customer simply is not drawn
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
  private readonly slots: (null | {
    fromX: number; fromZ: number; toX: number; toZ: number;
    kind: string; age: number;
  })[];

  constructor(poolSize = FLYING_TRANSFER_POOL) {
    this.slots = Array.from({ length: poolSize }, () => null);
  }

  clear(): void {
    for (let i = 0; i < this.slots.length; i++) this.slots[i] = null;
  }

  /** Enqueue a cue; drops silently when the pool is full. */
  spawn(cue: FlyingTransferCue): boolean {
    const free = this.slots.findIndex((s) => s === null);
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
      if (t >= 1) {
        this.slots[i] = null;
        return null;
      }
      return { x, y, z, kind: s.kind };
    });
  }
}
