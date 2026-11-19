/**
 * Finish 5.0 Phase 8 — harbor art 5b readiness (harbors 7–10).
 *
 * Usage:
 *   npm run harborart5b:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  HARBOR_ART_5B,
  HARBOR_ART_5B_MARKER,
  HARBOR_ART_5B_PHASE,
  HARBOR_ART_5B_SCHEMA,
  measureHarborArt5b,
} from "../src/ship/harborArt5b";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbor-art-5b.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbor-art-5b.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HarborArt5b.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const themes = readFileSync(resolve(root, "shared/tools/harbor_themes.py"), "utf8");

  if (catalog.phase !== 8) errors.push(`phase expected 8, got ${catalog.phase}`);
  if (catalog.schema !== HARBOR_ART_5B_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (HARBOR_ART_5B_PHASE !== 8) errors.push("phase mirror mismatch");
  if (catalog.harborArt5bMarker !== HARBOR_ART_5B_MARKER) errors.push("marker mismatch");
  if (fixture.harborArt5bMarker !== HARBOR_ART_5B_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.finish5Harbors.length !== 4) errors.push("finish5Harbors must list 4 harbors");
  if (catalog.finish5HarborTarget !== 4) errors.push("finish5HarborTarget must be 4");

  const measure = measureHarborArt5b(root);
  if (!measure.finish5Present) errors.push("5b harbors missing from harbor-art-pass");
  if (measure.finish5Count < HARBOR_ART_5B.finish5HarborTarget) {
    errors.push(
      `finish5 stamped harbors ${measure.finish5Count} < ${HARBOR_ART_5B.finish5HarborTarget}`,
    );
  }
  if (!measure.minArtNodesMet) errors.push("5b harbors must keep ≥10 HarborArt_* nodes");
  if (!measure.authoredHarborsUnchanged) {
    errors.push("authoredHarbors must be 12 after harbors-11-12");
  }
  if (!measure.gapClosed) {
    errors.push("gaps.harborArt5Incomplete must be false after Phase 8");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("harborArt5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop harborArt5Incomplete after Phase 8");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 8 must set id=harbor-art-5b validate=harborart5b:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (fixture.expect?.finish5HarborTarget !== 4) {
    errors.push("parity finish5HarborTarget must be 4");
  }
  if (fixture.expect?.harborArt5IncompleteClosed !== true) {
    errors.push("parity must expect harborArt5IncompleteClosed");
  }

  const phase8 = (kickoff.phases as any[])?.find((p) => p.phase === 8);
  if (!phase8 || phase8.validate !== "harborart5b:validate") {
    errors.push("kickoff phase 8 validate must be harborart5b:validate");
  }
  if (phase8?.id !== "harbor-art-5b") {
    errors.push("kickoff phase 8 id must be harbor-art-5b");
  }
  if (kickoff.gaps?.harborArt5Incomplete !== false) {
    errors.push("kickoff gaps.harborArt5Incomplete must be false");
  }

  if (listing.harborArt5bPhase !== 8) errors.push("listing.harborArt5bPhase must be 8");
  if (listing.harborArt5bCatalog !== "shared/ship/harbor-art-5b.json") {
    errors.push("listing.harborArt5bCatalog mismatch");
  }
  if (pin.harborArt5b !== "shared/ship/harbor-art-5b.json") {
    errors.push("RELEASE_PIN.harborArt5b path missing");
  }
  if (!pin.fixtures?.includes("parity-harbor-art-5b.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbor-art-5b.json");
  }

  const block = dod.harborArt5b;
  if (!block) errors.push("DoD missing harborArt5b block");
  else {
    if (block.phase !== 8) errors.push("DoD harborArt5b.phase must be 8");
    if (block.plan !== "30_finish_5.0") errors.push("DoD harborArt5b.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harborArt5b.status must be complete");
    if (block.harborArt5bMarker !== HARBOR_ART_5B_MARKER) {
      errors.push("DoD harborArt5b marker mismatch");
    }
  }

  if (!pkg.scripts?.["harborart5b:validate"]) {
    errors.push("package.json missing harborart5b:validate");
  }
  if (!ci.includes("harborart5b:validate")) {
    errors.push("ci.yml missing harborart5b:validate");
  }
  if (!kotlin.includes("FINISH5_MARKER")) {
    errors.push("Kotlin HarborArt5b missing FINISH5_MARKER");
  }
  if (!finish5Kt.includes("harborart5b:validate")) {
    errors.push("Finish5Kickoff.kt phase 8 missing harborart5b:validate");
  }
  const openBlock = finish5Kt.slice(
    finish5Kt.indexOf("OPEN_GAP_FLAGS"),
    finish5Kt.indexOf("OPEN_GAP_FLAGS") + 800,
  );
  if (openBlock.includes("harborArt5Incomplete")) {
    errors.push("Finish5Kickoff OPEN_GAP_FLAGS must drop harborArt5Incomplete");
  }
  if (!themes.includes("HARBOR_FINISH5_5B_MARKER")) {
    errors.push("harbor_themes.py missing HARBOR_FINISH5_5B_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_harbor_art_5b.py"))) {
    errors.push("missing author_harbor_art_5b.py");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harborart5b:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harborart5b:validate — harbor art 5b (harbors 7–10) locked; harborArt5Incomplete closed");
