/**
 * Finish 2.0 Phase 27 + Finish 3.0 Phase 28 + Finish 4.0 Phase 28 — fragment structural checks.
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
  } else if (kind === "harbor") {
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
  } else if (kind === "contract") {
    if (typeof id === "string" && !/^contract\.[a-z0-9_]+$/.test(id)) {
      errors.push("contract id pattern");
    }
    if (typeof document.description !== "string") errors.push("description required");
    if (typeof document.item !== "string") errors.push("item required");
    for (const k of ["quantity", "durationTicks", "payout", "penalty", "weight"]) {
      if (typeof document[k] !== "number") errors.push(`${k} must be number`);
    }
  } else if (kind === "bait") {
    if (typeof id === "string" && !/^bait\.[a-z0-9_]+$/.test(id)) {
      errors.push("bait id pattern");
    }
    if (typeof document.description !== "string") errors.push("description required");
    if (!Array.isArray(document.requires)) errors.push("requires must be array");
    for (const k of [
      "carryUnits",
      "packQuantity",
      "cost",
      "rareSpeciesWeightMultPermille",
      "rareChanceBonusPermille",
    ]) {
      if (typeof document[k] !== "number") errors.push(`${k} must be number`);
    }
  } else if (kind === "decor") {
    if (typeof id === "string" && !/^decor\.[a-z0-9_]+$/.test(id)) {
      errors.push("decor id pattern");
    }
    if (typeof document.description !== "string") errors.push("description required");
    if (typeof document.cost !== "number") errors.push("cost must be number");
    if (typeof document.patienceBonusTicks !== "number") {
      errors.push("patienceBonusTicks must be number");
    }
  } else if (kind === "machine") {
    if (typeof id === "string" && !/^machine\.[a-z0-9_]+$/.test(id)) {
      errors.push("machine id pattern");
    }
    if (!Array.isArray(document.recipes) || document.recipes.length < 1) {
      errors.push("recipes must be non-empty array");
    }
    if (typeof document.inputCapacityUnits !== "number") {
      errors.push("inputCapacityUnits must be number");
    }
    if (typeof document.outputCapacityUnits !== "number") {
      errors.push("outputCapacityUnits must be number");
    }
  } else if (kind === "rival") {
    if (typeof id === "string" && !/^rival\.[a-z0-9_]+$/.test(id)) {
      errors.push("rival id pattern");
    }
    if (typeof document.description !== "string") errors.push("description required");
    if (!Array.isArray(document.harbors) || document.harbors.length < 1) {
      errors.push("harbors must be non-empty array");
    }
    if (!Array.isArray(document.specialtyProducts) || document.specialtyProducts.length < 1) {
      errors.push("specialtyProducts must be non-empty array");
    }
    if (!Array.isArray(document.activeDayParts) || document.activeDayParts.length < 1) {
      errors.push("activeDayParts must be non-empty array");
    }
    if (typeof document.aggressionPermille !== "number") {
      errors.push("aggressionPermille must be number");
    }
    if (typeof document.undercutPriceMultPermille !== "number") {
      errors.push("undercutPriceMultPermille must be number");
    }
  }
  return errors;
}
