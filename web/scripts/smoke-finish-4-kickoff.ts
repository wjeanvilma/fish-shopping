/**
 * Finish 4.0 Phase 1 — smoke the gap scoreboard against live catalogs.
 *
 * Usage:
 *   npm run finish4:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  baselineScoreboard,
  FINISH4_KICKOFF,
  FINISH4_OPEN_GAP_FLAGS,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish4Kickoff";
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

if (art.authoredHarbors < FINISH4_KICKOFF.baseline.authoredHarbors) {
  errors.push("authored harbors regressed below Phase 1 baseline");
}
if (art.authoredFish < FINISH4_KICKOFF.baseline.authoredFish) {
  errors.push("authored fish regressed below Phase 1 baseline");
}
if (loc.productTotal < FINISH4_KICKOFF.baseline.productLoc * 0.98) {
  errors.push("product LOC collapsed below 98% of Phase 1 baseline");
}
if (board.openFlagCount !== FINISH4_OPEN_GAP_FLAGS.length) {
  errors.push("open gap flags drifted from Phase 1 lock");
}
if (productLocProgress(FINISH4_KICKOFF.baseline.productLoc) !== 0) {
  errors.push("baseline LOC progress must be 0%");
}
if (FINISH4_OPEN_GAP_FLAGS.length < 7) {
  errors.push("Finish 4.0 should still have open boolean gaps after Phase 10");
}
if (FINISH4_OPEN_GAP_FLAGS.includes("harborBlockoutPresent")) {
  errors.push("harborBlockoutPresent must be closed after Phase 9");
}
if (FINISH4_OPEN_GAP_FLAGS.includes("productArtIncomplete")) {
  errors.push("productArtIncomplete must be closed after Phase 10");
}

if (errors.length) {
  console.error("finish4:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK finish4:smoke — ${summaryLine(board)}; LOC progress ${productLocProgress(loc.productTotal)}%`,
);
