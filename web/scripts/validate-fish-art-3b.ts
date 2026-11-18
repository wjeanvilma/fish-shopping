/**
 * Finish 4.0 Phase 8 — fish mesh pass 3b (species 76–100) readiness.
 *
 * Usage:
 *   npm run fishart3b:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  FISH_ART_3B,
  FISH_ART_3B_MARKER,
  FISH_ART_3B_PHASE,
  FISH_ART_3B_SCHEMA,
  measureFishArt3b,
} from "../src/ship/fishArt3b";
import { AUTHORED_FISH_FLOOR, FISH_ART_PASS } from "../src/ship/fishArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/fish-art-3b.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-fish-art-3b.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/FishArt3b.kt"),
    "utf8",
  );

  if (catalog.phase !== 8) errors.push(`phase expected 8, got ${catalog.phase}`);
  if (catalog.schema !== FISH_ART_3B_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (FISH_ART_3B_PHASE !== 8) errors.push("phase mirror mismatch");
  if (catalog.fishArt3bMarker !== FISH_ART_3B_MARKER) errors.push("marker mismatch");
  if (fixture.fishArt3bMarker !== FISH_ART_3B_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");

  if (catalog.authoredSpeciesTarget !== 100) errors.push("authoredSpeciesTarget must be 100");
  if (catalog.speciesCountTarget !== 100) errors.push("speciesCountTarget must be 100");
  if (catalog.newAuthoredCount !== 25) errors.push("newAuthoredCount must be 25");
  if ((catalog.newSpeciesIds as string[]).length !== 25) {
    errors.push("newSpeciesIds must list 25");
  }
  if (AUTHORED_FISH_FLOOR !== 100) errors.push("fish-art-pass authoredSpeciesMin must be 100");
  if (FISH_ART_PASS.authoredSpecies.length !== 100) {
    errors.push("fish-art-pass authoredSpecies must list 100");
  }

  const measure = measureFishArt3b(root);
  if (measure.authoredCount < 100) {
    errors.push(`authored species count ${measure.authoredCount} < 100`);
  }
  if (measure.speciesCount < 100) {
    errors.push(`content species count ${measure.speciesCount} < 100`);
  }
  if (measure.newAuthoredCount !== 25) {
    errors.push(`wave 76–100 authored count ${measure.newAuthoredCount} ≠ 25`);
  }
  if (!measure.wavePresent) errors.push("all 25 species 76–100 must be in fish-art-pass");
  if (!measure.gapClosed) {
    errors.push("kickoff baseline.authoredFish=100 and gaps.authoredFishRemaining=0 required");
  }
  if (!measure.speciesGapClosed) {
    errors.push("kickoff baseline.species≥100 and gaps.speciesRemaining=0 required");
  }
  if (!measure.licensesOk) errors.push("licenses fish-authored-art must list all authored paths");
  if (!measure.dodQuotaOk) {
    errors.push("DoD quotas.authoredFishSpecies and speciesMin must be ≥ 100");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);

  const phase8 = (kickoff.phases as any[])?.find((p) => p.phase === 8);
  if (!phase8) errors.push("kickoff missing phase 8");
  else if (phase8.validate !== "fishart3b:validate") {
    errors.push("kickoff phase 8 validate must be fishart3b:validate");
  }
  if (phase8?.id !== "fish-art-3b") errors.push("kickoff phase 8 id must be fish-art-3b");
  if (kickoff.baseline?.authoredFish !== 100) {
    errors.push("kickoff.baseline.authoredFish must be 100");
  }
  if (kickoff.gaps?.authoredFishRemaining !== 0) {
    errors.push("kickoff.gaps.authoredFishRemaining must be 0");
  }
  if (kickoff.gaps?.speciesRemaining !== 0) {
    errors.push("kickoff.gaps.speciesRemaining must be 0");
  }

  if (listing.fishArt3bPhase !== 8) errors.push("listing.fishArt3bPhase must be 8");
  if (listing.fishArt3bCatalog !== "shared/ship/fish-art-3b.json") {
    errors.push("listing.fishArt3bCatalog mismatch");
  }
  if (pin.fishArt3b !== "shared/ship/fish-art-3b.json") errors.push("RELEASE_PIN.fishArt3b path missing");
  if (!pin.fixtures?.includes("parity-fish-art-3b.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-fish-art-3b.json");
  }

  const block = dod.fishArt3b;
  if (!block) errors.push("DoD missing fishArt3b block");
  else {
    if (block.phase !== 8) errors.push("DoD fishArt3b.phase must be 8");
    if (block.plan !== "30_finish_4.0") errors.push("DoD fishArt3b.plan mismatch");
    if (block.status !== "complete") errors.push("DoD fishArt3b.status must be complete");
    if (block.fishArt3bMarker !== FISH_ART_3B_MARKER) errors.push("DoD fishArt3b marker mismatch");
  }

  if (!pkg.scripts?.["fishart3b:validate"]) errors.push("package.json missing fishart3b:validate");
  if (!ci.includes("fishart3b:validate")) errors.push("ci.yml missing fishart3b:validate");
  if (!kotlin.includes("AUTHORED_SPECIES_TARGET")) {
    errors.push("Kotlin FishArt3b missing AUTHORED_SPECIES_TARGET");
  }
  if (!kotlin.includes("NEW_SPECIES_IDS")) {
    errors.push("Kotlin FishArt3b missing NEW_SPECIES_IDS");
  }

  if (fixture.expect?.authoredSpeciesTarget !== 100) {
    errors.push("parity authoredSpeciesTarget must be 100");
  }
  if (fixture.expect?.authoredFishRemaining !== 0) {
    errors.push("parity authoredFishRemaining must be 0");
  }
  if (fixture.expect?.speciesRemaining !== 0) {
    errors.push("parity speciesRemaining must be 0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("fishart3b:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK fishart3b:validate — fish art 3b (meshes 76–100) locked");
