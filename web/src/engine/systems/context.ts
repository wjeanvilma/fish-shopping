/**
 * Shared step context + walkability helpers for engine systems.
 */
import type { HarborDef } from "../content";
import { rectContains } from "../content";
import type { ContentPack } from "../content";
import type { GameState, GameEvent } from "../state";

export class StepContext {
  readonly events: GameEvent[] = [];
  constructor(readonly content: ContentPack, readonly state: GameState) {}
  /** Resolved each access so travel_to_harbor takes effect mid-tick. */
  get harbor(): HarborDef { return this.content.harbor(this.state.harborId); }
  emit(e: GameEvent): void { this.events.push(e); }
}

export const PLAYER_RADIUS_MM = 300;

export function isOpen(h: HarborDef, x: number, z: number): boolean {
  return h.walkable.some((w) => rectContains(w, x, z)) &&
    !h.obstacles.some((o) =>
      x >= o.minX - PLAYER_RADIUS_MM && x < o.maxX + PLAYER_RADIUS_MM &&
      z >= o.minZ - PLAYER_RADIUS_MM && z < o.maxZ + PLAYER_RADIUS_MM);
}
