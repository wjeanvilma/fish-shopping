/**
 * Finish 3.0 Phase 12 — species 51–75 + ecology readiness.
 *
 * Usage:
 *   npm run species5175:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HABITAT_COUNT_FLOOR,
  measureSpecies5175,
  SPECIES_5175,
  SPECIES_5175_COUNT,
  SPECIES_5175_MARKER,
  SPECIES_5175_PHASE,
  SPECIES_5175_SCHEMA,
} from "../src/ship/species5175";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/species-51-75.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-species-51-75.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Species5175.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 12) errors.push(`phase expected 12, got ${catalog.phase}`);
  if (catalog.schema !== SPECIES_5175_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (SPECIES_5175_PHASE !== 12) errors.push("phase mirror mismatch");
  if (catalog.species51_75Marker !== SPECIES_5175_MARKER) errors.push("marker mismatch");
  if (fixture.species51_75Marker !== SPECIES_5175_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.speciesCount !== 75 || SPECIES_5175_COUNT !== 75) {
    errors.push("speciesCount must be 75");
  }
  if (catalog.habitatCount !== 8 || HABITAT_COUNT_FLOOR !== 8) {
    errors.push("habitatCount must be 8");
  }
  if (catalog.newBaseSpecies?.length !== 13) errors.push("newBaseSpecies must list 13");
  if (catalog.newRareSpecies?.length !== 12) errors.push("newRareSpecies must list 12");

  const measure = measureSpecies5175(root);
  if (measure.speciesCount !== 75) errors.push(`species ${measure.speciesCount} ≠ 75`);
  if (measure.habitatCount !== 8) errors.push(`habitats ${measure.habitatCount} ≠ 8`);
  if (!measure.newBasesPresent) errors.push("new base species missing");
  if (!measure.newRaresPresent) errors.push("new rare species / rare gallery missing");
  if (!measure.habitatsPresent) errors.push("ecology habitats missing");
  if (!measure.spotsWired) errors.push("fishing spots missing new bases");
  if (!measure.galleriesWired) errors.push("trophy galleries missing new bases");
  if (!measure.codexComplete) errors.push("codex must cover every species");
  if (!measure.assetsPresent) {
    errors.push(`missing assets: ${measure.missingAssets.join(", ")}`);
  }
  if (!measure.kickoffSpeciesMet) {
    errors.push("kickoff baseline.species must be ≥75 with measuredAtPhase≥12");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of SPECIES_5175.newBaseSpecies) {
    if (!en.strings?.[entry.id]) errors.push(`content-strings.en missing ${entry.id}`);
    if (entry.rareUpgrade && !en.strings?.[entry.rareUpgrade]) {
      errors.push(`content-strings.en missing ${entry.rareUpgrade}`);
    }
  }
  for (const hid of SPECIES_5175.habitatIds) {
    if (!en.strings?.[hid]) errors.push(`content-strings.en missing ${hid}`);
  }

  const phase12 = (kickoff.phases as any[])?.find((p) => p.phase === 12);
  if (!phase12) errors.push("kickoff missing phase 12");
  else if (phase12.validate !== "species5175:validate") {
    errors.push("kickoff phase 12 validate must be species5175:validate");
  }
  if (kickoff.baseline?.species !== 75) errors.push("kickoff.baseline.species must be 75");
  if (kickoff.gapTargets?.speciesMin !== 75) errors.push("kickoff.gapTargets.speciesMin must be 75");

  if (listing.species5175Phase !== 12) errors.push("listing.species5175Phase must be 12");
  if (listing.species5175Catalog !== "shared/ship/species-51-75.json") {
    errors.push("listing.species5175Catalog mismatch");
  }
  if (pin.species5175 !== "shared/ship/species-51-75.json") {
    errors.push("RELEASE_PIN.species5175 path missing");
  }
  if (!pin.fixtures?.includes("parity-species-51-75.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-species-51-75.json");
  }

  const block = dod.species5175;
  if (!block) errors.push("DoD missing species5175 block");
  else {
    if (block.phase !== 12) errors.push("DoD species5175.phase must be 12");
    if (block.plan !== "30_finish_3.0") errors.push("DoD species5175.plan mismatch");
    if (block.status !== "complete") errors.push("DoD species5175.status must be complete");
    if (block.species51_75Marker !== SPECIES_5175_MARKER) {
      errors.push("DoD species5175 marker mismatch");
    }
  }
  if ((dod.quotas?.speciesMin ?? 0) < 75) errors.push("DoD quotas.speciesMin must be ≥ 75");
  if ((dod.quotas?.codexEntries ?? 0) < 75) errors.push("DoD quotas.codexEntries must be ≥ 75");

  if (!pkg.scripts?.["species5175:validate"]) {
    errors.push("package.json missing species5175:validate");
  }
  if (!ci.includes("species5175:validate")) errors.push("ci.yml missing species5175:validate");
  if (!kotlin.includes("HABITAT_IDS")) errors.push("Kotlin Species5175 missing HABITAT_IDS");
  if (!existsSync(resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/world/EcologySystem.kt"))) {
    errors.push("missing EcologySystem.kt");
  }

  if (fixture.expect?.speciesCount !== 75) errors.push("parity speciesCount must be 75");
  if (fixture.expect?.habitatCount !== 8) errors.push("parity habitatCount must be 8");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("species5175:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK species5175:validate — 75 species + 8 ecology habitats wired");
