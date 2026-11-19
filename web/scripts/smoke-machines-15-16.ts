/**
 * Finish 6.0 Phase 9 — machines 15–16 smoke.
 *
 * Usage:
 *   npm run machines1516:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { measureMachines1516 } from "../src/ship/machines1516";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureMachines1516(root);
const ok =
  m.machineCount >= 16 &&
  m.newMachinesPresent &&
  m.recipesWired &&
  m.productsPresent &&
  m.upgradesWired &&
  m.plotsWired &&
  m.stationsWired &&
  m.assetsPresent &&
  m.kickoffMachinesMet &&
  m.missingGates.length === 0 &&
  FINISH6_OPEN_GAP_FLAGS.length <= 7;

if (!ok) {
  console.error("machines1516:smoke FAILED");
  console.error(JSON.stringify(m, null, 2));
  process.exit(1);
}

console.log(
  `OK machines1516:smoke — machines=${m.machineCount}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
