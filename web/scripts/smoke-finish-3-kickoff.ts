/**
 * Finish 3.0 Phase 1 — smoke the gap scoreboard against live catalogs.
 *
 * Usage:
 *   npm run finish3:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  baselineScoreboard,
  FINISH3_KICKOFF,
  FINISH3_OPEN_GAP_FLAGS,
  measureArtCounts,
  productLocProgress,
  requireThirtyPhases,
  summaryLine,
} from "../src/ship/finish3Kickoff";
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

if (art.authoredHarbors < FINISH3_KICKOFF.baseline.authoredHarbors) {
  errors.push("authored harbors regressed below Phase 1 baseline");
}
if (art.authoredFish < FINISH3_KICKOFF.baseline.authoredFish) {
  errors.push("authored fish regressed below Phase 1 baseline");
}
if (loc.productTotal < FINISH3_KICKOFF.baseline.productLoc * 0.98) {
  errors.push("product LOC collapsed below 98% of Phase 1 baseline");
}
if (board.openFlagCount !== FINISH3_OPEN_GAP_FLAGS.length) {
  errors.push("open gap flags drifted from Phase 1 lock");
}
if (productLocProgress(FINISH3_KICKOFF.baseline.productLoc) !== 0) {
  errors.push("baseline LOC progress must be 0%");
}

if (errors.length) {
  console.error("finish3:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`OK finish3:smoke — ${summaryLine(board)}; LOC progress ${productLocProgress(loc.productTotal)}%`);
