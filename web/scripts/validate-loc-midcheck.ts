/**
 * Finish 5.0 Phase 6 — LOC mid-check scoreboard readiness.
 *
 * Usage:
 *   npm run locmidcheck:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  LOC_MIDCHECK,
  LOC_MIDCHECK_MARKER,
  LOC_MIDCHECK_PHASE,
  LOC_MIDCHECK_SCHEMA,
  measureLocMidcheck,
} from "../src/ship/locMidcheck";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/loc-midcheck.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-loc-midcheck.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const locFloors = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LocMidcheck.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 6) errors.push(`phase expected 6, got ${catalog.phase}`);
  if (catalog.schema !== LOC_MIDCHECK_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (LOC_MIDCHECK_PHASE !== 6) errors.push("phase mirror mismatch");
  if (catalog.locMidcheckMarker !== LOC_MIDCHECK_MARKER) errors.push("marker mismatch");
  if (fixture.locMidcheckMarker !== LOC_MIDCHECK_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureLocMidcheck(root);
  if (!measure.meetsInterimFloors) {
    errors.push(
      `live LOC below interim soft floors (product ${measure.live.productTotal} < ${LOC_MIDCHECK.interimSoftFloors.productLoc})`,
    );
  }
  if (!measure.meetsPriorBaseline) {
    errors.push("live LOC collapsed below Phase 1 kickoff baseline");
  }
  if (!measure.midcheckAligned) {
    errors.push(
      `live LOC drifted below locked midcheck beyond slack ${LOC_MIDCHECK.midcheckSlackLines}`,
    );
  }
  if (!measure.planTargetsIntact) {
    errors.push("plan targets must stay 38k/26k/56k/120k");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 6 must set id=loc-midcheck validate=locmidcheck:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (catalog.midcheck.productLoc !== fixture.expect.productLocMidcheck) {
    errors.push("parity productLocMidcheck must match catalog midcheck");
  }
  if (catalog.priorBaseline.productLoc !== kickoff.baseline.productLoc) {
    errors.push("priorBaseline.productLoc must match kickoff baseline");
  }
  if (catalog.planTargets.productLoc !== kickoff.gapTargets.productLoc) {
    errors.push("planTargets.productLoc must match kickoff gapTargets");
  }
  if ((locFloors.productTotalPlanTarget ?? 0) !== 120000) {
    errors.push("loc-floors productTotalPlanTarget must stay 120000");
  }
  if (locFloors.enforceAtPhase !== 30) {
    errors.push("loc-floors enforceAtPhase must stay 30");
  }

  const phase6 = (kickoff.phases as any[])?.find((p) => p.phase === 6);
  if (!phase6 || phase6.validate !== "locmidcheck:validate") {
    errors.push("kickoff phase 6 validate must be locmidcheck:validate");
  }
  if (phase6?.id !== "loc-midcheck") {
    errors.push("kickoff phase 6 id must be loc-midcheck");
  }

  if (listing.locMidcheckPhase !== 6) errors.push("listing.locMidcheckPhase must be 6");
  if (listing.locMidcheckCatalog !== "shared/ship/loc-midcheck.json") {
    errors.push("listing.locMidcheckCatalog mismatch");
  }
  if (pin.locMidcheck !== "shared/ship/loc-midcheck.json") {
    errors.push("RELEASE_PIN.locMidcheck path missing");
  }
  if (!pin.fixtures?.includes("parity-loc-midcheck.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-loc-midcheck.json");
  }

  const block = dod.locMidcheck;
  if (!block) errors.push("DoD missing locMidcheck block");
  else {
    if (block.phase !== 6) errors.push("DoD locMidcheck.phase must be 6");
    if (block.plan !== "30_finish_5.0") errors.push("DoD locMidcheck.plan mismatch");
    if (block.status !== "complete") errors.push("DoD locMidcheck.status must be complete");
    if (block.locMidcheckMarker !== LOC_MIDCHECK_MARKER) {
      errors.push("DoD locMidcheck marker mismatch");
    }
  }

  if (!pkg.scripts?.["locmidcheck:validate"]) {
    errors.push("package.json missing locmidcheck:validate");
  }
  if (!pkg.scripts?.["locmidcheck:smoke"]) {
    errors.push("package.json missing locmidcheck:smoke");
  }
  if (!ci.includes("locmidcheck:validate")) {
    errors.push("ci.yml missing locmidcheck:validate");
  }
  if (!kotlin.includes("MIDCHECK_PRODUCT_LOC")) {
    errors.push("Kotlin LocMidcheck missing MIDCHECK_PRODUCT_LOC");
  }
  if (!finish5Kt.includes("locmidcheck:validate")) {
    errors.push("Finish5Kickoff.kt phase 6 missing locmidcheck:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_loc_midcheck.py"))) {
    errors.push("missing author_loc_midcheck.py");
  }
  if (!existsSync(resolve(root, catalog.priorFreezeCatalog))) {
    errors.push(`missing prior freeze ${catalog.priorFreezeCatalog}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("locmidcheck:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK locmidcheck:validate — LOC mid-check scoreboard locked");
