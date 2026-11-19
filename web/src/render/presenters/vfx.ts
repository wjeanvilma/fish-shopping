/**
 * Finish 4.0 Phase 6 — renderer presenters (split from monolithic presenters.ts).
 */
import type { SimView } from "../../engine";
import {
  FLYING_TRANSFER_ARC_HEIGHT_M,
  FLYING_TRANSFER_BASE_Y_M,
  FLYING_TRANSFER_DURATION_S,
  FLYING_TRANSFER_POOL,
  shortId,
  type PresenterQuality,
} from "./quality";

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
/** Finish 5.0 Phase 27 denser-scene burst pool for 12 harbors. */
export const VFX_BURST_POOL = 10;
export const VFX_BURST_POOL_BY_QUALITY = {
  low: 2,
  medium: 5,
  high: VFX_BURST_POOL,
} as const;

export function worldBurstPoolForQuality(quality: PresenterQuality): number {
  return VFX_BURST_POOL_BY_QUALITY[quality];
}

/** Finish 2.0/3.0/4.0 event burst kinds. */
export type WorldBurstKind =
  | "catch"
  | "pay"
  | "celebrate"
  | "machine_done"
  | "achievement"
  | "festival"
  | "contract_done"
  | "goal_claim"
  | "rival_beat"
  | "prestige"
  | "trophy_set"
  | "harbor_travel"
  | "hire"
  | "loan"
  | "decor"
  | "cosmetic"
  | "endgame_tier"
  | "endgame_challenge"
  | "contract_accept"
  | "bait"
  | "full_unlock"
  | "cast_strike"
  | "spoil"
  | "machine_break"
  | "contract_deadline"
  | "quest_near";

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
  rival_beat: 0.5,
  prestige: 0.65,
  trophy_set: 0.55,
  harbor_travel: 0.45,
  hire: 0.35,
  loan: 0.4,
  decor: 0.35,
  cosmetic: 0.45,
  endgame_tier: 0.6,
  endgame_challenge: 0.55,
  contract_accept: 0.35,
  bait: 0.3,
  full_unlock: 0.65,
  cast_strike: 0.35,
  spoil: 0.4,
  machine_break: 0.45,
  contract_deadline: 0.4,
  quest_near: 0.35,
};

/** Phase 21 + Finish 2.0/3.0/4.0/5.0 shake kinds. */
export type ShakeKind =
  | "catch"
  | "cut"
  | "sale"
  | "celebrate"
  | "achievement"
  | "festival"
  | "rival_beat"
  | "prestige"
  | "endgame_tier"
  | "endgame_challenge"
  | "cast_strike"
  | "contract_deadline";

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
  rival_beat: 0.07,
  prestige: 0.08,
  endgame_tier: 0.08,
  endgame_challenge: 0.07,
  cast_strike: 0.06,
  contract_deadline: 0.07,
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

/** Finish 3.0 Phase 24 — rival beaten cue at the player. */
export function resolveRivalBeatBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "rival_beat" };
}

/** Finish 3.0 Phase 24 — prestige unlock at the player. */
export function resolvePrestigeBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "prestige" };
}

/** Finish 3.0 Phase 24 — trophy set complete at the player. */
export function resolveTrophySetBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "trophy_set" };
}

/** Finish 3.0 Phase 24 — harbor travel at the player. */
export function resolveHarborTravelBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "harbor_travel" };
}

/** Finish 3.0 Phase 24 — worker hire at the player. */
export function resolveHireBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "hire" };
}

/** Finish 3.0 Phase 24 — loan taken at the player. */
export function resolveLoanBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "loan" };
}

/** Finish 4.0 Phase 23 — decor purchase at the player. */
export function resolveDecorBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "decor" };
}

/** Finish 4.0 Phase 23 — cosmetic grant at the player. */
export function resolveCosmeticBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "cosmetic" };
}

/** Finish 4.0 Phase 23 — endgame tier unlock at the player. */
export function resolveEndgameTierBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "endgame_tier" };
}

/** Finish 4.0 Phase 23 — endgame challenge clear at the player. */
export function resolveEndgameChallengeBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "endgame_challenge" };
}

/** Finish 4.0 Phase 23 — contract accept at the player. */
export function resolveContractAcceptBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "contract_accept" };
}

/** Finish 4.0 Phase 23 — bait purchase at the player. */
export function resolveBaitBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "bait" };
}

/** Finish 4.0 Phase 23 — full harbor unlock at the player. */
export function resolveFullUnlockBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "full_unlock" };
}

/** Finish 5.0 Phase 12 — cast strike splash at the player. */
export function resolveCastStrikeBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "cast_strike" };
}

/** Finish 5.0 Phase 12 — spoil cue at the player. */
export function resolveSpoilBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "spoil" };
}

/** Finish 5.0 Phase 12 — machine break flash above station output, else player. */
export function resolveMachineBreakBurst(v: SimView, stationId?: string): WorldBurstCue {
  if (stationId) {
    const anchor = v.transferAnchors.find((a) => a.inventoryId === `inv.${stationId}.output`);
    if (anchor) return { xMm: anchor.xMm, zMm: anchor.zMm, kind: "machine_break" };
  }
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "machine_break" };
}

/** Finish 5.0 Phase 12 — contract deadline warn at the player. */
export function resolveContractDeadlineBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "contract_deadline" };
}

/** Finish 5.0 Phase 12 — quest near-complete cue at the player. */
export function resolveQuestNearBurst(v: SimView): WorldBurstCue {
  return { xMm: v.player.xMm, zMm: v.player.zMm, kind: "quest_near" };
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
        s.kind === "celebrate" ||
        s.kind === "achievement" ||
        s.kind === "festival" ||
        s.kind === "prestige" ||
        s.kind === "rival_beat" ||
        s.kind === "trophy_set" ||
        s.kind === "endgame_tier" ||
        s.kind === "endgame_challenge" ||
        s.kind === "full_unlock" ||
        s.kind === "cosmetic"
          ? 1.4
          : s.kind === "catch"
            ? 0.85
            : 1.0;
      const scale = kindScale * (0.35 + 1.1 * rise);
      const opacity = 1 - t * t;
      const y = 0.35 + (
        s.kind === "celebrate" ||
        s.kind === "achievement" ||
        s.kind === "festival" ||
        s.kind === "prestige" ||
        s.kind === "rival_beat" ||
        s.kind === "trophy_set" ||
        s.kind === "endgame_tier" ||
        s.kind === "endgame_challenge" ||
        s.kind === "full_unlock" ||
        s.kind === "cosmetic"
          ? 1.1
          : s.kind === "catch"
            ? 0.55
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
