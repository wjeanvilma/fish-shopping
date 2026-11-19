/**
 * Finish 5.0 Phase 11 — atmosphere/cozy render depth 5 readiness.
 *
 * Usage:
 *   npm run atmosphere5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  ATMOSPHERE_5,
  ATMOSPHERE_5_MARKER,
  ATMOSPHERE_5_PHASE,
  ATMOSPHERE_5_SCHEMA,
  measureAtmosphere5,
} from "../src/ship/atmosphere5";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/atmosphere-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-atmosphere-5.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Atmosphere5.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const cozy = readFileSync(resolve(root, "shared/tools/cozy_art.py"), "utf8");

  if (catalog.phase !== 11) errors.push(`phase expected 11, got ${catalog.phase}`);
  if (catalog.schema !== ATMOSPHERE_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (ATMOSPHERE_5_PHASE !== 11) errors.push("phase mirror mismatch");
  if (catalog.atmosphere5Marker !== ATMOSPHERE_5_MARKER) errors.push("marker mismatch");
  if (fixture.atmosphere5Marker !== ATMOSPHERE_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.finish5HarborTarget !== 10) errors.push("finish5HarborTarget must be 10");

  const measure = measureAtmosphere5(root);
  if (measure.harborCount < ATMOSPHERE_5.finish5HarborTarget) {
    errors.push(`harbors ${measure.harborCount} < ${ATMOSPHERE_5.finish5HarborTarget}`);
  }
  if (measure.stampedCount < ATMOSPHERE_5.finish5HarborTarget) {
    errors.push(`stamped harbors ${measure.stampedCount} < target`);
  }
  if (!measure.socketsOk) errors.push("Water/Foam/LampGlow sockets missing on harbors");
  if (!measure.renderModulesPresent) errors.push("atmosphere render modules missing");
  if (!measure.atmosphereSamplesOk) errors.push("atmosphereFrame sample smoke failed");
  if (!measure.gapClosed) errors.push("gaps.atmosphere5Incomplete must be false after Phase 11");
  if (FINISH5_OPEN_GAP_FLAGS.includes("atmosphere5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop atmosphere5Incomplete after Phase 11");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 11 must set id=atmosphere-5 validate=atmosphere5:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.atmosphere5Incomplete !== false) {
    errors.push("kickoff gaps.atmosphere5Incomplete must be false");
  }
  if (listing.atmosphere5Phase !== 11) errors.push("listing.atmosphere5Phase must be 11");
  if (listing.atmosphere5Catalog !== "shared/ship/atmosphere-5.json") {
    errors.push("listing.atmosphere5Catalog mismatch");
  }
  if (pin.atmosphere5 !== "shared/ship/atmosphere-5.json") {
    errors.push("RELEASE_PIN.atmosphere5 path missing");
  }
  if (!pin.fixtures?.includes("parity-atmosphere-5.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-atmosphere-5.json");
  }

  const block = dod.atmosphere5;
  if (!block) errors.push("DoD missing atmosphere5 block");
  else {
    if (block.phase !== 11) errors.push("DoD atmosphere5.phase must be 11");
    if (block.status !== "complete") errors.push("DoD atmosphere5.status must be complete");
    if (block.atmosphere5Marker !== ATMOSPHERE_5_MARKER) {
      errors.push("DoD atmosphere5 marker mismatch");
    }
  }

  if (!pkg.scripts?.["atmosphere5:validate"]) {
    errors.push("package.json missing atmosphere5:validate");
  }
  if (!ci.includes("atmosphere5:validate")) {
    errors.push("ci.yml missing atmosphere5:validate");
  }
  if (!kotlin.includes("FINISH5_MARKER")) {
    errors.push("Kotlin Atmosphere5 missing FINISH5_MARKER");
  }
  if (!finish5Kt.includes("atmosphere5:validate")) {
    errors.push("Finish5Kickoff.kt phase 11 missing atmosphere5:validate");
  }
  const openBlock = finish5Kt.slice(
    finish5Kt.indexOf("OPEN_GAP_FLAGS"),
    finish5Kt.indexOf("OPEN_GAP_FLAGS") + 800,
  );
  if (openBlock.includes("atmosphere5Incomplete")) {
    errors.push("Finish5Kickoff OPEN_GAP_FLAGS must drop atmosphere5Incomplete");
  }
  if (!cozy.includes("ATMOSPHERE_FINISH5_MARKER")) {
    errors.push("cozy_art.py missing ATMOSPHERE_FINISH5_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_atmosphere_5.py"))) {
    errors.push("missing author_atmosphere_5.py");
  }
  if (fixture.expect?.atmosphere5IncompleteClosed !== true) {
    errors.push("parity must expect atmosphere5IncompleteClosed");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("atmosphere5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK atmosphere5:validate — atmosphere/cozy depth 5 locked; atmosphere5Incomplete closed");
