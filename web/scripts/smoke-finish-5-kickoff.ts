/**
 * Finish 5.0 Phase 1 — smoke the gap scoreboard against live catalogs.
 * Soft-floored through Phase 26 (deeplink-e2e-5 closed).
 *
 * Usage:
 *   npm run finish5:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  baselineScoreboard,
  FINISH5_KICKOFF,
  FINISH5_OPEN_GAP_FLAGS,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish5Kickoff";
import { measureLocScoreboard } from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const errors: string[] = [];

if (!requireThirtyPhases()) errors.push("thirty phases contract failed");

const art = measureArtCounts(root);
const loc = measureLocScoreboard(root);
const board = baselineScoreboard({
  authoredHarbors: art.authoredHarbors,
  authoredFish: art.authoredFish,
  productLoc: loc.productTotal,
});

if (art.authoredHarbors < FINISH5_KICKOFF.baseline.authoredHarbors) {
  errors.push("authored harbors regressed below Phase 1 baseline");
}
if (art.authoredFish < FINISH5_KICKOFF.baseline.authoredFish) {
  errors.push("authored fish regressed below Phase 1 baseline");
}
if (loc.productTotal < FINISH5_KICKOFF.baseline.productLoc * 0.98) {
  errors.push("product LOC collapsed below 98% of Phase 1 baseline");
}
if (board.openFlagCount !== FINISH5_OPEN_GAP_FLAGS.length) {
  errors.push("open gap flags drifted from Phase 1 lock");
}
if (productLocProgress(FINISH5_KICKOFF.baseline.productLoc) !== 0) {
  errors.push("baseline LOC progress must be 0%");
}
// Soft-floor: Phase 29 closed all boolean gaps (freeze remains Phase 30).
if (FINISH5_OPEN_GAP_FLAGS.length !== 0) {
  errors.push("Finish 5.0 boolean gaps should be closed after Phase 29");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("contentCli5Missing")) {
  errors.push("contentCli5Missing must be closed after Phase 28");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("parityLock5Missing")) {
  errors.push("parityLock5Missing must be closed after Phase 29");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("engineDepthIncomplete")) {
  errors.push("engineDepthIncomplete must be closed after Phase 2");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("harborArt5Incomplete")) {
  errors.push("harborArt5Incomplete must be closed after Phase 8");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("fishArt5Incomplete")) {
  errors.push("fishArt5Incomplete must be closed after Phase 9");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("productArt5Incomplete")) {
  errors.push("productArt5Incomplete must be closed after Phase 10");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("atmosphere5Incomplete")) {
  errors.push("atmosphere5Incomplete must be closed after Phase 11");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("audioVfx5Incomplete")) {
  errors.push("audioVfx5Incomplete must be closed after Phase 12");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("contentFloorsShort")) {
  errors.push("contentFloorsShort must stay closed after content floors met");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("deeplinkE2e5Thin")) {
  errors.push("deeplinkE2e5Thin must be closed after Phase 26");
}
if (FINISH5_OPEN_GAP_FLAGS.includes("devicePerf5Incomplete")) {
  errors.push("devicePerf5Incomplete must be closed after Phase 27");
}
if (errors.length) {
  console.error("finish5:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK finish5:smoke — ${summaryLine(board)}; LOC progress ${productLocProgress(loc.productTotal)}%`,
);
