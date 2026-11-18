/**
 * Finish 4.0 Phase 7 — fish mesh pass 3a (species 51–75) readiness.
 *
 * Usage:
 *   npm run fishart3a:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  FISH_ART_3A,
  FISH_ART_3A_MARKER,
  FISH_ART_3A_PHASE,
  FISH_ART_3A_SCHEMA,
  measureFishArt3a,
} from "../src/ship/fishArt3a";
import { AUTHORED_FISH_FLOOR, FISH_ART_PASS } from "../src/ship/fishArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/fish-art-3a.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-fish-art-3a.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/FishArt3a.kt"),
    "utf8",
  );

  if (catalog.phase !== 7) errors.push(`phase expected 7, got ${catalog.phase}`);
  if (catalog.schema !== FISH_ART_3A_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (FISH_ART_3A_PHASE !== 7) errors.push("phase mirror mismatch");
  if (catalog.fishArt3aMarker !== FISH_ART_3A_MARKER) errors.push("marker mismatch");
  if (fixture.fishArt3aMarker !== FISH_ART_3A_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");

  if (catalog.authoredSpeciesTarget !== 75) errors.push("authoredSpeciesTarget must be 75");
  if (catalog.newAuthoredCount !== 25) errors.push("newAuthoredCount must be 25");
  if ((catalog.newSpeciesIds as string[]).length !== 25) {
    errors.push("newSpeciesIds must list 25");
  }
  if (AUTHORED_FISH_FLOOR < 75) errors.push("fish-art-pass authoredSpeciesMin must be ≥ 75");
  if (FISH_ART_PASS.authoredSpecies.length < 75) {
    errors.push("fish-art-pass authoredSpecies must list ≥ 75");
  }

  const measure = measureFishArt3a(root);
  if (measure.authoredCount < 75) {
    errors.push(`authored species count ${measure.authoredCount} < 75`);
  }
  if (measure.newAuthoredCount !== 25) {
    errors.push(`wave 51–75 authored count ${measure.newAuthoredCount} ≠ 25`);
  }
  if (!measure.wavePresent) errors.push("all 25 species 51–75 must be in fish-art-pass");
  if (!measure.gapClosed) {
    errors.push(
      "kickoff baseline.authoredFish≥75 and gaps.authoredFishRemaining≤25 required",
    );
  }
  if (!measure.licensesOk) errors.push("licenses fish-authored-art must list all authored paths");
  if (!measure.dodQuotaOk) errors.push("DoD quotas.authoredFishSpecies must be ≥ 75");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase7 = (kickoff.phases as any[])?.find((p) => p.phase === 7);
  if (!phase7) errors.push("kickoff missing phase 7");
  else if (phase7.validate !== "fishart3a:validate") {
    errors.push("kickoff phase 7 validate must be fishart3a:validate");
  }
  if (phase7?.id !== "fish-art-3a") errors.push("kickoff phase 7 id must be fish-art-3a");
  if ((kickoff.baseline?.authoredFish ?? 0) < 75) {
    errors.push("kickoff.baseline.authoredFish must be ≥ 75");
  }
  if ((kickoff.gaps?.authoredFishRemaining ?? 99) > 25) {
    errors.push("kickoff.gaps.authoredFishRemaining must be ≤ 25");
  }

  if (listing.fishArt3aPhase !== 7) errors.push("listing.fishArt3aPhase must be 7");
  if (listing.fishArt3aCatalog !== "shared/ship/fish-art-3a.json") {
    errors.push("listing.fishArt3aCatalog mismatch");
  }
  if (pin.fishArt3a !== "shared/ship/fish-art-3a.json") errors.push("RELEASE_PIN.fishArt3a path missing");
  if (!pin.fixtures?.includes("parity-fish-art-3a.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-fish-art-3a.json");
  }

  const block = dod.fishArt3a;
  if (!block) errors.push("DoD missing fishArt3a block");
  else {
    if (block.phase !== 7) errors.push("DoD fishArt3a.phase must be 7");
    if (block.plan !== "30_finish_4.0") errors.push("DoD fishArt3a.plan mismatch");
    if (block.status !== "complete") errors.push("DoD fishArt3a.status must be complete");
    if (block.fishArt3aMarker !== FISH_ART_3A_MARKER) errors.push("DoD fishArt3a marker mismatch");
  }

  if (!pkg.scripts?.["fishart3a:validate"]) errors.push("package.json missing fishart3a:validate");
  if (!ci.includes("fishart3a:validate")) errors.push("ci.yml missing fishart3a:validate");
  if (!kotlin.includes("AUTHORED_SPECIES_TARGET")) {
    errors.push("Kotlin FishArt3a missing AUTHORED_SPECIES_TARGET");
  }
  if (!kotlin.includes("NEW_SPECIES_IDS")) {
    errors.push("Kotlin FishArt3a missing NEW_SPECIES_IDS");
  }

  if (fixture.expect?.authoredSpeciesTarget !== 75) {
    errors.push("parity authoredSpeciesTarget must be 75");
  }
  if (fixture.expect?.authoredFishRemaining !== 25) {
    errors.push("parity authoredFishRemaining must be 25");
  }
  if (fixture.expect?.newAuthoredCount !== 25) {
    errors.push("parity newAuthoredCount must be 25");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("fishart3a:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK fishart3a:validate — fish art 3a (meshes 51–75) locked");
