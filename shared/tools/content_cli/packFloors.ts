/**
 * Finish 4.0 Phase 28 + Finish 5.0 Phase 28 — content-pack floor checks for authoring CLI.
 * Read-only; never mutates content-pack.json.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface PackFloorTargets {
  speciesMin: number;
  questsMin: number;
  harborsMin: number;
  machinesMin: number;
  rivalsMin: number;
  baitsMin: number;
  seasonalMin?: number;
  cosmeticsMin?: number;
  chainsMin?: number;
}

/** Finish 4.0 kickoff gapTargets content floors (soft historical). */
export const FINISH4_PACK_FLOORS: PackFloorTargets = {
  speciesMin: 100,
  questsMin: 50,
  harborsMin: 10,
  machinesMin: 12,
  rivalsMin: 12,
  baitsMin: 12,
};

/** Finish 5.0 kickoff gapTargets content floors. */
export const FINISH5_PACK_FLOORS: PackFloorTargets = {
  speciesMin: 125,
  questsMin: 75,
  harborsMin: 12,
  machinesMin: 14,
  rivalsMin: 16,
  baitsMin: 16,
  seasonalMin: 16,
  cosmeticsMin: 24,
  chainsMin: 7,
};

export interface PackFloorMeasure {
  species: number;
  quests: number;
  harbors: number;
  machines: number;
  rivals: number;
  baits: number;
  seasonal: number;
  cosmetics: number;
  chains: number;
  met: boolean;
  shortfalls: string[];
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function loadCosmeticsCount(repoRoot?: string): number {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const root = repoRoot ?? resolve(here, "../../..");
    const ents = JSON.parse(
      readFileSync(resolve(root, "shared/billing/entitlements.json"), "utf8"),
    ) as { cosmetics?: unknown[] };
    return asArray(ents.cosmetics).length;
  } catch {
    return 0;
  }
}

export function measurePackFloors(
  pack: Record<string, unknown>,
  targets: PackFloorTargets = FINISH5_PACK_FLOORS,
  opts?: { repoRoot?: string; cosmeticsOverride?: number },
): PackFloorMeasure {
  const rivalsRoot = (pack.rivalMarkets as { rivals?: unknown } | undefined) ?? {};
  const seasonalRoot = (pack.seasonalEvents as { events?: unknown } | undefined) ?? {};
  const contractsRoot = (pack.contracts as { templates?: Array<{ chainId?: string }> } | undefined) ?? {};
  const species = asArray(pack.species).length;
  const quests = asArray(pack.quests).length;
  const harbors = asArray(pack.harbors).length;
  const machines = asArray(pack.machines).length;
  const rivals = asArray(rivalsRoot.rivals).length;
  const baits = asArray(pack.bait).length;
  const seasonal = asArray(seasonalRoot.events).length;
  const cosmetics =
    opts?.cosmeticsOverride ??
    loadCosmeticsCount(opts?.repoRoot);
  const chains = new Set(
    asArray(contractsRoot.templates)
      .map((t) => t?.chainId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  ).size;

  const shortfalls: string[] = [];
  if (species < targets.speciesMin) shortfalls.push(`species ${species}<${targets.speciesMin}`);
  if (quests < targets.questsMin) shortfalls.push(`quests ${quests}<${targets.questsMin}`);
  if (harbors < targets.harborsMin) shortfalls.push(`harbors ${harbors}<${targets.harborsMin}`);
  if (machines < targets.machinesMin) {
    shortfalls.push(`machines ${machines}<${targets.machinesMin}`);
  }
  if (rivals < targets.rivalsMin) shortfalls.push(`rivals ${rivals}<${targets.rivalsMin}`);
  if (baits < targets.baitsMin) shortfalls.push(`baits ${baits}<${targets.baitsMin}`);
  if ((targets.seasonalMin ?? 0) > 0 && seasonal < (targets.seasonalMin ?? 0)) {
    shortfalls.push(`seasonal ${seasonal}<${targets.seasonalMin}`);
  }
  if ((targets.cosmeticsMin ?? 0) > 0 && cosmetics < (targets.cosmeticsMin ?? 0)) {
    shortfalls.push(`cosmetics ${cosmetics}<${targets.cosmeticsMin}`);
  }
  if ((targets.chainsMin ?? 0) > 0 && chains < (targets.chainsMin ?? 0)) {
    shortfalls.push(`chains ${chains}<${targets.chainsMin}`);
  }
  return {
    species,
    quests,
    harbors,
    machines,
    rivals,
    baits,
    seasonal,
    cosmetics,
    chains,
    met: shortfalls.length === 0,
    shortfalls,
  };
}
