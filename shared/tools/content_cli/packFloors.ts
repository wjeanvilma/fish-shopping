/**
 * Finish 4.0 Phase 28 — content-pack floor checks for authoring CLI.
 * Read-only; never mutates content-pack.json.
 */

export interface PackFloorTargets {
  speciesMin: number;
  questsMin: number;
  harborsMin: number;
  machinesMin: number;
  rivalsMin: number;
  baitsMin: number;
}

/** Finish 4.0 kickoff gapTargets content floors. */
export const FINISH4_PACK_FLOORS: PackFloorTargets = {
  speciesMin: 100,
  questsMin: 50,
  harborsMin: 10,
  machinesMin: 12,
  rivalsMin: 12,
  baitsMin: 12,
};

export interface PackFloorMeasure {
  species: number;
  quests: number;
  harbors: number;
  machines: number;
  rivals: number;
  baits: number;
  met: boolean;
  shortfalls: string[];
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

export function measurePackFloors(
  pack: Record<string, unknown>,
  targets: PackFloorTargets = FINISH4_PACK_FLOORS,
): PackFloorMeasure {
  const rivalsRoot = (pack.rivalMarkets as { rivals?: unknown } | undefined) ?? {};
  const species = asArray(pack.species).length;
  const quests = asArray(pack.quests).length;
  const harbors = asArray(pack.harbors).length;
  const machines = asArray(pack.machines).length;
  const rivals = asArray(rivalsRoot.rivals).length;
  const baits = asArray(pack.bait).length;
  const shortfalls: string[] = [];
  if (species < targets.speciesMin) shortfalls.push(`species ${species}<${targets.speciesMin}`);
  if (quests < targets.questsMin) shortfalls.push(`quests ${quests}<${targets.questsMin}`);
  if (harbors < targets.harborsMin) shortfalls.push(`harbors ${harbors}<${targets.harborsMin}`);
  if (machines < targets.machinesMin) {
    shortfalls.push(`machines ${machines}<${targets.machinesMin}`);
  }
  if (rivals < targets.rivalsMin) shortfalls.push(`rivals ${rivals}<${targets.rivalsMin}`);
  if (baits < targets.baitsMin) shortfalls.push(`baits ${baits}<${targets.baitsMin}`);
  return {
    species,
    quests,
    harbors,
    machines,
    rivals,
    baits,
    met: shortfalls.length === 0,
    shortfalls,
  };
}
