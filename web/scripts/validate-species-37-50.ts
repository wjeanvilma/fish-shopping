/**
 * Finish 2.0 Phase 9 — species 37–50 + bait ladder readiness.
 *
 * Usage:
 *   npm run species3750:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/engine";
import {
  BAIT_COUNT_FLOOR,
  SPECIES_3750,
  SPECIES_3750_PHASE,
  SPECIES_3750_SCHEMA,
  SPECIES_COUNT_FLOOR,
} from "../src/ship/species3750";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/species-37-50.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-species-37-50.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 9) errors.push(`phase expected 9, got ${catalog.phase}`);
  if (catalog.schema !== SPECIES_3750_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SPECIES_3750_PHASE !== 9) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must be 21");
  if (catalog.speciesCount !== 50 || SPECIES_COUNT_FLOOR !== 50) {
    errors.push("speciesCount must be 50");
  }
  if (catalog.baitCount !== 8 || BAIT_COUNT_FLOOR !== 8) errors.push("baitCount must be 8");
  if (dod.quotas?.speciesMin !== 50) errors.push("DoD quotas.speciesMin must be 50");
  if (content.species.length !== 50) {
    errors.push(`content species ${content.species.length} ≠ 50`);
  }
  if (content.bait.length < 8) errors.push(`content bait ${content.bait.length} < 8`);

  if (listing.species3750Phase !== 9) errors.push("listing.species3750Phase must be 9");
  if (listing.species3750Catalog !== "shared/ship/species-37-50.json") {
    errors.push("listing.species3750Catalog mismatch");
  }
  if (!ci.includes("species3750:validate")) errors.push("ci.yml missing species3750:validate");
  if (!pin.fixtures?.includes("parity-species-37-50.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-species-37-50.json");
  }
  if (pin.species3750 !== "shared/ship/species-37-50.json") {
    errors.push("RELEASE_PIN.species3750 path mismatch");
  }

  for (const entry of SPECIES_3750.newBaseSpecies) {
    const sp = content.speciesById.get(entry.id);
    if (!sp) {
      errors.push(`missing base species ${entry.id}`);
      continue;
    }
    if (sp.name !== entry.name) errors.push(`${entry.id} name mismatch`);
    if (sp.rareUpgrade?.to !== entry.rareUpgrade) {
      errors.push(`${entry.id} rareUpgrade mismatch`);
    }
    if (!content.speciesById.has(entry.rareUpgrade)) {
      errors.push(`missing rare ${entry.rareUpgrade}`);
    }
    if (!content.trophySetsById.has(entry.gallery)) {
      errors.push(`missing gallery ${entry.gallery}`);
    }
    const gallery = content.trophySetsById.get(entry.gallery)!;
    if (!gallery.species.includes(entry.id)) {
      errors.push(`${entry.id} not in ${entry.gallery}`);
    }
    for (const harborId of entry.harbors) {
      const harbor = content.harborsById.get(harborId);
      if (!harbor) {
        errors.push(`missing harbor ${harborId}`);
        continue;
      }
      const onSpot = harbor.fishingSpots.some((spot) => spot.species.includes(entry.id));
      if (!onSpot) errors.push(`${entry.id} missing from ${harborId} fishingSpots`);
    }
    const asset = resolve(root, "shared/assets", sp.asset);
    if (!existsSync(asset)) errors.push(`missing fish GLB ${sp.asset}`);
  }

  for (const rareId of SPECIES_3750.newRareSpecies) {
    if (!content.speciesById.has(rareId)) errors.push(`missing rare species ${rareId}`);
    const rareSet = content.trophySetsById.get(SPECIES_3750.rareGallery);
    if (!rareSet?.species.includes(rareId)) {
      errors.push(`${rareId} not in ${SPECIES_3750.rareGallery}`);
    }
  }

  for (const bait of SPECIES_3750.newBaits) {
    const b = content.baitById.get(bait.id);
    if (!b) {
      errors.push(`missing bait ${bait.id}`);
      continue;
    }
    if (b.cost !== bait.cost) errors.push(`${bait.id} cost mismatch`);
    if (JSON.stringify([...(b.requires ?? [])]) !== JSON.stringify(bait.requires)) {
      errors.push(`${bait.id} requires mismatch`);
    }
  }
  for (const id of SPECIES_3750.legacyBaits) {
    if (!content.baitById.has(id)) errors.push(`missing legacy bait ${id}`);
  }

  if (fixture.expectFinal?.speciesCount !== 50) {
    errors.push("fixture expectFinal.speciesCount must be 50");
  }
  if (fixture.expectFinal?.baitCount !== 8) {
    errors.push("fixture expectFinal.baitCount must be 8");
  }
  if ((fixture.purchases as any[])?.[0]?.baitId !== "bait.brine_paste") {
    errors.push("fixture must purchase bait.brine_paste");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("species3750:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK species3750:validate — species 37–50 + ≥8 baits ready");
