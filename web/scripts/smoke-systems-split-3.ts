/**
 * Finish 6.0 Phase 4 — systems-split-3 smoke.
 *
 * Usage:
 *   npm run systemssplit3:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureSystemsSplit3,
  SYSTEMS_SPLIT_3,
} from "../src/ship/systemsSplit3";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const errors: string[] = [];

const measure = measureSystemsSplit3(root);
if (!measure.facadeSlim) {
  errors.push(`facade ${measure.facadeLines} > ${SYSTEMS_SPLIT_3.systemsFacadeMaxLines}`);
}
if (!measure.extractedEnough) {
  errors.push(`extracted ${measure.extractedTsFiles} < ${SYSTEMS_SPLIT_3.extractedFileMin}`);
}
if (!measure.gapClosed) errors.push("systemsSplit3Incomplete still open");
if (!measure.kickoffWired) errors.push("kickoff phase 4 not wired");
if (FINISH6_OPEN_GAP_FLAGS.includes("systemsSplit3Incomplete")) {
  errors.push("OPEN_GAP_FLAGS still lists systemsSplit3Incomplete");
}
if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
  errors.push(`expected 7 open Finish 6 gaps after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
}
if (measure.missingFiles.length) errors.push(`missing ${measure.missingFiles.join(",")}`);
if (measure.circularImports.length) {
  errors.push(`circular ${measure.circularImports.join(",")}`);
}

if (errors.length) {
  console.error("systemssplit3:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK systemssplit3:smoke — facade=${measure.facadeLines}; modules=${measure.extractedTsFiles}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
