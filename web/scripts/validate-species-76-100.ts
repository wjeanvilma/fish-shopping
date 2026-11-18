/**
 * Finish 4.0 Phase 11 — species 76–100 + ecology + i18n readiness.
 *
 * Usage:
 *   npm run species76100:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EcologySystem, SCHEMA_VERSION } from "../src/engine";
import { loadContent } from "../src/engine";
import {
  HABITAT_FLOOR_76100,
  measureSpecies76100,
  SPECIES_76100,
  SPECIES_76100_COUNT,
  SPECIES_76100_MARKER,
  SPECIES_76100_PHASE,
  SPECIES_76100_SCHEMA,
} from "../src/ship/species76100";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/species-76-100.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-species-76-100.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const prep = readJson(resolve(root, "shared/ship/schema-25-prep.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Species76100.kt"),
    "utf8",
  );
  const ecologyKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/world/EcologySystem.kt"),
    "utf8",
  );
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);

  if (catalog.phase !== 11) errors.push(`phase expected 11, got ${catalog.phase}`);
  if (catalog.schema !== SPECIES_76100_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (SPECIES_76100_PHASE !== 11) errors.push("phase mirror mismatch");
  if (catalog.species76100Marker !== SPECIES_76100_MARKER) errors.push("marker mismatch");
  if (fixture.species76100Marker !== SPECIES_76100_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (pack.saveSchemaVersion < 24) errors.push("content-pack saveSchemaVersion must be >= 24");

  if (catalog.speciesCount !== 100 || SPECIES_76100_COUNT !== 100) {
    errors.push("speciesCount must be 100");
  }
  if (catalog.newSpeciesCount !== 25) errors.push("newSpeciesCount must be 25");
  if (catalog.habitatCount !== 16 || HABITAT_FLOOR_76100 !== 16) {
    errors.push("habitatCount must be 16");
  }
  if (catalog.newHabitatCount !== 8) errors.push("newHabitatCount must be 8");
  if ((catalog.newBaseSpecies as unknown[]).length !== 13) {
    errors.push("newBaseSpecies must list 13");
  }
  if ((catalog.newRareSpecies as unknown[]).length !== 12) {
    errors.push("newRareSpecies must list 12");
  }
  if ((catalog.habitatIds as unknown[]).length !== 8) {
    errors.push("habitatIds must list 8 Phase 11 habitats");
  }

  const measure = measureSpecies76100(root);
  if (measure.speciesCount < 100) errors.push(`species ${measure.speciesCount} < 100`);
  if (measure.habitatCount < 16) errors.push(`habitats ${measure.habitatCount} < 16`);
  if (!measure.newBasesPresent) errors.push("wave base species missing from content-pack");
  if (!measure.newRaresPresent) errors.push("wave rare species missing from content-pack");
  if (!measure.newHabitatsPresent) errors.push("Phase 11 habitats missing from ecology");
  if (!measure.waveWeighted) errors.push("all 25 wave species must have habitat weights");
  if (!measure.i18nTranslated) {
    errors.push("EN/ES/PT must translate wave species + habitats (ES/PT ≠ EN)");
  }
  if (!measure.schemaPrepOk) errors.push("schema-25-prep must be prepared at target 25 / schema 24 live");
  if (!measure.kickoffSpeciesMet) {
    errors.push("kickoff baseline.species≥100 and speciesRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (!EcologySystem.meetsPhase11Floor(content)) {
    errors.push("EcologySystem.meetsPhase11Floor failed");
  }
  if (!EcologySystem.coversSpecies(content, SPECIES_76100.newBaseSpecies.map((b) => b.id))) {
    errors.push("EcologySystem.coversSpecies missing base wave");
  }
  if (!EcologySystem.coversSpecies(content, SPECIES_76100.newRareSpecies)) {
    errors.push("EcologySystem.coversSpecies missing rare wave");
  }

  if (content.codex.entries.length < 100) {
    errors.push(`codex entries ${content.codex.entries.length} < 100`);
  }
  for (const id of [...SPECIES_76100.newBaseSpecies.map((b) => b.id), ...SPECIES_76100.newRareSpecies]) {
    if (!content.codexBySpeciesId.has(id)) errors.push(`missing codex for ${id}`);
  }

  if (prep.targetSchemaVersion !== 25) errors.push("schema-25-prep target must be 25");
  if (prep.currentSchemaVersion < 24) errors.push("schema-25-prep current must be >= 24");
  if (!["prepared", "applied"].includes(prep.status)) errors.push("schema-25-prep status must be prepared|applied");
  if (prep.ownedByPhase !== 17) errors.push("schema-25-prep ownedByPhase must be 17");

  const phase11 = (kickoff.phases as any[])?.find((p) => p.phase === 11);
  if (!phase11) errors.push("kickoff missing phase 11");
  else if (phase11.validate !== "species76100:validate") {
    errors.push("kickoff phase 11 validate must be species76100:validate");
  }
  if (phase11?.id !== "species-76-100") errors.push("kickoff phase 11 id must be species-76-100");

  if (listing.species76100Phase !== 11) errors.push("listing.species76100Phase must be 11");
  if (listing.species76100Catalog !== "shared/ship/species-76-100.json") {
    errors.push("listing.species76100Catalog mismatch");
  }
  if (pin.species76100 !== "shared/ship/species-76-100.json") {
    errors.push("RELEASE_PIN.species76100 path missing");
  }
  if (!pin.fixtures?.includes("parity-species-76-100.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-species-76-100.json");
  }
  if (pin.schema25Prep !== "shared/ship/schema-25-prep.json") {
    errors.push("RELEASE_PIN.schema25Prep path missing");
  }

  const block = dod.species76100;
  if (!block) errors.push("DoD missing species76100 block");
  else {
    if (block.phase !== 11) errors.push("DoD species76100.phase must be 11");
    if (block.plan !== "30_finish_4.0") errors.push("DoD species76100.plan mismatch");
    if (block.status !== "complete") errors.push("DoD species76100.status must be complete");
    if (block.species76100Marker !== SPECIES_76100_MARKER) {
      errors.push("DoD species76100 marker mismatch");
    }
  }
  if ((dod.quotas?.speciesMin ?? 0) < 100) errors.push("DoD quotas.speciesMin must be ≥ 100");
  if ((dod.quotas?.codexEntries ?? 0) < 100) errors.push("DoD quotas.codexEntries must be ≥ 100");

  if (!pkg.scripts?.["species76100:validate"]) {
    errors.push("package.json missing species76100:validate");
  }
  if (!ci.includes("species76100:validate")) errors.push("ci.yml missing species76100:validate");
  if (!kotlin.includes("NEW_HABITAT_IDS")) errors.push("Kotlin Species76100 missing NEW_HABITAT_IDS");
  if (!ecologyKt.includes("HABITAT_FLOOR_PHASE_11")) {
    errors.push("Kotlin EcologySystem missing HABITAT_FLOOR_PHASE_11");
  }
  if (!ecologyKt.includes("coversSpecies")) {
    errors.push("Kotlin EcologySystem missing coversSpecies");
  }

  if (fixture.expect?.speciesCount !== 100) errors.push("parity speciesCount must be 100");
  if (fixture.expect?.habitatCount !== 16) errors.push("parity habitatCount must be 16");
  if (fixture.expect?.schemaPrepTarget !== 25) errors.push("parity schemaPrepTarget must be 25");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("species76100:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK species76100:validate — 100 species + 16 habitats + i18n + schema-25 prep");
