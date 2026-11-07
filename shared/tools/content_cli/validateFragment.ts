/**
 * Finish 2.0 Phase 27 — fragment schema checks.
 * Ajv lives in the web package; this module expects validateScaffoldFragment
 * to be provided by the web contentAuthoring wrapper when run via npm scripts.
 *
 * Pure structural checks used by shared tools / Kotlin mirrors without Ajv.
 */
import type { ScaffoldKind } from "./ids";

export function structuralScaffoldErrors(
  kind: ScaffoldKind,
  document: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  const id = document.id;
  if (typeof id !== "string") errors.push("id must be string");
  if (typeof document.name !== "string" || !document.name) errors.push("name required");

  if (kind === "species") {
    if (typeof id === "string" && !/^species\.[a-z0-9_]+$/.test(id)) {
      errors.push("species id pattern");
    }
    for (const k of ["carryUnits", "catchTicks", "baseValue", "rarityWeight"]) {
      if (typeof document[k] !== "number") errors.push(`${k} must be number`);
    }
  } else if (kind === "quest") {
    if (typeof id === "string" && !/^quest\.[a-z0-9_]+$/.test(id)) {
      errors.push("quest id pattern");
    }
    if (typeof document.description !== "string") errors.push("description required");
    if (!Array.isArray(document.requires)) errors.push("requires must be array");
    const goal = document.goal as Record<string, unknown> | undefined;
    if (!goal || typeof goal.stat !== "string" || typeof goal.atLeast !== "number") {
      errors.push("goal.stat/atLeast required");
    }
    const reward = document.reward as Record<string, unknown> | undefined;
    if (!reward || typeof reward.coins !== "number" || !Array.isArray(reward.unlockUpgrades)) {
      errors.push("reward.coins/unlockUpgrades required");
    }
  } else {
    if (typeof id === "string" && !/^harbor\.[a-z0-9_]+$/.test(id)) {
      errors.push("harbor id pattern");
    }
    for (const k of [
      "playerSpawn",
      "walkable",
      "obstacles",
      "zones",
      "fishingSpots",
      "stations",
      "counters",
      "plots",
      "rushes",
      "customerPathWaypoints",
    ]) {
      if (document[k] == null) errors.push(`harbor missing ${k}`);
    }
    if (typeof document.customerSpawnTicks !== "number") {
      errors.push("customerSpawnTicks required");
    }
  }
  return errors;
}
