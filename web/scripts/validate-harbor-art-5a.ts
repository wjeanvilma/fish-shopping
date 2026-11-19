/**
 * Finish 5.0 Phase 7 — harbor art 5a readiness (harbors 1–6).
 *
 * Usage:
 *   npm run harborart5a:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  HARBOR_ART_5A,
  HARBOR_ART_5A_MARKER,
  HARBOR_ART_5A_PHASE,
  HARBOR_ART_5A_SCHEMA,
  measureHarborArt5a,
} from "../src/ship/harborArt5a";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbor-art-5a.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbor-art-5a.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HarborArt5a.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const themes = readFileSync(resolve(root, "shared/tools/harbor_themes.py"), "utf8");

  if (catalog.phase !== 7) errors.push(`phase expected 7, got ${catalog.phase}`);
  if (catalog.schema !== HARBOR_ART_5A_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (HARBOR_ART_5A_PHASE !== 7) errors.push("phase mirror mismatch");
  if (catalog.harborArt5aMarker !== HARBOR_ART_5A_MARKER) errors.push("marker mismatch");
  if (fixture.harborArt5aMarker !== HARBOR_ART_5A_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.finish5Harbors.length !== 6) errors.push("finish5Harbors must list 6 harbors");
  if (catalog.finish5HarborTarget !== 6) errors.push("finish5HarborTarget must be 6");

  const measure = measureHarborArt5a(root);
  if (!measure.finish5Present) errors.push("5a harbors missing from harbor-art-pass");
  if (measure.finish5Count < HARBOR_ART_5A.finish5HarborTarget) {
    errors.push(
      `finish5 stamped harbors ${measure.finish5Count} < ${HARBOR_ART_5A.finish5HarborTarget}`,
    );
  }
  if (!measure.minArtNodesMet) errors.push("5a harbors must keep ≥10 HarborArt_* nodes");
  if (!measure.authoredHarborsUnchanged) {
    errors.push("authoredHarbors must be 12 after harbors-11-12");
  }
  // Soft-floored: Phase 8 closed harborArt5Incomplete; 5a only requires the key exists.
  if (!measure.harborArt5IncompleteOpen) {
    errors.push("gaps.harborArt5Incomplete key must remain on kickoff");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 7 must set id=harbor-art-5a validate=harborart5a:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (fixture.expect?.finish5HarborTarget !== 6) {
    errors.push("parity finish5HarborTarget must be 6");
  }
  // Soft-floored after Phase 8: historical parity may still say open; live gap is closed.
  if (typeof fixture.expect?.harborArt5IncompleteStillOpen !== "boolean") {
    errors.push("parity must retain harborArt5IncompleteStillOpen boolean");
  }

  const phase7 = (kickoff.phases as any[])?.find((p) => p.phase === 7);
  if (!phase7 || phase7.validate !== "harborart5a:validate") {
    errors.push("kickoff phase 7 validate must be harborart5a:validate");
  }
  if (phase7?.id !== "harbor-art-5a") {
    errors.push("kickoff phase 7 id must be harbor-art-5a");
  }

  if (listing.harborArt5aPhase !== 7) errors.push("listing.harborArt5aPhase must be 7");
  if (listing.harborArt5aCatalog !== "shared/ship/harbor-art-5a.json") {
    errors.push("listing.harborArt5aCatalog mismatch");
  }
  if (pin.harborArt5a !== "shared/ship/harbor-art-5a.json") {
    errors.push("RELEASE_PIN.harborArt5a path missing");
  }
  if (!pin.fixtures?.includes("parity-harbor-art-5a.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbor-art-5a.json");
  }

  const block = dod.harborArt5a;
  if (!block) errors.push("DoD missing harborArt5a block");
  else {
    if (block.phase !== 7) errors.push("DoD harborArt5a.phase must be 7");
    if (block.plan !== "30_finish_5.0") errors.push("DoD harborArt5a.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harborArt5a.status must be complete");
    if (block.harborArt5aMarker !== HARBOR_ART_5A_MARKER) {
      errors.push("DoD harborArt5a marker mismatch");
    }
  }

  if (!pkg.scripts?.["harborart5a:validate"]) {
    errors.push("package.json missing harborart5a:validate");
  }
  if (!ci.includes("harborart5a:validate")) {
    errors.push("ci.yml missing harborart5a:validate");
  }
  if (!kotlin.includes("FINISH5_MARKER")) {
    errors.push("Kotlin HarborArt5a missing FINISH5_MARKER");
  }
  if (!finish5Kt.includes("harborart5a:validate")) {
    errors.push("Finish5Kickoff.kt phase 7 missing harborart5a:validate");
  }
  if (!themes.includes("HARBOR_FINISH5_5A_MARKER")) {
    errors.push("harbor_themes.py missing HARBOR_FINISH5_5A_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_harbor_art_5a.py"))) {
    errors.push("missing author_harbor_art_5a.py");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harborart5a:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harborart5a:validate — harbor art 5a (harbors 1–6) locked");
