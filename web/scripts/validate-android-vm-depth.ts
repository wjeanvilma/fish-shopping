/**
 * Finish 5.0 Phase 4 — Android VM/intent depth readiness.
 *
 * Usage:
 *   npm run androidvmdepth:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  ANDROID_VM_DEPTH,
  ANDROID_VM_DEPTH_MARKER,
  ANDROID_VM_DEPTH_PHASE,
  ANDROID_VM_DEPTH_SCHEMA,
  measureAndroidVmDepth,
} from "../src/ship/androidVmDepth";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/android-vm-depth.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-android-vm-depth.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/AndroidVmDepth.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 4) errors.push(`phase expected 4, got ${catalog.phase}`);
  if (catalog.schema !== ANDROID_VM_DEPTH_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (ANDROID_VM_DEPTH_PHASE !== 4) errors.push("phase mirror mismatch");
  if (catalog.androidVmDepthMarker !== ANDROID_VM_DEPTH_MARKER) errors.push("marker mismatch");
  if (fixture.androidVmDepthMarker !== ANDROID_VM_DEPTH_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureAndroidVmDepth(root);
  if (measure.viewFieldCount < ANDROID_VM_DEPTH.viewFieldMin) {
    errors.push(`view fields ${measure.viewFieldCount} < ${ANDROID_VM_DEPTH.viewFieldMin}`);
  }
  if (!measure.requiredFilesPresent) errors.push("required Android VM files missing");
  if (!measure.symbolsPresent) errors.push("required VM symbols missing");
  if (!measure.hudBindingsPresent) errors.push("HUD bindings missing Phase 2/3 view fields");
  if (!measure.loopSnapshotCoversFields) {
    errors.push("LoopHudSnapshot must cover all catalog viewFields");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 4 must set id=android-vm-depth validate=androidvmdepth:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase4 = (kickoff.phases as any[])?.find((p) => p.phase === 4);
  if (!phase4 || phase4.validate !== "androidvmdepth:validate") {
    errors.push("kickoff phase 4 validate must be androidvmdepth:validate");
  }
  if (phase4?.id !== "android-vm-depth") errors.push("kickoff phase 4 id must be android-vm-depth");

  if (listing.androidVmDepthPhase !== 4) errors.push("listing.androidVmDepthPhase must be 4");
  if (listing.androidVmDepthCatalog !== "shared/ship/android-vm-depth.json") {
    errors.push("listing.androidVmDepthCatalog mismatch");
  }
  if (pin.androidVmDepth !== "shared/ship/android-vm-depth.json") {
    errors.push("RELEASE_PIN.androidVmDepth path missing");
  }
  if (!pin.fixtures?.includes("parity-android-vm-depth.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-android-vm-depth.json");
  }

  const block = dod.androidVmDepth;
  if (!block) errors.push("DoD missing androidVmDepth block");
  else {
    if (block.phase !== 4) errors.push("DoD androidVmDepth.phase must be 4");
    if (block.plan !== "30_finish_5.0") errors.push("DoD androidVmDepth.plan mismatch");
    if (block.status !== "complete") errors.push("DoD androidVmDepth.status must be complete");
    if (block.androidVmDepthMarker !== ANDROID_VM_DEPTH_MARKER) {
      errors.push("DoD androidVmDepth marker mismatch");
    }
  }

  if (!pkg.scripts?.["androidvmdepth:validate"]) {
    errors.push("package.json missing androidvmdepth:validate");
  }
  if (!ci.includes("androidvmdepth:validate")) errors.push("ci.yml missing androidvmdepth:validate");
  if (!kotlin.includes("VIEW_FIELDS")) errors.push("Kotlin AndroidVmDepth missing VIEW_FIELDS");
  if (!kotlin.includes("HUD_SURFACES")) errors.push("Kotlin AndroidVmDepth missing HUD_SURFACES");
  if (!finish5Kt.includes("androidvmdepth:validate")) {
    errors.push("Finish5Kickoff.kt phase 4 missing androidvmdepth:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_android_vm_depth.py"))) {
    errors.push("missing author_android_vm_depth.py");
  }

  if (fixture.expect?.viewFieldMin !== 10) errors.push("parity viewFieldMin must be 10");
  if (fixture.expect?.hudBindingSurfaces !== 3) errors.push("parity hudBindingSurfaces must be 3");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("androidvmdepth:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK androidvmdepth:validate — Android VM/intent depth wired");
