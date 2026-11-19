/**
 * Finish 5.0 Phase 6 — print LOC mid-check vs baseline/plan.
 *
 * Usage:
 *   npm run locmidcheck:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatLocMidcheck,
  LOC_MIDCHECK,
  measureLocMidcheck,
} from "../src/ship/locMidcheck";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

const m = measureLocMidcheck(root);
const errors: string[] = [];

if (!m.meetsPriorBaseline) errors.push("below Phase 1 baseline");
if (!m.meetsInterimFloors) errors.push("below interim soft floors");
if (!m.midcheckAligned) errors.push("below midcheck beyond slack");
if (!m.planTargetsIntact) errors.push("plan targets drifted");
if (!m.kickoffWired) errors.push("kickoff phase 6 not wired");
if (m.missingGates.length) errors.push(`missing gates: ${m.missingGates.join(", ")}`);

console.log(formatLocMidcheck(m));

if (errors.length) {
  console.error("locmidcheck:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK locmidcheck:smoke — product ${m.live.productTotal} (≥ interim ${LOC_MIDCHECK.interimSoftFloors.productLoc}, midcheck ${LOC_MIDCHECK.midcheck.productLoc})`,
);
