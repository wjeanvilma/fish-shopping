/**
 * Renderer-independent presentation logic. Pure functions of SimView, so they are easy to
 * test and to mirror in the Android renderer (render/Presenters.kt). They never affect rules.
 */
import type { SimView } from "../engine";

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

export interface CrowdMember { x: number; z: number; yaw: number }

const LEAVE_SPEED_M_PER_S = 2;
const SMOOTHING_PER_SECOND = 10;
/** Queued customers face the counter (toward -z, back at the player and camera). */
const QUEUE_YAW = Math.PI;

/**
 * Maps simulation customers onto a fixed pool of character models. Arriving and queued
 * customers follow their SimView position; customers that disappear from the view (paid
 * or gave up) walk back to the entry before their model is freed.
 */
export class CustomerCrowd {
  private readonly members: (null | { id: string; x: number; z: number; yaw: number; leaving: boolean })[];

  constructor(poolSize: number) {
    this.members = Array.from({ length: poolSize }, () => null);
  }

  update(v: SimView, dt: number): (CrowdMember | null)[] {
    const present = new Map(v.customers.map((c) => [c.id, c]));
    const exitX = v.customerEntryXMm / 1000;
    const exitZ = v.customerEntryZMm / 1000;
    const k = 1 - Math.exp(-SMOOTHING_PER_SECOND * dt);

    // Departures: anyone we track who is no longer in the simulation walks out.
    for (const m of this.members) if (m && !m.leaving && !present.has(m.id)) m.leaving = true;

    // Arrivals: give new customers a free model at their (entry) position.
    for (const c of v.customers) {
      if (this.members.some((m) => m?.id === c.id)) continue;
      const free = this.members.findIndex((m) => m === null);
      if (free < 0) continue; // pool exhausted: customer simply is not drawn
      this.members[free] = { id: c.id, x: c.xMm / 1000, z: c.zMm / 1000, yaw: 0, leaving: false };
    }

    return this.members.map((m, i) => {
      if (!m) return null;
      let tx: number, tz: number;
      if (m.leaving) {
        const dx = exitX - m.x, dz = exitZ - m.z;
        const d = Math.hypot(dx, dz);
        const stepLen = LEAVE_SPEED_M_PER_S * dt;
        if (d <= Math.max(stepLen, 0.05)) {
          this.members[i] = null;
          return null;
        }
        m.yaw = Math.atan2(dx, dz);
        m.x += (dx / d) * stepLen;
        m.z += (dz / d) * stepLen;
        return { x: m.x, z: m.z, yaw: m.yaw };
      }
      const c = present.get(m.id)!;
      tx = c.xMm / 1000;
      tz = c.zMm / 1000;
      const dx = tx - m.x, dz = tz - m.z;
      const targetYaw = Math.hypot(dx, dz) > 0.02 ? Math.atan2(dx, dz) : c.arrived ? QUEUE_YAW : m.yaw;
      m.x += dx * k;
      m.z += dz * k;
      let dy = targetYaw - m.yaw;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      m.yaw += dy * k;
      return { x: m.x, z: m.z, yaw: m.yaw };
    });
  }
}
