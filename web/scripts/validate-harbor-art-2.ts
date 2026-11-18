/**
 * Finish 3.0 Phase 8 — harbor art pass 2 readiness.
 *
 * Usage:
 *   npm run harborart2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HARBOR_ART_2,
  HARBOR_ART_2_MARKER,
  HARBOR_ART_2_PHASE,
  HARBOR_ART_2_SCHEMA,
  measureHarborArt2,
} from "../src/ship/harborArt2";
import { AUTHORED_HARBOR_FLOOR, HARBOR_ART_PASS } from "../src/ship/harborArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbor-art-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbor-art-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HarborArt2.kt"),
    "utf8",
  );

  if (catalog.phase !== 8) errors.push(`phase expected 8, got ${catalog.phase}`);
  if (catalog.schema !== HARBOR_ART_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (HARBOR_ART_2_PHASE !== 8) errors.push("phase mirror mismatch");
  if (catalog.harborArt2Marker !== HARBOR_ART_2_MARKER) errors.push("marker mismatch");
  if (fixture.harborArt2Marker !== HARBOR_ART_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");

  if (catalog.authoredHarborTarget !== 8) errors.push("authoredHarborTarget must be 8");
  if (catalog.newAuthoredHarbors?.length !== 5) errors.push("newAuthoredHarbors must list 5");
  if (AUTHORED_HARBOR_FLOOR !== 8) errors.push("harbor-art-pass authoredHarborMin must be 8");
  if (HARBOR_ART_PASS.authoredHarbors.length !== 8) {
    errors.push("harbor-art-pass authoredHarbors must list 8");
  }

  const measure = measureHarborArt2(root);
  if (measure.authoredCount < 8) {
    errors.push(`authored harbor count ${measure.authoredCount} < 8`);
  }
  if (!measure.newAuthoredPresent) errors.push("new authored harbors missing from harbor-art-pass");
  if (measure.newThemeCount !== 5) errors.push(`new theme matches ${measure.newThemeCount} ≠ 5`);
  if (!measure.gapClosed) errors.push("kickoff gaps.authoredHarborsRemaining must be 0");
  if (!measure.licensesOk) errors.push("licenses harbor-authored-art must list all authored paths");
  if (!measure.dodQuotaOk) errors.push("DoD quotas.authoredHarborScenes must be ≥ 8");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase8 = (kickoff.phases as any[])?.find((p) => p.phase === 8);
  if (!phase8) errors.push("kickoff missing phase 8");
  else if (phase8.validate !== "harborart2:validate") {
    errors.push("kickoff phase 8 validate must be harborart2:validate");
  }
  if (kickoff.baseline?.authoredHarbors !== 8) {
    errors.push("kickoff.baseline.authoredHarbors must be 8");
  }
  if (kickoff.gaps?.authoredHarborsRemaining !== 0) {
    errors.push("kickoff.gaps.authoredHarborsRemaining must be 0");
  }

  if (listing.harborArt2Phase !== 8) errors.push("listing.harborArt2Phase must be 8");
  if (listing.harborArt2Catalog !== "shared/ship/harbor-art-2.json") {
    errors.push("listing.harborArt2Catalog mismatch");
  }
  if (pin.harborArt2 !== "shared/ship/harbor-art-2.json") errors.push("RELEASE_PIN.harborArt2 path missing");
  if (!pin.fixtures?.includes("parity-harbor-art-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbor-art-2.json");
  }

  const block = dod.harborArt2;
  if (!block) errors.push("DoD missing harborArt2 block");
  else {
    if (block.phase !== 8) errors.push("DoD harborArt2.phase must be 8");
    if (block.plan !== "30_finish_3.0") errors.push("DoD harborArt2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harborArt2.status must be complete");
    if (block.harborArt2Marker !== HARBOR_ART_2_MARKER) errors.push("DoD harborArt2 marker mismatch");
  }

  if (!pkg.scripts?.["harborart2:validate"]) errors.push("package.json missing harborart2:validate");
  if (!ci.includes("harborart2:validate")) errors.push("ci.yml missing harborart2:validate");
  if (!kotlin.includes("NEW_AUTHORED_HARBOR_IDS")) {
    errors.push("Kotlin HarborArt2 missing NEW_AUTHORED_HARBOR_IDS");
  }

  if (fixture.expect?.authoredHarborTarget !== 8) {
    errors.push("parity authoredHarborTarget must be 8");
  }
  if (fixture.expect?.authoredHarborsRemaining !== 0) {
    errors.push("parity authoredHarborsRemaining must be 0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harborart2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harborart2:validate — all 8 harbors authored; kickoff harbor gap closed");
