/**
 * Human-readable inventory of balance/content entities editors touch most
 * (species, recipes, quests). Mirrors game-core ContentCatalog.kt.
 */
import type { ContentPack } from "./content";

export function contentCatalogSummary(pack: ContentPack): string {
  const r = pack.raw;
  return [
    "counts:",
    `  species=${r.species.length}`,
    `  products=${r.products.length}`,
    `  bait=${r.bait.length}`,
    `  trophySets=${r.trophies.sets.length}`,
    `  recipes=${r.recipes.length}`,
    `  machines=${r.machines.length}`,
    `  upgrades=${r.upgrades.length}`,
    `  quests=${r.quests.length}`,
    `  workers=${r.workers.length}`,
    `  customers=${r.customers.length}`,
    `  contracts=${r.contracts.templates.length}`,
    `  harbors=${r.harbors.length}`,
    `  tutorial=${r.tutorial.length}`,
  ].join("\n");
}

export function contentCatalogDetail(pack: ContentPack): string {
  const r = pack.raw;
  const lines: string[] = ["species:"];
  for (const s of r.species) {
    const rare = s.rareUpgrade
      ? ` rare→${s.rareUpgrade.to}@${s.rareUpgrade.chancePermille}`
      : "";
    lines.push(
      `  ${s.id}  catch=${s.catchTicks}t value=${s.baseValue} weight=${s.rarityWeight}${rare}`,
    );
  }
  lines.push("bait:");
  for (const b of r.bait) {
    lines.push(
      `  ${b.id}  pack=${b.packQuantity} cost=${b.cost}` +
        ` rareW×${b.rareSpeciesWeightMultPermille} rare+${b.rareChanceBonusPermille}`,
    );
  }
  lines.push("trophySets:");
  for (const set of r.trophies.sets) {
    lines.push(`  ${set.id}  ${set.species.length} species  → ${set.completeStat}`);
  }
  lines.push("recipes:");
  for (const rec of r.recipes) {
    const inputs = rec.inputs.map((iq) => `${iq.quantity}×${iq.item}`).join("+");
    const outputs = rec.outputs.map((iq) => `${iq.quantity}×${iq.item}`).join("+");
    lines.push(`  ${rec.id}  ${rec.machine}  ${rec.durationTicks}t  ${inputs} → ${outputs}`);
  }
  lines.push("quests:");
  for (const q of r.quests) {
    lines.push(
      `  ${q.id}  ${q.name}  goal=${q.goal.stat}≥${q.goal.atLeast}  rewardCoins=${q.reward.coins}`,
    );
  }
  return lines.join("\n");
}
