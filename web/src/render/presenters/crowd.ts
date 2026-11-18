/**
 * Finish 4.0 Phase 6 — renderer presenters (split from monolithic presenters.ts).
 */
import type { SimView } from "../../engine";
import {
  LEAVE_SPEED_M_PER_S,
  QUEUE_YAW,
  PLAYER_SMOOTHING_PER_SECOND,
  CROWD_SMOOTHING_PER_SECOND,
  WORKER_SMOOTHING_PER_SECOND,
  WORKER_POOL,
  locomoteFromMotion,
  type CharacterPose,
} from "./locomotion";

/** Eases the player toward SimView and attaches walk/idle/carry/cast body language. */
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

