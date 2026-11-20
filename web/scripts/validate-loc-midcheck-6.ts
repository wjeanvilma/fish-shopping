/**
 * Finish 6.0 Phase 6 — LOC mid-check scoreboard readiness.
 *
 * Usage:
 *   npm run locmidcheck6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  LOC_MIDCHECK_6,
  LOC_MIDCHECK_6_MARKER,
  LOC_MIDCHECK_6_PHASE,
  LOC_MIDCHECK_6_SCHEMA,
  measureLocMidcheck6,
} from "../src/ship/locMidcheck6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/loc-midcheck-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-loc-midcheck-6.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const locFloors = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LocMidcheck6.kt",
    ),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 6) errors.push(`phase expected 6, got ${catalog.phase}`);
  if (catalog.schema !== LOC_MIDCHECK_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (LOC_MIDCHECK_6_PHASE !== 6) errors.push("phase mirror mismatch");
  if (catalog.locMidcheck6Marker !== LOC_MIDCHECK_6_MARKER) errors.push("marker mismatch");
  if (fixture.locMidcheck6Marker !== LOC_MIDCHECK_6_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");

  const measure = measureLocMidcheck6(root);
  if (!measure.meetsInterimFloors) {
    errors.push(
      `live LOC below interim soft floors (product ${measure.live.productTotal} < ${LOC_MIDCHECK_6.interimSoftFloors.productLoc})`,
    );
  }
  if (!measure.meetsPriorBaseline) {
    errors.push("live LOC collapsed below Finish 6 Phase 1 kickoff baseline");
  }
  if (!measure.midcheckAligned) {
    errors.push(
      `live LOC drifted below locked midcheck beyond slack ${LOC_MIDCHECK_6.midcheckSlackLines}`,
    );
  }
  if (!measure.planTargetsIntact) {
    errors.push("plan targets must stay 38k/26k/56k/120k");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 6 must set id=loc-midcheck-6 validate=locmidcheck6:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (catalog.midcheck.productLoc !== fixture.expect.productLocMidcheck) {
    errors.push("parity productLocMidcheck must match catalog midcheck");
  }
  if (catalog.midcheck.gameCoreLoc !== fixture.expect.gameCoreLocMidcheck) {
    errors.push("parity gameCoreLocMidcheck must match catalog midcheck");
  }
  if (catalog.midcheck.appLoc !== fixture.expect.appLocMidcheck) {
    errors.push("parity appLocMidcheck must match catalog midcheck");
  }
  if (catalog.midcheck.webSrcLoc !== fixture.expect.webSrcLocMidcheck) {
    errors.push("parity webSrcLocMidcheck must match catalog midcheck");
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

  const phase6 = (kickoff.phases as any[])?.find((p: any) => p.phase === 6);
  if (!phase6 || phase6.validate !== "locmidcheck6:validate") {
    errors.push("kickoff phase 6 validate must be locmidcheck6:validate");
  }
  if (phase6?.id !== "loc-midcheck-6") {
    errors.push("kickoff phase 6 id must be loc-midcheck-6");
  }

  if (listing.locMidcheck6Phase !== 6) errors.push("listing.locMidcheck6Phase must be 6");
  if (listing.locMidcheck6Catalog !== "shared/ship/loc-midcheck-6.json") {
    errors.push("listing.locMidcheck6Catalog mismatch");
  }
  // Finish 5 historical midcheck listing must remain.
  if (listing.locMidcheckPhase !== 6) {
    errors.push("Finish 5 listing.locMidcheckPhase must stay 6");
  }
  if (pin.locMidcheck6 !== "shared/ship/loc-midcheck-6.json") {
    errors.push("RELEASE_PIN.locMidcheck6 path missing");
  }
  if (!pin.fixtures?.includes("parity-loc-midcheck-6.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-loc-midcheck-6.json");
  }
  if (pin.locMidcheck !== "shared/ship/loc-midcheck.json") {
    errors.push("Finish 5 RELEASE_PIN.locMidcheck must remain");
  }

  const block = dod.locMidcheck6;
  if (!block) errors.push("DoD missing locMidcheck6 block");
  else {
    if (block.phase !== 6) errors.push("DoD locMidcheck6.phase must be 6");
    if (block.plan !== "30_finish_6.0") errors.push("DoD locMidcheck6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD locMidcheck6.status must be complete");
    if (block.locMidcheck6Marker !== LOC_MIDCHECK_6_MARKER) {
      errors.push("DoD locMidcheck6 marker mismatch");
    }
  }

  if (!pkg.scripts?.["locmidcheck6:validate"]) {
    errors.push("package.json missing locmidcheck6:validate");
  }
  if (!pkg.scripts?.["locmidcheck6:smoke"]) {
    errors.push("package.json missing locmidcheck6:smoke");
  }
  if (!ci.includes("locmidcheck6:validate")) {
    errors.push("ci.yml missing locmidcheck6:validate");
  }
  if (!ci.includes("locmidcheck6:smoke")) {
    errors.push("ci.yml missing locmidcheck6:smoke");
  }
  if (!kotlin.includes("MIDCHECK_PRODUCT_LOC")) {
    errors.push("Kotlin LocMidcheck6 missing MIDCHECK_PRODUCT_LOC");
  }
  if (!finish6Kt.includes("locmidcheck6:validate")) {
    errors.push("Finish6Kickoff.kt phase 6 missing locmidcheck6:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_loc_midcheck_6.py"))) {
    errors.push("missing author_loc_midcheck_6.py");
  }
  if (!existsSync(resolve(root, catalog.priorFreezeCatalog))) {
    errors.push(`missing prior freeze ${catalog.priorFreezeCatalog}`);
  }
  if (!existsSync(resolve(root, catalog.priorLocMidcheckCatalog))) {
    errors.push(`missing prior loc midcheck ${catalog.priorLocMidcheckCatalog}`);
  }

  // Phase 6 is a scoreboard lock — open boolean gaps stay at post-Phase-5 count.
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(
      `expected 7 open Finish 6 gaps after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`,
    );
  }

  if (fixture.expect?.productLocProgressPercent !== 7) {
    errors.push("parity productLocProgressPercent must be 7");
  }
  if (fixture.expect?.productLocInterimFloor !== catalog.interimSoftFloors.productLoc) {
    errors.push("parity productLocInterimFloor must match catalog");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("locmidcheck6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK locmidcheck6:validate — Finish 6.0 Phase 6 LOC mid-check scoreboard locked");
