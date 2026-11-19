/**
 * Finish 5.0 Phase 20 — staff/worker AI depth wave 3 readiness.
 *
 * Usage:
 *   npm run staffai3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  measureStaffAi3,
  STAFF_AI_3,
  STAFF_AI_3_MARKER,
  STAFF_AI_3_PHASE,
  STAFF_AI_3_SCHEMA,
} from "../src/ship/staffAi3";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/staff-ai-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-staff-ai-3.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const trees = readJson(resolve(root, "shared/ship/staff-trees.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StaffAi3.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 20) errors.push(`phase expected 20, got ${catalog.phase}`);
  if (catalog.schema !== STAFF_AI_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (STAFF_AI_3_PHASE !== 20) errors.push("phase mirror mismatch");
  if (catalog.staffAi3Marker !== STAFF_AI_3_MARKER) errors.push("marker mismatch");
  if (fixture.staffAi3Marker !== STAFF_AI_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");
  if (pack.saveSchemaVersion !== 26) errors.push("content-pack.saveSchemaVersion must be 26");

  if (catalog.depthBehaviors?.length !== 5) errors.push("depthBehaviors must list 5");
  if (catalog.depthStats?.length !== 5) errors.push("depthStats must list 5");
  if (catalog.decisionReasons?.length !== 5) errors.push("decisionReasons must list 5");

  const measure = measureStaffAi3(root);
  if (measure.behaviorCount !== 5) errors.push(`behaviorCount ${measure.behaviorCount} ≠ 5`);
  if (measure.statCount !== 5) errors.push(`statCount ${measure.statCount} ≠ 5`);
  if (measure.reasonCount !== 5) errors.push(`reasonCount ${measure.reasonCount} ≠ 5`);
  if (measure.branchCount < STAFF_AI_3.branchesMin) {
    errors.push(`branches ${measure.branchCount} < ${STAFF_AI_3.branchesMin}`);
  }
  if (measure.scheduleCount < STAFF_AI_3.schedulesMin) {
    errors.push(`schedules ${measure.scheduleCount} < ${STAFF_AI_3.schedulesMin}`);
  }
  if (!measure.tsMarkersOk) {
    errors.push(`TS worker markers missing: ${measure.missingTsMarkers.join(", ")}`);
  }
  if (!measure.kotlinMarkersOk) {
    errors.push(`Kotlin worker markers missing: ${measure.missingKotlinMarkers.join(", ")}`);
  }
  if (!measure.tsStatsOk) errors.push("web Stats missing wave-3 depth stats");
  if (!measure.kotlinStatsOk) errors.push("Kotlin Stats missing wave-3 depth stats");
  if (!measure.newBranchesPresent) errors.push("new specialty branches missing from content-pack");
  if (!measure.newSchedulesPresent) errors.push("peak_tide schedule missing from content-pack");
  if (!measure.decisionReasonsPresent) {
    errors.push("decision reasons missing from TS/Kotlin worker AI");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 20 must set id=staff-ai-3 validate=staffai3:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.staffAi3Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((trees.branchCount ?? 0) < 13) errors.push("staff-trees.branchCount must be ≥13");
  if ((trees.scheduleCount ?? 0) < 3) errors.push("staff-trees.scheduleCount must be ≥3");
  for (const id of STAFF_AI_3.newBranchIds) {
    if (!(trees.branches ?? []).includes(id)) errors.push(`staff-trees missing branch ${id}`);
  }
  for (const id of STAFF_AI_3.newScheduleIds) {
    if (!(trees.schedules ?? []).includes(id)) errors.push(`staff-trees missing schedule ${id}`);
  }

  for (const id of [...STAFF_AI_3.newBranchIds, ...STAFF_AI_3.newScheduleIds]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [...STAFF_AI_3.newBranchIds, ...STAFF_AI_3.newScheduleIds]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }

  if (kickoff.gaps?.staffAi3Incomplete !== false) {
    errors.push("kickoff.gaps.staffAi3Incomplete must be false");
  }
  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);
  if (!phase20) errors.push("kickoff missing phase 20");
  else if (phase20.validate !== "staffai3:validate") {
    errors.push("kickoff phase 20 validate must be staffai3:validate");
  }
  if (phase20?.id !== "staff-ai-3") errors.push("kickoff phase 20 id mismatch");

  if (listing.staffAi3Phase !== 20) errors.push("listing.staffAi3Phase must be 20");
  if (listing.staffAi3Catalog !== "shared/ship/staff-ai-3.json") {
    errors.push("listing.staffAi3Catalog mismatch");
  }

  const block = dod.staffAi3;
  if (!block) errors.push("DoD missing staffAi3 block");
  else {
    if (block.phase !== 20) errors.push("DoD staffAi3.phase must be 20");
    if (block.status !== "complete") errors.push("DoD staffAi3.status must be complete");
    if (block.staffAi3Marker !== STAFF_AI_3_MARKER) {
      errors.push("DoD staffAi3 marker mismatch");
    }
  }
  if ((dod.quotas?.staffBranches ?? 0) < 13) {
    errors.push("DoD quotas.staffBranches must be ≥13");
  }
  if ((dod.quotas?.staffSchedules ?? 0) < 3) {
    errors.push("DoD quotas.staffSchedules must be ≥3");
  }

  if (!pkg.scripts?.["staffai3:validate"]) {
    errors.push("package.json missing staffai3:validate");
  }
  if (!ci.includes("staffai3:validate")) errors.push("ci.yml missing staffai3:validate");
  if (!ci.includes("staffai2:validate")) errors.push("ci.yml missing soft staffai2:validate");
  if (!ci.includes("workerai:validate")) errors.push("ci.yml missing soft workerai:validate");
  if (!ci.includes("stafftrees:validate")) errors.push("ci.yml missing soft stafftrees:validate");
  if (!kotlin.includes("NEW_BRANCH_IDS")) errors.push("Kotlin StaffAi3 missing NEW_BRANCH_IDS");
  if (!kotlin.includes("DECISION_REASONS")) errors.push("Kotlin StaffAi3 missing DECISION_REASONS");
  if (!existsSync(resolve(root, "shared/tools/author_staff_ai_3.py"))) {
    errors.push("missing author_staff_ai_3.py");
  }
  if (pin.staffAi3 !== "shared/ship/staff-ai-3.json") {
    errors.push("RELEASE_PIN.staffAi3 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-staff-ai-3.json")) {
    errors.push("RELEASE_PIN missing parity-staff-ai-3.json");
  }
  if (fixture.expect?.depthBehaviorCount !== 5) errors.push("parity depthBehaviorCount must be 5");
  if (fixture.expect?.staffAi3Incomplete !== false) {
    errors.push("parity staffAi3Incomplete must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL staffai3:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK staffai3:validate — staff AI depth wave 3 wired");
