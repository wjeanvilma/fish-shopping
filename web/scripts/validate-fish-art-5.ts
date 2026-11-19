/**
 * Finish 5.0 Phase 9 — fish art 5 readiness (species 101–125 meshes).
 *
 * Usage:
 *   npm run fishart5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  FISH_ART_5,
  FISH_ART_5_MARKER,
  FISH_ART_5_PHASE,
  FISH_ART_5_SCHEMA,
  measureFishArt5,
} from "../src/ship/fishArt5";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/fish-art-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-fish-art-5.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const pass = readJson(resolve(root, "shared/ship/fish-art-pass.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/FishArt5.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const themes = readFileSync(resolve(root, "shared/tools/fish_themes.py"), "utf8");

  if (catalog.phase !== 9) errors.push(`phase expected 9, got ${catalog.phase}`);
  if (catalog.schema !== FISH_ART_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (FISH_ART_5_PHASE !== 9) errors.push("phase mirror mismatch");
  if (catalog.fishArt5Marker !== FISH_ART_5_MARKER) errors.push("marker mismatch");
  if (fixture.fishArt5Marker !== FISH_ART_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.newSpeciesIds.length !== 25) errors.push("newSpeciesIds must list 25");
  if (catalog.authoredSpeciesTarget !== 125) errors.push("authoredSpeciesTarget must be 125");

  const measure = measureFishArt5(root);
  if (measure.authoredCount < 125) {
    errors.push(`authoredSpecies ${measure.authoredCount} < 125`);
  }
  if (measure.newStampedCount < 25) {
    errors.push(`Finish 5 stamped meshes ${measure.newStampedCount} < 25`);
  }
  if (!measure.minArtNodesMet) errors.push("new meshes must keep ≥6 FishArt_* nodes");
  if (!measure.gapClosed) errors.push("gaps.fishArt5Incomplete must be false after Phase 9");
  if (!measure.authoredFishRemainingClosed) {
    errors.push("gaps.authoredFishRemaining must be 0 after Phase 9");
  }
  if (!measure.speciesRemainingOpen) {
    errors.push("gaps.speciesRemaining must be 25 (pre Phase 13) or 0 (post Phase 13)");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("fishArt5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop fishArt5Incomplete after Phase 9");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 9 must set id=fish-art-5 validate=fishart5:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((pass.authoredSpecies ?? []).length < 125) {
    errors.push("fish-art-pass authoredSpecies must be ≥125");
  }
  if ((pass.authoredSpeciesMin ?? 0) < 125) {
    errors.push("fish-art-pass authoredSpeciesMin must be ≥125");
  }
  if (kickoff.baseline?.authoredFish !== 125) {
    errors.push("kickoff baseline.authoredFish must be 125");
  }
  if (kickoff.gaps?.fishArt5Incomplete !== false) {
    errors.push("kickoff gaps.fishArt5Incomplete must be false");
  }
  if (![0, 25].includes(kickoff.gaps?.speciesRemaining)) {
    errors.push("kickoff gaps.speciesRemaining must be 25 or 0 (Phase 13 closed)");
  }

  if (listing.fishArt5Phase !== 9) errors.push("listing.fishArt5Phase must be 9");
  if (listing.fishArt5Catalog !== "shared/ship/fish-art-5.json") {
    errors.push("listing.fishArt5Catalog mismatch");
  }
  if (pin.fishArt5 !== "shared/ship/fish-art-5.json") {
    errors.push("RELEASE_PIN.fishArt5 path missing");
  }
  if (!pin.fixtures?.includes("parity-fish-art-5.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-fish-art-5.json");
  }

  const block = dod.fishArt5;
  if (!block) errors.push("DoD missing fishArt5 block");
  else {
    if (block.phase !== 9) errors.push("DoD fishArt5.phase must be 9");
    if (block.status !== "complete") errors.push("DoD fishArt5.status must be complete");
    if (block.fishArt5Marker !== FISH_ART_5_MARKER) errors.push("DoD fishArt5 marker mismatch");
  }
  if ((dod.quotas?.authoredFishSpecies ?? 0) < 125) {
    errors.push("DoD quotas.authoredFishSpecies must be ≥125");
  }

  if (!pkg.scripts?.["fishart5:validate"]) errors.push("package.json missing fishart5:validate");
  if (!ci.includes("fishart5:validate")) errors.push("ci.yml missing fishart5:validate");
  if (!kotlin.includes("FINISH5_MARKER")) errors.push("Kotlin FishArt5 missing FINISH5_MARKER");
  if (!finish5Kt.includes("fishart5:validate")) {
    errors.push("Finish5Kickoff.kt phase 9 missing fishart5:validate");
  }
  const openBlock = finish5Kt.slice(
    finish5Kt.indexOf("OPEN_GAP_FLAGS"),
    finish5Kt.indexOf("OPEN_GAP_FLAGS") + 800,
  );
  if (openBlock.includes("fishArt5Incomplete")) {
    errors.push("Finish5Kickoff OPEN_GAP_FLAGS must drop fishArt5Incomplete");
  }
  if (!themes.includes("FISH_FINISH5_MARKER")) {
    errors.push("fish_themes.py missing FISH_FINISH5_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_fish_art_5.py"))) {
    errors.push("missing author_fish_art_5.py");
  }
  if (fixture.expect?.authoredSpeciesTarget !== 125) {
    errors.push("parity authoredSpeciesTarget must be 125");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("fishart5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK fishart5:validate — fish art 5 (species 101–125) locked; fishArt5Incomplete closed");
