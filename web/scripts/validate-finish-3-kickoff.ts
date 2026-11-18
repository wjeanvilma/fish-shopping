/**
 * Finish 3.0 Phase 1 — kickoff + gap scoreboard readiness.
 *
 * Usage:
 *   npm run finish3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  baselineScoreboard,
  FINISH3_KICKOFF,
  FINISH3_KICKOFF_MARKER,
  FINISH3_KICKOFF_PHASE,
  FINISH3_KICKOFF_SCHEMA,
  FINISH3_OPEN_GAP_FLAGS,
  FINISH3_PHASE_COUNT,
  FINISH3_PLAN,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish3Kickoff";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-finish-3.0-kickoff.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const freeze = readJson(resolve(root, "shared/ship/freeze-2.0.0.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 1) errors.push(`phase expected 1, got ${catalog.phase}`);
  if (catalog.schema !== FINISH3_KICKOFF_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== FINISH3_PLAN) errors.push("plan must be 30_finish_3.0");
  if (FINISH3_KICKOFF_PHASE !== 1) errors.push("phase mirror mismatch");
  if (catalog.kickoffMarker !== FINISH3_KICKOFF_MARKER) errors.push("kickoff marker mismatch");
  if (fixture.kickoffMarker !== FINISH3_KICKOFF_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("kickoff contentVersion must be 3.0.0 at freeze");
  if (catalog.schemaVersion !== 24) errors.push("kickoff schemaVersion must be 24");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must be 24");

  if (catalog.priorPlan?.id !== "30_finish_2.0") errors.push("priorPlan.id must be 30_finish_2.0");
  if (catalog.priorPlan?.status !== "finished") errors.push("priorPlan.status must be finished");
  if (catalog.priorPlan?.releaseTag !== "v2.0.0") errors.push("priorPlan.releaseTag must be v2.0.0");
  if (freeze.releaseTag !== "v2.0.0") errors.push("freeze-2.0.0 releaseTag must remain v2.0.0");
  if (freeze.contentVersion !== "2.0.0") errors.push("freeze contentVersion must remain 2.0.0");

  if (catalog.endState?.contentVersion !== "3.0.0") errors.push("endState.contentVersion must be 3.0.0");
  if (catalog.endState?.releaseTag !== "v3.0.0") errors.push("endState.releaseTag must be v3.0.0");
  if (catalog.endState?.schemaVersionMin !== 24) errors.push("endState.schemaVersionMin must be 24");
  if (catalog.endState?.productLocMin !== 80000) errors.push("endState.productLocMin must be 80000");

  const b = catalog.baseline;
  if (b.gameCoreLoc !== 20962) errors.push("baseline.gameCoreLoc drift");
  if (b.appLoc !== 13169) errors.push("baseline.appLoc drift");
  if (b.webSrcLoc !== 30357) errors.push("baseline.webSrcLoc drift");
  if (b.productLoc !== 64488) errors.push("baseline.productLoc drift");
  if ((b.measuredAtPhase ?? 0) < 30) errors.push("baseline.measuredAtPhase must be ≥ 30 at freeze");
  if (b.authoredHarbors !== 8) errors.push("baseline.authoredHarbors must be 8");
  if (b.authoredFish !== 50) errors.push("baseline.authoredFish must be 50");
  if (b.species !== 75) errors.push("baseline.species must be 75");
  if (b.staffComingSoonReasons !== 0) errors.push("baseline.staffComingSoonReasons must be 0");
  if (b.productLoc !== b.gameCoreLoc + b.appLoc + b.webSrcLoc) {
    errors.push("baseline productLoc must equal sum of scopes");
  }

  if (catalog.gaps.authoredHarborsRemaining !== 0) errors.push("authoredHarborsRemaining must be 0");
  if (catalog.gaps.authoredFishRemaining !== 0) errors.push("authoredFishRemaining must be 0");
  if (catalog.gaps.productLocRemaining !== 15512) errors.push("productLocRemaining must be 15512");
  if (catalog.gaps.androidHudDecomposition !== false) {
    errors.push("gaps.androidHudDecomposition must be false after Phase 2");
  }
  if (catalog.gaps.webHudDecomposition !== false) {
    errors.push("gaps.webHudDecomposition must be false after Phase 3");
  }
  if (catalog.gaps.androidI18nIncomplete !== false) {
    errors.push("gaps.androidI18nIncomplete must be false after Phase 5");
  }
  if (catalog.gaps.contentI18nMissing !== false) {
    errors.push("gaps.contentI18nMissing must be false after Phase 6");
  }
  if (catalog.gaps.thirdLocaleMissing !== false) {
    errors.push("gaps.thirdLocaleMissing must be false after Phase 6");
  }
  if (catalog.gaps.darkThemeMissing !== false) {
    errors.push("gaps.darkThemeMissing must be false after Phase 7");
  }
  if (catalog.gaps.staffComingSoonPresent !== false) {
    errors.push("gaps.staffComingSoonPresent must be false after Phase 10");
  }
  if (catalog.gaps.stripeLiveCheckoutPartial !== false) {
    errors.push("gaps.stripeLiveCheckoutPartial must be false after Phase 16");
  }
  for (const flag of FINISH3_OPEN_GAP_FLAGS) {
    if (catalog.gaps[flag] !== true) errors.push(`gaps.${flag} must remain true until later phases`);
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("androidHudDecomposition")) {
    errors.push("OPEN_GAP_FLAGS must not include closed androidHudDecomposition");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("webHudDecomposition")) {
    errors.push("OPEN_GAP_FLAGS must not include closed webHudDecomposition");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("androidI18nIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include closed androidI18nIncomplete");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("contentI18nMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed contentI18nMissing");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("thirdLocaleMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed thirdLocaleMissing");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("darkThemeMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed darkThemeMissing");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("staffComingSoonPresent")) {
    errors.push("OPEN_GAP_FLAGS must not include closed staffComingSoonPresent");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("stripeLiveCheckoutPartial")) {
    errors.push("OPEN_GAP_FLAGS must not include closed stripeLiveCheckoutPartial");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("pushRemindersMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed pushRemindersMissing");
  }
  if (catalog.gaps.pushRemindersMissing !== false) {
    errors.push("gaps.pushRemindersMissing must be false after Phase 18");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("pwaMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed pwaMissing");
  }
  if (catalog.gaps.pwaMissing !== false) {
    errors.push("gaps.pwaMissing must be false after Phase 19");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("deepLinksMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed deepLinksMissing");
  }
  if (catalog.gaps.deepLinksMissing !== false) {
    errors.push("gaps.deepLinksMissing must be false after Phase 20");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("composeUiTestsMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed composeUiTestsMissing");
  }
  if (catalog.gaps.composeUiTestsMissing !== false) {
    errors.push("gaps.composeUiTestsMissing must be false after Phase 21");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("webE2eMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed webE2eMissing");
  }
  if (catalog.gaps.webE2eMissing !== false) {
    errors.push("gaps.webE2eMissing must be false after Phase 22");
  }

  if (!Array.isArray(catalog.phases) || catalog.phases.length !== FINISH3_PHASE_COUNT) {
    errors.push(`phases must list ${FINISH3_PHASE_COUNT} entries`);
  }
  if (!requireThirtyPhases(catalog.phases)) errors.push("phases must be ordered 1–30 kickoff→freeze-3");
  if (FINISH3_KICKOFF.phases.length !== FINISH3_PHASE_COUNT) {
    errors.push("TS phases mirror length mismatch");
  }

  const board = baselineScoreboard();
  if (board.authoredHarbors.remaining !== 0) errors.push("scoreboard harbor remaining mismatch");
  if (!board.authoredHarbors.met) errors.push("authored harbors gap must be met after Phase 8");
  if (board.authoredFish.remaining !== 0) errors.push("scoreboard fish remaining mismatch");
  if (!board.authoredFish.met) errors.push("authored fish gap must be met after Phase 9");
  if (board.productLoc.remaining !== 15512) errors.push("scoreboard LOC remaining mismatch");
  if (!board.species.met) errors.push("species gap must be met after Phase 12");
  if (!board.machines.met) errors.push("machines gap must be met after Phase 13");
  if (board.openFlagCount !== FINISH3_OPEN_GAP_FLAGS.length) {
    errors.push("openFlagCount mismatch");
  }
  if (board.allNumericGapsClosed) errors.push("Phase 1 must still have open numeric gaps");
  if (productLocProgress(b.productLoc) !== 0) errors.push("LOC progress at baseline must be 0%");

  const art = measureArtCounts(root);
  if (art.authoredHarbors !== b.authoredHarbors) {
    errors.push(`harbor-art-pass authored count ${art.authoredHarbors} ≠ baseline ${b.authoredHarbors}`);
  }
  if (art.authoredFish !== b.authoredFish) {
    errors.push(`fish-art-pass authored count ${art.authoredFish} ≠ baseline ${b.authoredFish}`);
  }
  if ((pack.harbors as unknown[]).length !== b.harbors) errors.push("content harbors ≠ baseline");
  if ((pack.species as unknown[]).length !== b.species) errors.push("content species ≠ baseline");
  if ((pack.machines as unknown[]).length !== b.machines) errors.push("content machines ≠ baseline");
  if ((pack.quests as unknown[]).length !== b.quests) errors.push("content quests ≠ baseline");

  const locBoard = measureLocScoreboard(root);
  // Finish 3.0 phases grow LOC; only regressions vs the locked baseline fail.
  if (locBoard.productTotal < b.productLoc - 50) {
    errors.push(
      `measured product LOC ${locBoard.productTotal} regressed below baseline ${b.productLoc}`,
    );
  }
  if (locBoard.gameCore.lines < b.gameCoreLoc - 50) {
    errors.push(`game-core LOC ${locBoard.gameCore.lines} regressed below baseline ${b.gameCoreLoc}`);
  }
  if (locBoard.app.lines < b.appLoc - 50) {
    errors.push(`app LOC ${locBoard.app.lines} regressed below baseline ${b.appLoc}`);
  }
  if (locBoard.webSrc.lines < b.webSrcLoc - 50) {
    errors.push(`web/src LOC ${locBoard.webSrc.lines} regressed below baseline ${b.webSrcLoc}`);
  }
  if (LOC_FLOORS.productTotalPlanTarget !== 80000) {
    errors.push("loc-floors plan target must stay 80000");
  }

  if (listing.finish3KickoffPhase !== 1) errors.push("listing.finish3KickoffPhase must be 1");
  if (listing.finish3KickoffCatalog !== "shared/ship/finish-3.0-kickoff.json") {
    errors.push("listing.finish3KickoffCatalog mismatch");
  }
  if (pin.finish3Kickoff !== "shared/ship/finish-3.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish3Kickoff path missing");
  }
  if (!pin.fixtures?.includes("parity-finish-3.0-kickoff.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-finish-3.0-kickoff.json");
  }

  const finish3 = dod.finish3Kickoff;
  if (!finish3) errors.push("DoD missing finish3Kickoff block");
  else {
    if (finish3.phase !== 1) errors.push("DoD finish3Kickoff.phase must be 1");
    if (finish3.plan !== "30_finish_3.0") errors.push("DoD finish3Kickoff.plan mismatch");
    if (!["active", "frozen"].includes(finish3.status)) {
      errors.push("DoD finish3Kickoff.status must be active or frozen");
    }
    if (finish3.kickoffMarker !== FINISH3_KICKOFF_MARKER) {
      errors.push("DoD finish3Kickoff.kickoffMarker mismatch");
    }
  }
  if (dod.finish2Freeze?.status !== "ready_for_release_tag" && dod.finish2Freeze?.status !== "tag_cut" && dod.finish2Freeze?.status !== "archived") {
    errors.push("finish2Freeze must remain a valid freeze status");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["finish3:validate"]) errors.push("package.json missing finish3:validate");
  if (!pkg.scripts?.["finish3:smoke"]) errors.push("package.json missing finish3:smoke");
  if (!ci.includes("finish3:validate")) errors.push("ci.yml missing finish3:validate");
  if (!ci.includes("finish3:smoke")) errors.push("ci.yml missing finish3:smoke");
  if (!kotlin.includes("KICKOFF_MARKER")) errors.push("Kotlin Finish3Kickoff missing KICKOFF_MARKER");
  if (!kotlin.includes("baselineScoreboard")) errors.push("Kotlin Finish3Kickoff missing baselineScoreboard");
  if (!kotlin.includes("PHASE_COUNT = 30")) errors.push("Kotlin PHASE_COUNT must be 30");
  if (!summaryLine(board).includes("Finish 3.0 Phase 1 gaps")) {
    errors.push("summaryLine missing expected prefix");
  }

  if (fixture.expect?.phaseCount !== 30) errors.push("parity fixture phaseCount must be 30");
  if (fixture.expect?.baselineProductLoc !== 61110) {
    errors.push("parity fixture baselineProductLoc drift");
  }
  if (fixture.expect?.priorPlanFinished !== "30_finish_2.0") {
    errors.push("parity fixture priorPlanFinished mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("finish3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK finish3:validate — Finish 3.0 Phase 1 kickoff + gap scoreboard locked");
