/**
 * Finish 6.0 Phase 11 — atmosphere/cozy render depth 6 readiness.
 *
 * Usage:
 *   npm run atmosphere6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  ATMOSPHERE_6,
  ATMOSPHERE_6_MARKER,
  ATMOSPHERE_6_PHASE,
  ATMOSPHERE_6_SCHEMA,
  measureAtmosphere6,
} from "../src/ship/atmosphere6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/atmosphere-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-atmosphere-6.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Atmosphere6.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const cozy = readFileSync(resolve(root, "shared/tools/cozy_art.py"), "utf8");

  if (catalog.phase !== 11) errors.push(`phase expected 11, got ${catalog.phase}`);
  if (catalog.schema !== ATMOSPHERE_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (ATMOSPHERE_6_PHASE !== 11) errors.push("phase mirror mismatch");
  if (catalog.atmosphere6Marker !== ATMOSPHERE_6_MARKER) errors.push("marker mismatch");
  if (fixture.atmosphere6Marker !== ATMOSPHERE_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if ((catalog.finish6HarborTarget ?? 0) < 14) errors.push("finish6HarborTarget must be ≥ 14");

  const measure = measureAtmosphere6(root);
  if (measure.harborCount < ATMOSPHERE_6.finish6HarborTarget) {
    errors.push(`harbors ${measure.harborCount} < ${ATMOSPHERE_6.finish6HarborTarget}`);
  }
  if (measure.stampedCount < ATMOSPHERE_6.finish6HarborTarget) {
    errors.push(`stamped harbors ${measure.stampedCount} < target`);
  }
  if (!measure.finish5Retained) errors.push("Finish 5 atmosphere stamps must be retained");
  if (!measure.socketsOk) errors.push("Water/Foam/LampGlow sockets missing on harbors");
  if (!measure.renderModulesPresent) errors.push("atmosphere render modules missing");
  if (!measure.atmosphereSamplesOk) errors.push("atmosphereFrame sample smoke failed");
  if (!measure.gapClosed) errors.push("gaps.atmosphere6Incomplete must be false after Phase 11");
  if (FINISH6_OPEN_GAP_FLAGS.includes("atmosphere6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop atmosphere6Incomplete after Phase 11");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 11 must set id=atmosphere-6 validate=atmosphere6:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.atmosphere6Incomplete !== false) {
    errors.push("kickoff gaps.atmosphere6Incomplete must be false");
  }
  if (listing.atmosphere6Phase !== 11) errors.push("listing.atmosphere6Phase must be 11");
  if (listing.atmosphere6Catalog !== "shared/ship/atmosphere-6.json") {
    errors.push("listing.atmosphere6Catalog mismatch");
  }
  if (pin.atmosphere6 !== "shared/ship/atmosphere-6.json") {
    errors.push("RELEASE_PIN.atmosphere6 path missing");
  }
  if (!pin.fixtures?.includes("parity-atmosphere-6.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-atmosphere-6.json");
  }

  const block = dod.atmosphere6;
  if (!block) errors.push("DoD missing atmosphere6 block");
  else {
    if (block.phase !== 11) errors.push("DoD atmosphere6.phase must be 11");
    if (block.plan !== "30_finish_6.0") errors.push("DoD atmosphere6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD atmosphere6.status must be complete");
    if (block.atmosphere6Marker !== ATMOSPHERE_6_MARKER) {
      errors.push("DoD atmosphere6 marker mismatch");
    }
  }

  if (!pkg.scripts?.["atmosphere6:validate"]) {
    errors.push("package.json missing atmosphere6:validate");
  }
  if (!pkg.scripts?.["atmosphere6:smoke"]) {
    errors.push("package.json missing atmosphere6:smoke");
  }
  if (!ci.includes("atmosphere6:validate")) {
    errors.push("ci.yml missing atmosphere6:validate");
  }
  if (!kotlin.includes("FINISH6_MARKER")) {
    errors.push("Kotlin Atmosphere6 missing FINISH6_MARKER");
  }
  if (!finish6Kt.includes("atmosphere6:validate")) {
    errors.push("Finish6Kickoff.kt phase 11 missing atmosphere6:validate");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openBlock.includes("atmosphere6Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop atmosphere6Incomplete");
  }
  if (!cozy.includes("ATMOSPHERE_FINISH6_MARKER")) {
    errors.push("cozy_art.py missing ATMOSPHERE_FINISH6_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_atmosphere_6.py"))) {
    errors.push("missing author_atmosphere_6.py");
  }
  if (fixture.expect?.atmosphere6IncompleteClosed !== true) {
    errors.push("parity must expect atmosphere6IncompleteClosed");
  }
  // Soft-floor: Phase 14 closed endgameSchema27Pending → openGapFlagMin 15.
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("atmosphere6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK atmosphere6:validate — atmosphere/cozy depth 6 locked; atmosphere6Incomplete closed");
