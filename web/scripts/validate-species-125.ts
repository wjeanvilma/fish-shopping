/**
 * Finish 5.0 Phase 13 — species 101–125 + ecology + i18n readiness.
 *
 * Usage:
 *   npm run species125:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EcologySystem, SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  HABITAT_FLOOR_125,
  measureSpecies125,
  SPECIES_125,
  SPECIES_125_COUNT,
  SPECIES_125_MARKER,
  SPECIES_125_PHASE,
  SPECIES_125_SCHEMA,
  waveSpeciesIds,
} from "../src/ship/species125";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/species-125.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-species-125.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const fishArt5 = readJson(resolve(root, "shared/ship/fish-art-5.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Species125.kt"),
    "utf8",
  );
  const ecologyKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/world/EcologySystem.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);

  if (catalog.phase !== 13) errors.push(`phase expected 13, got ${catalog.phase}`);
  if (catalog.schema !== SPECIES_125_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (SPECIES_125_PHASE !== 13) errors.push("phase mirror mismatch");
  if (catalog.species125Marker !== SPECIES_125_MARKER) errors.push("marker mismatch");
  if (fixture.species125Marker !== SPECIES_125_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (pack.saveSchemaVersion < 25) errors.push("content-pack saveSchemaVersion must be >= 25");

  if (catalog.speciesCount !== 125 || SPECIES_125_COUNT !== 125) {
    errors.push("speciesCount must be 125");
  }
  if (catalog.newSpeciesCount !== 25) errors.push("newSpeciesCount must be 25");
  if (catalog.habitatCount !== 24 || HABITAT_FLOOR_125 !== 24) {
    errors.push("habitatCount must be 24");
  }
  if (catalog.newHabitatCount !== 8) errors.push("newHabitatCount must be 8");
  if ((catalog.newBaseSpecies as unknown[]).length !== 13) {
    errors.push("newBaseSpecies must list 13");
  }
  if ((catalog.newRareSpecies as unknown[]).length !== 12) {
    errors.push("newRareSpecies must list 12");
  }
  if ((catalog.habitatIds as unknown[]).length !== 8) {
    errors.push("habitatIds must list 8 Phase 13 habitats");
  }

  const artIds = new Set(fishArt5.newSpeciesIds as string[]);
  for (const id of waveSpeciesIds()) {
    if (!artIds.has(id)) errors.push(`wave id ${id} missing from fish-art-5`);
  }

  const measure = measureSpecies125(root);
  if (measure.speciesCount < 125) errors.push(`species ${measure.speciesCount} < 125`);
  if (measure.habitatCount < 24) errors.push(`habitats ${measure.habitatCount} < 24`);
  if (!measure.newBasesPresent) errors.push("wave base species missing from content-pack");
  if (!measure.newRaresPresent) errors.push("wave rare species missing from content-pack");
  if (!measure.newHabitatsPresent) errors.push("Phase 13 habitats missing from ecology");
  if (!measure.waveWeighted) errors.push("all 25 wave species must have habitat weights");
  if (!measure.i18nTranslated) {
    errors.push("8 locales must translate wave species + habitats (non-EN ≠ EN)");
  }
  if (!measure.kickoffSpeciesMet) {
    errors.push("kickoff baseline.species≥125 and speciesRemaining=0 required");
  }
  if (!measure.gapClosed) errors.push("gaps.speciesRemaining must be 0 after Phase 13");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (!EcologySystem.meetsPhase13Floor(content)) {
    errors.push("EcologySystem.meetsPhase13Floor failed");
  }
  if (!EcologySystem.coversSpecies(content, SPECIES_125.newBaseSpecies.map((b) => b.id))) {
    errors.push("EcologySystem.coversSpecies missing base wave");
  }
  if (!EcologySystem.coversSpecies(content, SPECIES_125.newRareSpecies)) {
    errors.push("EcologySystem.coversSpecies missing rare wave");
  }

  if (content.codex.entries.length < 125) {
    errors.push(`codex entries ${content.codex.entries.length} < 125`);
  }
  for (const id of waveSpeciesIds()) {
    if (!content.codexBySpeciesId.has(id)) errors.push(`missing codex for ${id}`);
  }

  const phase13 = (kickoff.phases as any[])?.find((p) => p.phase === 13);
  if (!phase13) errors.push("kickoff missing phase 13");
  else if (phase13.validate !== "species125:validate") {
    errors.push("kickoff phase 13 validate must be species125:validate");
  }
  if (phase13?.id !== "species-125") errors.push("kickoff phase 13 id must be species-125");
  if (!finish5Kt.includes("species125:validate")) {
    errors.push("Finish5Kickoff.kt missing species125:validate");
  }

  if (listing.species125Phase !== 13) errors.push("listing.species125Phase must be 13");
  if (listing.species125Catalog !== "shared/ship/species-125.json") {
    errors.push("listing.species125Catalog mismatch");
  }
  if (pin.species125 !== "shared/ship/species-125.json") {
    errors.push("RELEASE_PIN.species125 path missing");
  }
  if (!pin.fixtures?.includes("parity-species-125.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-species-125.json");
  }

  const block = dod.species125;
  if (!block) errors.push("DoD missing species125 block");
  else {
    if (block.phase !== 13) errors.push("DoD species125.phase must be 13");
    if (block.plan !== "30_finish_5.0") errors.push("DoD species125.plan mismatch");
    if (block.status !== "complete") errors.push("DoD species125.status must be complete");
    if (block.species125Marker !== SPECIES_125_MARKER) {
      errors.push("DoD species125 marker mismatch");
    }
  }
  if ((dod.quotas?.speciesMin ?? 0) < 125) errors.push("DoD quotas.speciesMin must be ≥ 125");
  if ((dod.quotas?.codexEntries ?? 0) < 125) errors.push("DoD quotas.codexEntries must be ≥ 125");

  if (!pkg.scripts?.["species125:validate"]) {
    errors.push("package.json missing species125:validate");
  }
  if (!ci.includes("species125:validate")) errors.push("ci.yml missing species125:validate");
  if (!kotlin.includes("NEW_HABITAT_IDS")) errors.push("Kotlin Species125 missing NEW_HABITAT_IDS");
  if (!ecologyKt.includes("HABITAT_FLOOR_PHASE_13")) {
    errors.push("Kotlin EcologySystem missing HABITAT_FLOOR_PHASE_13");
  }
  if (!ecologyKt.includes("meetsPhase13Floor")) {
    errors.push("Kotlin EcologySystem missing meetsPhase13Floor");
  }
  if (!existsSync(resolve(root, "shared/tools/author_species_125.py"))) {
    errors.push("missing author_species_125.py");
  }

  if (fixture.expect?.speciesCount !== 125) errors.push("parity speciesCount must be 125");
  if (fixture.expect?.habitatCount !== 24) errors.push("parity habitatCount must be 24");
  if (fixture.expect?.speciesRemainingClosed !== 0) {
    errors.push("parity speciesRemainingClosed must be 0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("species125:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK species125:validate — 125 species + 24 habitats + 8-locale i18n; speciesRemaining closed");
