/**
 * Finish 5.0 Phase 5 — GameHost + presenter/HUD depth readiness.
 *
 * Usage:
 *   npm run hostpresenterdepth:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  HOST_PRESENTER_DEPTH,
  HOST_PRESENTER_DEPTH_MARKER,
  HOST_PRESENTER_DEPTH_PHASE,
  HOST_PRESENTER_DEPTH_SCHEMA,
  measureHostPresenterDepth,
} from "../src/ship/hostPresenterDepth";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/host-presenter-depth.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-host-presenter-depth.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HostPresenterDepth.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 5) errors.push(`phase expected 5, got ${catalog.phase}`);
  if (catalog.schema !== HOST_PRESENTER_DEPTH_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (HOST_PRESENTER_DEPTH_PHASE !== 5) errors.push("phase mirror mismatch");
  if (catalog.hostPresenterDepthMarker !== HOST_PRESENTER_DEPTH_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.hostPresenterDepthMarker !== HOST_PRESENTER_DEPTH_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureHostPresenterDepth(root);
  if (measure.viewFieldCount < HOST_PRESENTER_DEPTH.viewFieldMin) {
    errors.push(`view fields ${measure.viewFieldCount} < ${HOST_PRESENTER_DEPTH.viewFieldMin}`);
  }
  if (!measure.requiredFilesPresent) errors.push("required host/presenter files missing");
  if (!measure.symbolsPresent) errors.push("required host symbols missing");
  if (!measure.hudBindingsPresent) errors.push("HUD bindings missing Phase 2/3 view fields");
  if (!measure.loopSnapshotCoversFields) {
    errors.push("loopHudSnapshot must cover all catalog viewFields");
  }
  if (!measure.kickoffWired) {
    errors.push(
      "kickoff phase 5 must set id=host-presenter-depth validate=hostpresenterdepth:validate",
    );
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase5 = (kickoff.phases as any[])?.find((p) => p.phase === 5);
  if (!phase5 || phase5.validate !== "hostpresenterdepth:validate") {
    errors.push("kickoff phase 5 validate must be hostpresenterdepth:validate");
  }
  if (phase5?.id !== "host-presenter-depth") {
    errors.push("kickoff phase 5 id must be host-presenter-depth");
  }

  if (listing.hostPresenterDepthPhase !== 5) {
    errors.push("listing.hostPresenterDepthPhase must be 5");
  }
  if (listing.hostPresenterDepthCatalog !== "shared/ship/host-presenter-depth.json") {
    errors.push("listing.hostPresenterDepthCatalog mismatch");
  }
  if (pin.hostPresenterDepth !== "shared/ship/host-presenter-depth.json") {
    errors.push("RELEASE_PIN.hostPresenterDepth path missing");
  }
  if (!pin.fixtures?.includes("parity-host-presenter-depth.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-host-presenter-depth.json");
  }

  const block = dod.hostPresenterDepth;
  if (!block) errors.push("DoD missing hostPresenterDepth block");
  else {
    if (block.phase !== 5) errors.push("DoD hostPresenterDepth.phase must be 5");
    if (block.plan !== "30_finish_5.0") errors.push("DoD hostPresenterDepth.plan mismatch");
    if (block.status !== "complete") errors.push("DoD hostPresenterDepth.status must be complete");
    if (block.hostPresenterDepthMarker !== HOST_PRESENTER_DEPTH_MARKER) {
      errors.push("DoD hostPresenterDepth marker mismatch");
    }
  }

  if (!pkg.scripts?.["hostpresenterdepth:validate"]) {
    errors.push("package.json missing hostpresenterdepth:validate");
  }
  if (!ci.includes("hostpresenterdepth:validate")) {
    errors.push("ci.yml missing hostpresenterdepth:validate");
  }
  if (!kotlin.includes("VIEW_FIELDS")) errors.push("Kotlin HostPresenterDepth missing VIEW_FIELDS");
  if (!kotlin.includes("HUD_SURFACES")) errors.push("Kotlin HostPresenterDepth missing HUD_SURFACES");
  if (!finish5Kt.includes("hostpresenterdepth:validate")) {
    errors.push("Finish5Kickoff.kt phase 5 missing hostpresenterdepth:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_host_presenter_depth.py"))) {
    errors.push("missing author_host_presenter_depth.py");
  }

  if (fixture.expect?.viewFieldMin !== 10) errors.push("parity viewFieldMin must be 10");
  if (fixture.expect?.hudBindingSurfaces !== 4) {
    errors.push("parity hudBindingSurfaces must be 4");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("hostpresenterdepth:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK hostpresenterdepth:validate — GameHost + presenter/HUD depth wired");
