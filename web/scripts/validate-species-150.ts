/**
 * Finish 6.0 Phase 8 — species 126–150 + ecology + i18n + fish-art-6.
 *
 * Usage:
 *   npm run species150:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  HABITAT_FLOOR_150,
  measureSpecies150,
  SPECIES_150,
  SPECIES_150_COUNT,
  SPECIES_150_MARKER,
  SPECIES_150_PHASE,
  SPECIES_150_SCHEMA,
  waveSpeciesIds,
} from "../src/ship/species150";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/species-150.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-species-150.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const art = readJson(resolve(root, "shared/ship/fish-art-pass.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Species150.kt"),
    "utf8",
  );
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);

  if (catalog.phase !== 8) errors.push(`phase expected 8, got ${catalog.phase}`);
  if (catalog.schema !== SPECIES_150_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (SPECIES_150_PHASE !== 8) errors.push("phase mirror mismatch");
  if (catalog.species150Marker !== SPECIES_150_MARKER) errors.push("marker mismatch");
  if (fixture.species150Marker !== SPECIES_150_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.speciesCount !== 150 || SPECIES_150_COUNT !== 150) {
    errors.push("speciesCount must be 140");
  }
  if (catalog.newSpeciesCount !== 25) errors.push("newSpeciesCount must be 25");
  if ((catalog.newBaseSpecies as unknown[]).length !== 13) {
    errors.push("newBaseSpecies must list 13");
  }
  if ((catalog.newRareSpecies as unknown[]).length !== 12) {
    errors.push("newRareSpecies must list 12");
  }
  if ((catalog.habitatIds as unknown[]).length !== 8) {
    errors.push("habitatIds must list 8 Phase 8 habitats");
  }
  if ((catalog.allHabitatFloor ?? 0) < 32 || HABITAT_FLOOR_150 < 32) {
    errors.push("allHabitatFloor must be ≥ 32");
  }

  const measure = measureSpecies150(root);
  if (measure.speciesCount < 150) errors.push(`species ${measure.speciesCount} < 150`);
  if (measure.habitatCount < 32) errors.push(`habitats ${measure.habitatCount} < 32`);
  if (!measure.newBasesPresent) errors.push("wave base species missing from content-pack");
  if (!measure.newRaresPresent) errors.push("wave rare species missing from content-pack");
  if (!measure.newHabitatsPresent) errors.push("Phase 8 habitats missing from ecology");
  if (!measure.waveWeighted) errors.push("all 25 wave species must have habitat weights");
  if (!measure.i18nTranslated) {
    errors.push("8 locales must translate wave species + habitats (non-EN ≠ EN)");
  }
  if (!measure.fishArtMet) {
    for (const m of measure.missingFishAssets) errors.push(m);
    if ((art.authoredSpeciesMin ?? 0) < 150) {
      errors.push("fish-art-pass authoredSpeciesMin must be ≥ 150");
    }
  }
  if (!measure.kickoffGapsClosed) {
    errors.push(
      "kickoff baseline species/authoredFish stay 125; remaining=0; fishArt6Incomplete=false",
    );
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of SPECIES_150.newBaseSpecies) {
    const sp = content.speciesById.get(entry.id);
    if (!sp) {
      errors.push(`missing species ${entry.id}`);
      continue;
    }
    if (sp.name !== entry.name) errors.push(`${entry.id} name mismatch`);
    if (entry.rareUpgrade) {
      if (sp.rareUpgrade?.to !== entry.rareUpgrade) {
        errors.push(`${entry.id} rareUpgrade mismatch`);
      }
      if (!content.speciesById.has(entry.rareUpgrade)) {
        errors.push(`missing rare ${entry.rareUpgrade}`);
      }
    }
    if (!content.trophySetsById.has(entry.gallery)) {
      errors.push(`missing gallery ${entry.gallery}`);
    }
  }

  for (const id of waveSpeciesIds()) {
    if (!content.codexBySpeciesId?.has?.(id) && !(pack.codex?.entries ?? []).some((e: any) => e.speciesId === id)) {
      // soft check via pack
      const has = (pack.codex?.entries ?? []).some((e: any) => e.speciesId === id);
      if (!has) errors.push(`missing codex ${id}`);
    }
  }

  const phase8 = (kickoff.phases as any[])?.find((p) => p.phase === 8);
  if (!phase8) errors.push("kickoff missing phase 8");
  else if (phase8.validate !== "species150:validate") {
    errors.push("kickoff phase 8 validate must be species150:validate");
  }
  if (phase8?.id !== "species-150") errors.push("kickoff phase 8 id must be species-150");
  if (kickoff.baseline?.species !== 125) {
    errors.push("kickoff baseline.species must stay 125 (Phase 1 lock)");
  }
  if (kickoff.baseline?.authoredFish !== 125) {
    errors.push("kickoff baseline.authoredFish must stay 125 (Phase 1 lock)");
  }
  if (kickoff.gaps?.speciesRemaining !== 0) errors.push("gaps.speciesRemaining must be 0");
  if (kickoff.gaps?.authoredFishRemaining !== 0) {
    errors.push("gaps.authoredFishRemaining must be 0");
  }
  if (kickoff.gaps?.fishArt6Incomplete !== false) {
    errors.push("gaps.fishArt6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("fishArt6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include fishArt6Incomplete after Phase 8");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.species150Phase !== 8) errors.push("listing.species150Phase must be 8");
  if (listing.species150Catalog !== "shared/ship/species-150.json") {
    errors.push("listing.species150Catalog mismatch");
  }
  if (pin.species150 !== "shared/ship/species-150.json") {
    errors.push("RELEASE_PIN.species150 path missing");
  }
  if (!pin.fixtures?.includes("parity-species-150.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-species-150.json");
  }

  const block = dod.species150;
  if (!block) errors.push("DoD missing species150 block");
  else {
    if (block.phase !== 8) errors.push("DoD species150.phase must be 8");
    if (block.plan !== "30_finish_6.0") errors.push("DoD species150.plan mismatch");
    if (block.status !== "complete") errors.push("DoD species150.status must be complete");
    if (block.species150Marker !== SPECIES_150_MARKER) errors.push("DoD marker mismatch");
  }
  if ((dod.quotas?.speciesMin ?? 0) < 150) errors.push("DoD quotas.speciesMin must be ≥ 150");
  if ((dod.quotas?.authoredFishSpecies ?? 0) < 150) {
    errors.push("DoD quotas.authoredFishSpecies must be ≥ 150");
  }

  if (!pkg.scripts?.["species150:validate"]) errors.push("package.json missing species150:validate");
  if (!pkg.scripts?.["species150:smoke"]) errors.push("package.json missing species150:smoke");
  if (!ci.includes("species150:validate")) errors.push("ci.yml missing species150:validate");
  if (!kotlin.includes("NEW_BASE_IDS")) errors.push("Kotlin Species150 missing NEW_BASE_IDS");

  if (fixture.expect?.speciesRemainingClosed !== 0) {
    errors.push("parity speciesRemainingClosed must be 0");
  }
  if (fixture.expect?.authoredFishRemainingClosed !== 0) {
    errors.push("parity authoredFishRemainingClosed must be 0");
  }
  if (fixture.expect?.fishArt6IncompleteClosed !== false) {
    errors.push("parity fishArt6IncompleteClosed must be false");
  }
  // Soft-floor: Phase 14 closed endgameSchema27Pending → openGapFlagMin 15.
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("species150:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK species150:validate — 150 species + 32 habitats + 8-locale i18n + fish-art-6; gaps closed",
);
