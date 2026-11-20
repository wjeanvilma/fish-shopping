/**
 * Finish 6.0 Phase 5 — host-vm-caps smoke.
 *
 * Usage:
 *   npm run hostvmcaps:smoke
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { HOST_VM_CAPS, measureHostVmCaps } from "../src/ship/hostVmCaps";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const errors: string[] = [];

const measure = measureHostVmCaps(root);
if (!measure.viewModelSlim) {
  errors.push(`viewModel ${measure.viewModelLines} > ${HOST_VM_CAPS.viewModelMaxLines}`);
}
if (!measure.gameHostSlim) {
  errors.push(`gameHost ${measure.gameHostLines} > ${HOST_VM_CAPS.gameHostMaxLines}`);
}
if (!measure.extractedEnough) {
  errors.push(`extracted ${measure.extractedPresent} < ${HOST_VM_CAPS.extractedFileMin}`);
}
if (!measure.gapClosed) errors.push("hostVmCapsIncomplete still open");
if (!measure.kickoffWired) errors.push("kickoff phase 5 not wired");
if (FINISH6_OPEN_GAP_FLAGS.includes("hostVmCapsIncomplete")) {
  errors.push("OPEN_GAP_FLAGS still lists hostVmCapsIncomplete");
}
if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
  errors.push(`expected 7 open Finish 6 gaps after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
}
if (measure.missingFiles.length) errors.push(`missing ${measure.missingFiles.join(",")}`);

if (errors.length) {
  console.error("hostvmcaps:smoke FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `OK hostvmcaps:smoke — vm=${measure.viewModelLines}; host=${measure.gameHostLines}; modules=${measure.extractedPresent}; openFlags=${FINISH6_OPEN_GAP_FLAGS.length}`,
);
