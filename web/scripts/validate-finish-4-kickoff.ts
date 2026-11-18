/**
 * Finish 4.0 Phase 1 — kickoff + gap scoreboard readiness.
 *
 * Usage:
 *   npm run finish4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  baselineScoreboard,
  FINISH4_KICKOFF,
  FINISH4_KICKOFF_MARKER,
  FINISH4_KICKOFF_PHASE,
  FINISH4_KICKOFF_SCHEMA,
  FINISH4_OPEN_GAP_FLAGS,
  FINISH4_PHASE_COUNT,
  FINISH4_PLAN,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish4Kickoff";
import { LOC_FLOORS, measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-finish-4.0-kickoff.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const freeze3 = readJson(resolve(root, "shared/ship/freeze-3.0.0.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const loc = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 1) errors.push(`phase expected 1, got ${catalog.phase}`);
  if (catalog.schema !== FINISH4_KICKOFF_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== FINISH4_PLAN) errors.push("plan must be 30_finish_4.0");
  if (FINISH4_KICKOFF_PHASE !== 1) errors.push("phase mirror mismatch");
  if (catalog.kickoffMarker !== FINISH4_KICKOFF_MARKER) errors.push("kickoff marker mismatch");
  if (fixture.kickoffMarker !== FINISH4_KICKOFF_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") {
    errors.push("kickoff contentVersion must be 4.0.0 at Finish 4.0 freeze");
  }
  if (catalog.schemaVersion < 24) {
    errors.push("kickoff schemaVersion must be >= 24");
  }
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");

  if (catalog.priorPlan?.id !== "30_finish_3.0") errors.push("priorPlan.id must be 30_finish_3.0");
  if (catalog.priorPlan?.status !== "finished") errors.push("priorPlan.status must be finished");
  if (catalog.priorPlan?.releaseTag !== "v3.0.0") errors.push("priorPlan.releaseTag must be v3.0.0");
  if (catalog.priorPlan?.freezeCatalog !== "shared/ship/freeze-3.0.0.json") {
    errors.push("priorPlan.freezeCatalog must be freeze-3.0.0.json");
  }
  if (freeze3.releaseTag !== "v3.0.0") errors.push("freeze-3.0.0 releaseTag must remain v3.0.0");
  if (freeze3.contentVersion !== "3.0.0") errors.push("freeze-3.0.0 contentVersion must remain 3.0.0");

  if (catalog.endState?.contentVersion !== "4.0.0") errors.push("endState.contentVersion must be 4.0.0");
  if (catalog.endState?.releaseTag !== "v4.0.0") errors.push("endState.releaseTag must be v4.0.0");
  if (catalog.endState?.schemaVersionMin !== 25) errors.push("endState.schemaVersionMin must be 25");
  if (catalog.endState?.versionCode !== 5) errors.push("endState.versionCode must be 5");
  if (catalog.endState?.productLocMin !== 100000) errors.push("endState.productLocMin must be 100000");
  if (catalog.endState?.gameCoreLocMin !== 32000) errors.push("endState.gameCoreLocMin must be 32000");
  if (catalog.endState?.appLocMin !== 20000) errors.push("endState.appLocMin must be 20000");
  if (catalog.endState?.webSrcLocMin !== 48000) errors.push("endState.webSrcLocMin must be 48000");

  const b = catalog.baseline;
  if (b.gameCoreLoc !== 23675) errors.push("baseline.gameCoreLoc drift");
  if (b.appLoc !== 13947) errors.push("baseline.appLoc drift");
  if (b.webSrcLoc !== 35851) errors.push("baseline.webSrcLoc drift");
  if (b.productLoc !== 73473) errors.push("baseline.productLoc drift");
  if (b.authoredHarbors !== 10) errors.push("baseline.authoredHarbors must be 10 after Phase 12");
  if (b.authoredFish !== 100) errors.push("baseline.authoredFish must be 100 after Phase 8");
  if (b.species !== 100) errors.push("baseline.species must be 100 after Phase 8");
  if (b.harbors !== 10) errors.push("baseline.harbors must be 10 after Phase 12");
  if (b.machines !== 12) errors.push("baseline.machines must be 12 after Phase 13");
  if (b.quests !== 50) errors.push("baseline.quests must be 50 after Phase 14");
  if (b.harborBlockouts !== 0) errors.push("baseline.harborBlockouts must be 0 after Phase 9");
  if (b.staffComingSoonReasons !== 0) errors.push("baseline.staffComingSoonReasons must be 0");
  if (b.productLoc !== b.gameCoreLoc + b.appLoc + b.webSrcLoc) {
    errors.push("baseline productLoc must equal sum of scopes");
  }

  if (catalog.gaps.authoredHarborsRemaining !== 0) {
    errors.push("authoredHarborsRemaining must be 0 after Phase 12");
  }
  if (catalog.gaps.authoredFishRemaining !== 0) {
    errors.push("authoredFishRemaining must be 0 after Phase 8");
  }
  if (catalog.gaps.productLocRemaining !== 26527) {
    errors.push("productLocRemaining must be 26527 (→100k from freeze-4 cut)");
  }
  if (catalog.gaps.speciesRemaining !== 0) errors.push("speciesRemaining must be 0 after Phase 8");
  if (catalog.gaps.machinesRemaining !== 0) errors.push("machinesRemaining must be 0 after Phase 13");
  if (catalog.gaps.questsRemaining !== 0) errors.push("questsRemaining must be 0 after Phase 14");

  if (catalog.gaps.systemsSplitIncomplete !== false) {
    errors.push("gaps.systemsSplitIncomplete must be false after Phase 2");
  }
  if (catalog.gaps.viewModelSplitIncomplete !== false) {
    errors.push("gaps.viewModelSplitIncomplete must be false after Phase 4");
  }
  if (catalog.gaps.workersSimViewSplitIncomplete !== false) {
    errors.push("gaps.workersSimViewSplitIncomplete must be false after Phase 5");
  }
  if (catalog.gaps.gameHostSplitIncomplete !== false) {
    errors.push("gaps.gameHostSplitIncomplete must be false after Phase 6");
  }
  if (catalog.gaps.harborBlockoutPresent !== false) {
    errors.push("gaps.harborBlockoutPresent must be false after Phase 9");
  }
  if (catalog.gaps.productArtIncomplete !== false) {
    errors.push("gaps.productArtIncomplete must be false after Phase 10");
  }
  if (catalog.gaps.endgameSchema25Pending !== false) {
    errors.push("gaps.endgameSchema25Pending must be false after Phase 17");
  }
  if (catalog.gaps.contentFloorsShort !== false) {
    errors.push("gaps.contentFloorsShort must be false after Phase 18");
  }
  if (catalog.gaps.stripeOpsIncomplete !== false) {
    errors.push("gaps.stripeOpsIncomplete must be false after Phase 25");
  }
  if (catalog.gaps.deeplinkE2eThin !== false) {
    errors.push("gaps.deeplinkE2eThin must be false after Phase 26");
  }
  if (catalog.gaps.devicePerfIncomplete !== false) {
    errors.push("gaps.devicePerfIncomplete must be false after Phase 27");
  }
  if (catalog.gaps.contentCli3Missing !== false) {
    errors.push("gaps.contentCli3Missing must be false after Phase 28");
  }
  if (catalog.gaps.parityLock4Missing !== false) {
    errors.push("gaps.parityLock4Missing must be false after Phase 29");
  }
  if (FINISH4_OPEN_GAP_FLAGS.length !== 0) {
    errors.push(`OPEN_GAP_FLAGS expected 0, got ${FINISH4_OPEN_GAP_FLAGS.length}`);
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("stripeOpsIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include stripeOpsIncomplete after Phase 25");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("deeplinkE2eThin")) {
    errors.push("OPEN_GAP_FLAGS must not include deeplinkE2eThin after Phase 26");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("devicePerfIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include devicePerfIncomplete after Phase 27");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("contentCli3Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include contentCli3Missing after Phase 28");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("parityLock4Missing")) {
    errors.push("OPEN_GAP_FLAGS must not include parityLock4Missing after Phase 29");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("endgameSchema25Pending")) {
    errors.push("OPEN_GAP_FLAGS must not include endgameSchema25Pending after Phase 17");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("contentFloorsShort")) {
    errors.push("OPEN_GAP_FLAGS must not include contentFloorsShort after Phase 18");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("systemsSplitIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include systemsSplitIncomplete after Phase 2");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("viewModelSplitIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include viewModelSplitIncomplete after Phase 4");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("workersSimViewSplitIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include workersSimViewSplitIncomplete after Phase 5");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("gameHostSplitIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include gameHostSplitIncomplete after Phase 6");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("harborBlockoutPresent")) {
    errors.push("OPEN_GAP_FLAGS must not include harborBlockoutPresent after Phase 9");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("productArtIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include productArtIncomplete after Phase 10");
  }

  if (catalog.gapTargets.productLoc !== 100000) errors.push("gapTargets.productLoc must be 100000");
  if (catalog.gapTargets.authoredFish !== 100) errors.push("gapTargets.authoredFish must be 100");
  if (catalog.gapTargets.authoredHarbors !== 10) errors.push("gapTargets.authoredHarbors must be 10");
  if (catalog.gapTargets.speciesMin !== 100) errors.push("gapTargets.speciesMin must be 100");
  if (catalog.gapTargets.machinesMin !== 12) errors.push("gapTargets.machinesMin must be 12");
  if (catalog.gapTargets.questsMin !== 50) errors.push("gapTargets.questsMin must be 50");

  if (!Array.isArray(catalog.phases) || catalog.phases.length !== FINISH4_PHASE_COUNT) {
    errors.push(`phases must list ${FINISH4_PHASE_COUNT} entries`);
  }
  if (!requireThirtyPhases(catalog.phases)) {
    errors.push("phases must be ordered 1–30 kickoff→freeze-4");
  }
  if (FINISH4_KICKOFF.phases.length !== FINISH4_PHASE_COUNT) {
    errors.push("TS phases mirror length mismatch");
  }

  const board = baselineScoreboard();
  if (board.authoredHarbors.remaining !== 0) errors.push("scoreboard harbor remaining mismatch");
  if (!board.authoredHarbors.met) errors.push("authoredHarbors gap must be closed after Phase 12");
  if (board.authoredFish.remaining !== 0) errors.push("scoreboard fish remaining mismatch");
  if (!board.authoredFish.met) errors.push("authoredFish gap must be closed after Phase 8");
  if (board.productLoc.remaining !== 26527) errors.push("scoreboard LOC remaining mismatch");
  if (!board.species.met) errors.push("species gap must be closed after Phase 8");
  if (!board.machines.met) errors.push("machines gap must be closed after Phase 13");
  if (!board.quests.met) errors.push("quests gap must be closed after Phase 14");
  if (board.species.remaining !== 0) errors.push("scoreboard species remaining must be 0");
  if (board.machines.remaining !== 0) errors.push("scoreboard machines remaining must be 0");
  if (board.quests.remaining !== 0) errors.push("scoreboard quests remaining must be 0");
  if (board.openFlagCount !== FINISH4_OPEN_GAP_FLAGS.length) {
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

  if (loc.productTotalPlanTarget !== 100000) {
    errors.push("loc-floors productTotalPlanTarget must be 100000 for Finish 4.0");
  }
  if (loc.scopes?.gameCore?.planTarget !== 32000) errors.push("loc-floors gameCore planTarget must be 32000");
  if (loc.scopes?.app?.planTarget !== 20000) errors.push("loc-floors app planTarget must be 20000");
  if (loc.scopes?.webSrc?.planTarget !== 48000) {
    errors.push("loc-floors webSrc planTarget must be 48000");
  }
  if (LOC_FLOORS.productTotalPlanTarget !== 100000) {
    errors.push("LOC_FLOORS.productTotalPlanTarget mirror must be 100000");
  }
  if (loc.freezeCut?.productTotal !== 73473) {
    errors.push("loc-floors freezeCut.productTotal must be refreshed to 73473");
  }
  if (loc.freezeCut?.gameCore !== 23675) errors.push("loc-floors freezeCut.gameCore must be 23675");
  if (loc.freezeCut?.app !== 13947) errors.push("loc-floors freezeCut.app must be 13947");
  if (loc.freezeCut?.webSrc !== 35851) errors.push("loc-floors freezeCut.webSrc must be 35851");

  if (listing.finish4KickoffPhase !== 1) errors.push("listing.finish4KickoffPhase must be 1");
  if (listing.finish4KickoffCatalog !== "shared/ship/finish-4.0-kickoff.json") {
    errors.push("listing.finish4KickoffCatalog mismatch");
  }
  if (pin.finish4Kickoff !== "shared/ship/finish-4.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish4Kickoff path missing");
  }
  if (!pin.fixtures?.includes("parity-finish-4.0-kickoff.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-finish-4.0-kickoff.json");
  }
  if (pin.finish3Kickoff !== "shared/ship/finish-3.0-kickoff.json") {
    errors.push("RELEASE_PIN.finish3Kickoff must remain");
  }

  const finish4 = dod.finish4Kickoff;
  if (!finish4) errors.push("DoD missing finish4Kickoff block");
  else {
    if (finish4.phase !== 1) errors.push("DoD finish4Kickoff.phase must be 1");
    if (finish4.plan !== "30_finish_4.0") errors.push("DoD finish4Kickoff.plan mismatch");
    if (finish4.status !== "frozen") errors.push("DoD finish4Kickoff.status must be frozen");
    if (finish4.kickoffMarker !== FINISH4_KICKOFF_MARKER) {
      errors.push("DoD finish4Kickoff.kickoffMarker mismatch");
    }
  }
  if (
    dod.finish3Freeze?.status !== "ready_for_release_tag" &&
    dod.finish3Freeze?.status !== "tag_cut" &&
    dod.finish3Freeze?.status !== "archived"
  ) {
    errors.push("finish3Freeze must remain a valid freeze status");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["finish4:validate"]) errors.push("package.json missing finish4:validate");
  if (!pkg.scripts?.["finish4:smoke"]) errors.push("package.json missing finish4:smoke");
  if (!ci.includes("finish4:validate")) errors.push("ci.yml missing finish4:validate");
  if (!ci.includes("finish4:smoke")) errors.push("ci.yml missing finish4:smoke");
  if (!kotlin.includes("KICKOFF_MARKER")) errors.push("Kotlin Finish4Kickoff missing KICKOFF_MARKER");
  if (!kotlin.includes("baselineScoreboard")) {
    errors.push("Kotlin Finish4Kickoff missing baselineScoreboard");
  }
  if (!kotlin.includes("PHASE_COUNT = 30")) errors.push("Kotlin PHASE_COUNT must be 30");
  if (!kotlin.includes("freeze-4")) errors.push("Kotlin phases must end at freeze-4");
  if (!summaryLine(board).includes("Finish 4.0 Phase 1 gaps")) {
    errors.push("summaryLine missing expected prefix");
  }

  if (fixture.expect?.phaseCount !== 30) errors.push("parity fixture phaseCount must be 30");
  if (fixture.expect?.baselineProductLoc !== 73473) {
    errors.push("parity fixture baselineProductLoc drift");
  }
  if (fixture.expect?.productLocTarget !== 100000) {
    errors.push("parity fixture productLocTarget must be 100000");
  }
  if (fixture.expect?.priorPlanFinished !== "30_finish_3.0") {
    errors.push("parity fixture priorPlanFinished mismatch");
  }
  if (fixture.expect?.endReleaseTag !== "v4.0.0") {
    errors.push("parity fixture endReleaseTag must be v4.0.0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("finish4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK finish4:validate — Finish 4.0 Phase 1 kickoff + gap scoreboard locked");
