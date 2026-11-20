/**
 * Finish 6.0 Phase 16 — staff/worker AI depth wave 4 + decision-trace fixtures.
 *
 * Usage:
 *   npm run staffai4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureStaffAi4,
  STAFF_AI_4,
  STAFF_AI_4_MARKER,
  STAFF_AI_4_PHASE,
  STAFF_AI_4_SCHEMA,
} from "../src/ship/staffAi4";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/staff-ai-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-staff-ai-4.json"));
  const traces = readJson(resolve(root, "shared/fixtures/decision-traces-staff-ai-4.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const trees = readJson(resolve(root, "shared/ship/staff-trees.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StaffAi4.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 16) errors.push(`phase expected 16, got ${catalog.phase}`);
  if (catalog.schema !== STAFF_AI_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (STAFF_AI_4_PHASE !== 16) errors.push("phase mirror mismatch");
  if (catalog.staffAi4Marker !== STAFF_AI_4_MARKER) errors.push("marker mismatch");
  if (fixture.staffAi4Marker !== STAFF_AI_4_MARKER) errors.push("fixture marker mismatch");
  if (traces.staffAi4Marker !== STAFF_AI_4_MARKER) {
    errors.push("decision-trace fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (pack.saveSchemaVersion < 27) errors.push("content-pack.saveSchemaVersion must be >= 27");

  if (catalog.depthBehaviors?.length !== 5) errors.push("depthBehaviors must list 5");
  if (catalog.depthStats?.length !== 5) errors.push("depthStats must list 5");
  if (catalog.decisionReasons?.length !== 5) errors.push("decisionReasons must list 5");
  if ((traces.samples ?? []).length < 5) errors.push("decision-trace samples must list ≥5");
  if ((traces.reasons ?? []).length < 5) errors.push("decision-trace reasons must list ≥5");

  const measure = measureStaffAi4(root);
  if (measure.behaviorCount !== 5) errors.push(`behaviorCount ${measure.behaviorCount} ≠ 5`);
  if (measure.statCount !== 5) errors.push(`statCount ${measure.statCount} ≠ 5`);
  if (measure.reasonCount !== 5) errors.push(`reasonCount ${measure.reasonCount} ≠ 5`);
  if (measure.branchCount < STAFF_AI_4.branchesMin) {
    errors.push(`branches ${measure.branchCount} < ${STAFF_AI_4.branchesMin}`);
  }
  if (measure.scheduleCount < STAFF_AI_4.schedulesMin) {
    errors.push(`schedules ${measure.scheduleCount} < ${STAFF_AI_4.schedulesMin}`);
  }
  if (!measure.tsMarkersOk) {
    errors.push(`TS worker markers missing: ${measure.missingTsMarkers.join(", ")}`);
  }
  if (!measure.kotlinMarkersOk) {
    errors.push(`Kotlin worker markers missing: ${measure.missingKotlinMarkers.join(", ")}`);
  }
  if (!measure.tsStatsOk) errors.push("web Stats missing wave-4 depth stats");
  if (!measure.kotlinStatsOk) errors.push("Kotlin Stats missing wave-4 depth stats");
  if (!measure.newBranchesPresent) errors.push("new specialty branches missing from content-pack");
  if (!measure.newSchedulesPresent) errors.push("nest_ember schedule missing from content-pack");
  if (!measure.decisionReasonsPresent) {
    errors.push("decision reasons missing from TS/Kotlin worker AI");
  }
  if (!measure.decisionTraceFixtureOk) {
    errors.push("decision-traces-staff-ai-4 fixture incomplete");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 16 must set id=staff-ai-4 validate=staffai4:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.staffAi4Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((trees.branchCount ?? 0) < 16) errors.push("staff-trees.branchCount must be ≥16");
  if ((trees.scheduleCount ?? 0) < 4) errors.push("staff-trees.scheduleCount must be ≥4");
  for (const id of STAFF_AI_4.newBranchIds) {
    if (!(trees.branches ?? []).includes(id)) errors.push(`staff-trees missing branch ${id}`);
  }
  for (const id of STAFF_AI_4.newScheduleIds) {
    if (!(trees.schedules ?? []).includes(id)) errors.push(`staff-trees missing schedule ${id}`);
  }

  for (const id of [...STAFF_AI_4.newBranchIds, ...STAFF_AI_4.newScheduleIds]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [...STAFF_AI_4.newBranchIds, ...STAFF_AI_4.newScheduleIds]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }

  if (kickoff.gaps?.staffAi4Incomplete !== false) {
    errors.push("kickoff.gaps.staffAi4Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("staffAi4Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop staffAi4Incomplete after Phase 16");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("staffAi4Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop staffAi4Incomplete");
  }
  const phase16 = (kickoff.phases as any[])?.find((p) => p.phase === 16);
  if (!phase16) errors.push("kickoff missing phase 16");
  else if (phase16.validate !== "staffai4:validate") {
    errors.push("kickoff phase 16 validate must be staffai4:validate");
  }
  if (phase16?.id !== "staff-ai-4") errors.push("kickoff phase 16 id mismatch");

  if (listing.staffAi4Phase !== 16) errors.push("listing.staffAi4Phase must be 16");
  if (listing.staffAi4Catalog !== "shared/ship/staff-ai-4.json") {
    errors.push("listing.staffAi4Catalog mismatch");
  }

  const block = dod.staffAi4;
  if (!block) errors.push("DoD missing staffAi4 block");
  else {
    if (block.phase !== 16) errors.push("DoD staffAi4.phase must be 16");
    if (block.status !== "complete") errors.push("DoD staffAi4.status must be complete");
    if (block.staffAi4Marker !== STAFF_AI_4_MARKER) {
      errors.push("DoD staffAi4 marker mismatch");
    }
  }
  if ((dod.quotas?.staffBranches ?? 0) < 16) {
    errors.push("DoD quotas.staffBranches must be ≥16");
  }
  if ((dod.quotas?.staffSchedules ?? 0) < 4) {
    errors.push("DoD quotas.staffSchedules must be ≥4");
  }

  if (!pkg.scripts?.["staffai4:validate"]) {
    errors.push("package.json missing staffai4:validate");
  }
  if (!ci.includes("staffai4:validate")) errors.push("ci.yml missing staffai4:validate");
  if (!ci.includes("staffai3:validate")) errors.push("ci.yml missing soft staffai3:validate");
  if (!ci.includes("stafftrees:validate")) errors.push("ci.yml missing soft stafftrees:validate");
  if (!kotlin.includes("NEW_BRANCH_IDS")) errors.push("Kotlin StaffAi4 missing NEW_BRANCH_IDS");
  if (!kotlin.includes("DECISION_REASONS")) errors.push("Kotlin StaffAi4 missing DECISION_REASONS");
  if (!existsSync(resolve(root, "shared/tools/author_staff_ai_4.py"))) {
    errors.push("missing author_staff_ai_4.py");
  }
  if (pin.staffAi4 !== "shared/ship/staff-ai-4.json") {
    errors.push("RELEASE_PIN.staffAi4 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-staff-ai-4.json")) {
    errors.push("RELEASE_PIN missing parity-staff-ai-4.json");
  }
  if (!pin.fixtures?.includes("decision-traces-staff-ai-4.json")) {
    errors.push("RELEASE_PIN missing decision-traces-staff-ai-4.json");
  }
  if (fixture.expect?.depthBehaviorCount !== 5) errors.push("parity depthBehaviorCount must be 5");
  if (fixture.expect?.staffAi4Incomplete !== false) {
    errors.push("parity staffAi4Incomplete must be false");
  }
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 16");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL staffai4:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK staffai4:validate — staff AI depth wave 4 + decision-trace fixtures wired");
