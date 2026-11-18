/**
 * Finish 4.0 Phase 9 — harbor art scenic pass (beyond blockout) readiness.
 *
 * Usage:
 *   npm run harborart3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  HARBOR_ART_3,
  HARBOR_ART_3_MARKER,
  HARBOR_ART_3_PHASE,
  HARBOR_ART_3_SCHEMA,
  measureHarborArt3,
} from "../src/ship/harborArt3";
import { AUTHORED_HARBOR_FLOOR, HARBOR_ART_MARKER, HARBOR_ART_PASS } from "../src/ship/harborArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbor-art-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbor-art-3.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HarborArt3.kt"),
    "utf8",
  );

  if (catalog.phase !== 9) errors.push(`phase expected 9, got ${catalog.phase}`);
  if (catalog.schema !== HARBOR_ART_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (HARBOR_ART_3_PHASE !== 9) errors.push("phase mirror mismatch");
  if (catalog.harborArt3Marker !== HARBOR_ART_3_MARKER) errors.push("marker mismatch");
  if (fixture.harborArt3Marker !== HARBOR_ART_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");

  if (catalog.authoredHarborTarget !== 8) errors.push("authoredHarborTarget must be 8");
  if (catalog.scenicHarborTarget !== 8) errors.push("scenicHarborTarget must be 8");
  if (catalog.minHarborArtNodes !== 10) errors.push("minHarborArtNodes must be 10");
  if ((catalog.scenicHarbors as unknown[]).length !== 8) {
    errors.push("scenicHarbors must list 8");
  }
  if (AUTHORED_HARBOR_FLOOR < 8) errors.push("harbor-art-pass authoredHarborMin must be ≥ 8");
  if (HARBOR_ART_PASS.authoredHarbors.length < 8) {
    errors.push("harbor-art-pass authoredHarbors must list ≥ 8");
  }
  if (HARBOR_ART_MARKER !== HARBOR_ART_3.harborArtMarker) {
    errors.push("harbor-art-pass harborArtMarker must match harbor-art-3");
  }

  const measure = measureHarborArt3(root);
  if (measure.authoredCount < 8) {
    errors.push(`authored harbor count ${measure.authoredCount} < 8`);
  }
  if (measure.scenicCount !== 8) {
    errors.push(`scenic harbor count ${measure.scenicCount} ≠ 8`);
  }
  if (!measure.scenicPresent) errors.push("all 8 scenic harbors must be in harbor-art-pass");
  if (!measure.minArtNodesMet) {
    errors.push("each scenic harbor must have ≥10 HarborArt_* nodes");
  }
  if (!measure.gapClosed) {
    errors.push("kickoff gaps.harborBlockoutPresent=false and baseline.harborBlockouts=0 required");
  }
  if (!measure.licensesOk) errors.push("licenses harbor-authored-art must list all authored paths");
  if (!measure.dodQuotaOk) errors.push("DoD quotas.authoredHarborScenes must be ≥ 8");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);

  const phase9 = (kickoff.phases as any[])?.find((p) => p.phase === 9);
  if (!phase9) errors.push("kickoff missing phase 9");
  else if (phase9.validate !== "harborart3:validate") {
    errors.push("kickoff phase 9 validate must be harborart3:validate");
  }
  if (phase9?.id !== "harbor-art-3") errors.push("kickoff phase 9 id must be harbor-art-3");
  if (kickoff.gaps?.harborBlockoutPresent !== false) {
    errors.push("kickoff.gaps.harborBlockoutPresent must be false");
  }
  if (kickoff.baseline?.harborBlockouts !== 0) {
    errors.push("kickoff.baseline.harborBlockouts must be 0");
  }

  if (listing.harborArt3Phase !== 9) errors.push("listing.harborArt3Phase must be 9");
  if (listing.harborArt3Catalog !== "shared/ship/harbor-art-3.json") {
    errors.push("listing.harborArt3Catalog mismatch");
  }
  if (pin.harborArt3 !== "shared/ship/harbor-art-3.json") errors.push("RELEASE_PIN.harborArt3 path missing");
  if (!pin.fixtures?.includes("parity-harbor-art-3.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbor-art-3.json");
  }

  const block = dod.harborArt3;
  if (!block) errors.push("DoD missing harborArt3 block");
  else {
    if (block.phase !== 9) errors.push("DoD harborArt3.phase must be 9");
    if (block.plan !== "30_finish_4.0") errors.push("DoD harborArt3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harborArt3.status must be complete");
    if (block.harborArt3Marker !== HARBOR_ART_3_MARKER) errors.push("DoD harborArt3 marker mismatch");
  }

  if (!pkg.scripts?.["harborart3:validate"]) errors.push("package.json missing harborart3:validate");
  if (!ci.includes("harborart3:validate")) errors.push("ci.yml missing harborart3:validate");
  if (!kotlin.includes("SCENIC_HARBOR_IDS")) {
    errors.push("Kotlin HarborArt3 missing SCENIC_HARBOR_IDS");
  }
  if (!kotlin.includes("MIN_HARBOR_ART_NODES")) {
    errors.push("Kotlin HarborArt3 missing MIN_HARBOR_ART_NODES");
  }

  if (fixture.expect?.scenicHarborTarget !== 8) {
    errors.push("parity scenicHarborTarget must be 8");
  }
  if (fixture.expect?.harborBlockoutPresent !== false) {
    errors.push("parity harborBlockoutPresent must be false");
  }
  if (fixture.expect?.minHarborArtNodes !== 10) {
    errors.push("parity minHarborArtNodes must be 10");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harborart3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harborart3:validate — harbor art scenic pass (beyond blockout) locked");
