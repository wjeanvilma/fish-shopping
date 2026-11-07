/**
 * Finish 2.0 Phase 6 — print product LOC vs Phase 30 floors (no hard fail).
 *
 * Usage:
 *   npm run loc:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOC_FLOORS,
  formatLocScoreboard,
  measureLocScoreboard,
} from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const board = measureLocScoreboard(root);
console.log(formatLocScoreboard(board));
console.log(
  `baseline@phase${LOC_FLOORS.baseline.measuredAtPhase}: ` +
    `game-core=${LOC_FLOORS.baseline.gameCore} app=${LOC_FLOORS.baseline.app} ` +
    `web/src=${LOC_FLOORS.baseline.webSrc} product=${LOC_FLOORS.baseline.productTotal}`,
);

if (LOC_FLOORS.enforceFloors) {
  const failed: string[] = [];
  if (!board.gameCore.met) failed.push(`game-core ${board.gameCore.lines}<${board.gameCore.floor}`);
  if (!board.app.met) failed.push(`app ${board.app.lines}<${board.app.floor}`);
  if (!board.webSrc.met) failed.push(`web/src ${board.webSrc.lines}<${board.webSrc.floor}`);
  if (!board.productMet) {
    failed.push(`product ${board.productTotal}<${board.productTotalFloor}`);
  }
  if (failed.length) {
    console.error("loc:smoke FAILED (enforceFloors=true)");
    for (const f of failed) console.error(`  - ${f}`);
    process.exit(1);
  }
}

console.log("OK loc:smoke — scoreboard printed");
