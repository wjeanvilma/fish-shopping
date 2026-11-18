/**
 * Finish 3.0 Phase 10 — staff unlock readiness.
 *
 * Usage:
 *   npm run staffunlock:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  measureStaffUnlock,
  STAFF_UNLOCK,
  STAFF_UNLOCK_MARKER,
  STAFF_UNLOCK_PHASE,
  STAFF_UNLOCK_SCHEMA,
} from "../src/ship/staffUnlock";
import { STAFF_BRANCH_FLOOR } from "../src/ship/staffTrees";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/staff-unlock.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-staff-unlock.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StaffUnlock.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 10) errors.push(`phase expected 10, got ${catalog.phase}`);
  if (catalog.schema !== STAFF_UNLOCK_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (STAFF_UNLOCK_PHASE !== 10) errors.push("phase mirror mismatch");
  if (catalog.staffUnlockMarker !== STAFF_UNLOCK_MARKER) errors.push("marker mismatch");
  if (fixture.staffUnlockMarker !== STAFF_UNLOCK_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");

  if (catalog.hireableRoleCount !== 8) errors.push("hireableRoleCount must be 8");
  if (catalog.staffBranchTarget !== 10) errors.push("staffBranchTarget must be 10");
  if (catalog.newBranchIds?.length !== 5) errors.push("newBranchIds must list 5");
  if (STAFF_BRANCH_FLOOR !== 10) errors.push("staff-trees branchCount must be 10");

  const measure = measureStaffUnlock(root);
  if (measure.hireableRoleCount !== 8) {
    errors.push(`hireable roles ${measure.hireableRoleCount} ≠ 8`);
  }
  if (measure.branchCount < 10) errors.push(`branch count ${measure.branchCount} < 10`);
  if (!measure.newBranchesPresent) errors.push("new specialization branches missing");
  if (measure.rolesWithBranches !== 8) {
    errors.push(`roles with branches ${measure.rolesWithBranches} ≠ 8`);
  }
  if (measure.comingSoonReasons !== 0) {
    errors.push(`Coming soon reasons ${measure.comingSoonReasons} ≠ 0`);
  }
  if (!measure.gapClosed) errors.push("kickoff staff Coming soon gap must be closed");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of STAFF_UNLOCK.newBranchIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }

  const phase10 = (kickoff.phases as any[])?.find((p) => p.phase === 10);
  if (!phase10) errors.push("kickoff missing phase 10");
  else if (phase10.validate !== "staffunlock:validate") {
    errors.push("kickoff phase 10 validate must be staffunlock:validate");
  }
  if (kickoff.baseline?.staffComingSoonReasons !== 0) {
    errors.push("kickoff.baseline.staffComingSoonReasons must be 0");
  }
  if (kickoff.gaps?.staffComingSoonPresent !== false) {
    errors.push("kickoff.gaps.staffComingSoonPresent must be false");
  }
  if (kickoff.gaps?.staffComingSoonReasons !== 0) {
    // numeric remaining tracked via baseline; gap flag is boolean staffComingSoonPresent
  }

  if (listing.staffUnlockPhase !== 10) errors.push("listing.staffUnlockPhase must be 10");
  if (listing.staffUnlockCatalog !== "shared/ship/staff-unlock.json") {
    errors.push("listing.staffUnlockCatalog mismatch");
  }
  if (pin.staffUnlock !== "shared/ship/staff-unlock.json") {
    errors.push("RELEASE_PIN.staffUnlock path missing");
  }
  if (!pin.fixtures?.includes("parity-staff-unlock.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-staff-unlock.json");
  }

  const block = dod.staffUnlock;
  if (!block) errors.push("DoD missing staffUnlock block");
  else {
    if (block.phase !== 10) errors.push("DoD staffUnlock.phase must be 10");
    if (block.plan !== "30_finish_3.0") errors.push("DoD staffUnlock.plan mismatch");
    if (block.status !== "complete") errors.push("DoD staffUnlock.status must be complete");
    if (block.staffUnlockMarker !== STAFF_UNLOCK_MARKER) {
      errors.push("DoD staffUnlock marker mismatch");
    }
  }

  if (!pkg.scripts?.["staffunlock:validate"]) {
    errors.push("package.json missing staffunlock:validate");
  }
  if (!ci.includes("staffunlock:validate")) errors.push("ci.yml missing staffunlock:validate");
  if (!kotlin.includes("NEW_BRANCH_IDS")) {
    errors.push("Kotlin StaffUnlock missing NEW_BRANCH_IDS");
  }

  if (fixture.expect?.comingSoonReasons !== 0) {
    errors.push("parity comingSoonReasons must be 0");
  }
  if (fixture.expect?.staffBranchTarget !== 10) {
    errors.push("parity staffBranchTarget must be 10");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("staffunlock:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK staffunlock:validate — all roles hireable; Coming soon gap closed");
