/**
 * Finish 4.0 Phase 6 — renderer presenters (split from monolithic presenters.ts).
 */
import type { SimView } from "../../engine";


/** Max pool size for flying transfer meshes (Fly_N_fish|portion in the GLB). */
export const FLYING_TRANSFER_POOL = 12;
/** Arc flight time in seconds. */
export const FLYING_TRANSFER_DURATION_S = 0.35;
/** Peak height of the parabolic arc above the ground (meters). */
export const FLYING_TRANSFER_ARC_HEIGHT_M = 0.9;
export const FLYING_TRANSFER_BASE_Y_M = 0.25;

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

export const shortId = (id: string) => id.slice(id.indexOf(".") + 1);

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

