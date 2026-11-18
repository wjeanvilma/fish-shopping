/**
 * Finish 3.0 Phase 9 — fish mesh pass 2 readiness.
 *
 * Usage:
 *   npm run fishart2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FISH_ART_2,
  FISH_ART_2_MARKER,
  FISH_ART_2_PHASE,
  FISH_ART_2_SCHEMA,
  measureFishArt2,
} from "../src/ship/fishArt2";
import { AUTHORED_FISH_FLOOR, FISH_ART_PASS } from "../src/ship/fishArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/fish-art-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-fish-art-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/FishArt2.kt"),
    "utf8",
  );

  if (catalog.phase !== 9) errors.push(`phase expected 9, got ${catalog.phase}`);
  if (catalog.schema !== FISH_ART_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (FISH_ART_2_PHASE !== 9) errors.push("phase mirror mismatch");
  if (catalog.fishArt2Marker !== FISH_ART_2_MARKER) errors.push("marker mismatch");
  if (fixture.fishArt2Marker !== FISH_ART_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");

  if (catalog.authoredSpeciesTarget !== 50) errors.push("authoredSpeciesTarget must be 50");
  if (catalog.newAuthoredCount !== 40) errors.push("newAuthoredCount must be 40");
  if (AUTHORED_FISH_FLOOR < 50) errors.push("fish-art-pass authoredSpeciesMin must be ≥ 50");
  if (FISH_ART_PASS.authoredSpecies.length < 50) {
    errors.push("fish-art-pass authoredSpecies must list ≥ 50");
  }

  const measure = measureFishArt2(root);
  if (measure.authoredCount < 50) {
    errors.push(`authored species count ${measure.authoredCount} < 50`);
  }
  if (measure.newAuthoredCount < 40) {
    errors.push(`new authored count ${measure.newAuthoredCount} < 40`);
  }
  if (!measure.gapClosed) errors.push("kickoff gaps.authoredFishRemaining must be 0");
  if (!measure.licensesOk) errors.push("licenses fish-authored-art must list all authored paths");
  if (!measure.dodQuotaOk) errors.push("DoD quotas.authoredFishSpecies must be ≥ 50");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase9 = (kickoff.phases as any[])?.find((p) => p.phase === 9);
  if (!phase9) errors.push("kickoff missing phase 9");
  else if (phase9.validate !== "fishart2:validate") {
    errors.push("kickoff phase 9 validate must be fishart2:validate");
  }
  if (kickoff.baseline?.authoredFish !== 50) {
    errors.push("kickoff.baseline.authoredFish must be 50");
  }
  if (kickoff.gaps?.authoredFishRemaining !== 0) {
    errors.push("kickoff.gaps.authoredFishRemaining must be 0");
  }

  if (listing.fishArt2Phase !== 9) errors.push("listing.fishArt2Phase must be 9");
  if (listing.fishArt2Catalog !== "shared/ship/fish-art-2.json") {
    errors.push("listing.fishArt2Catalog mismatch");
  }
  if (pin.fishArt2 !== "shared/ship/fish-art-2.json") errors.push("RELEASE_PIN.fishArt2 path missing");
  if (!pin.fixtures?.includes("parity-fish-art-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-fish-art-2.json");
  }

  const block = dod.fishArt2;
  if (!block) errors.push("DoD missing fishArt2 block");
  else {
    if (block.phase !== 9) errors.push("DoD fishArt2.phase must be 9");
    if (block.plan !== "30_finish_3.0") errors.push("DoD fishArt2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD fishArt2.status must be complete");
    if (block.fishArt2Marker !== FISH_ART_2_MARKER) errors.push("DoD fishArt2 marker mismatch");
  }

  if (!pkg.scripts?.["fishart2:validate"]) errors.push("package.json missing fishart2:validate");
  if (!ci.includes("fishart2:validate")) errors.push("ci.yml missing fishart2:validate");
  if (!kotlin.includes("AUTHORED_SPECIES_TARGET")) {
    errors.push("Kotlin FishArt2 missing AUTHORED_SPECIES_TARGET");
  }

  if (fixture.expect?.authoredSpeciesTarget !== 50) {
    errors.push("parity authoredSpeciesTarget must be 50");
  }
  if (fixture.expect?.authoredFishRemaining !== 0) {
    errors.push("parity authoredFishRemaining must be 0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("fishart2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK fishart2:validate — all 50 species authored; kickoff fish gap closed");
