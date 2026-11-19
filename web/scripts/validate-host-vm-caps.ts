/**
 * Finish 6.0 Phase 5 — GameViewModel ≤1200 + GameHost ≤1100 readiness.
 *
 * Usage:
 *   npm run hostvmcaps:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  HOST_VM_CAPS,
  HOST_VM_CAPS_MARKER,
  HOST_VM_CAPS_PHASE,
  HOST_VM_CAPS_SCHEMA,
  measureHostVmCaps,
} from "../src/ship/hostVmCaps";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/host-vm-caps.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-host-vm-caps.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/HostVmCaps.kt",
    ),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 5) errors.push(`phase expected 5, got ${catalog.phase}`);
  if (catalog.schema !== HOST_VM_CAPS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (HOST_VM_CAPS_PHASE !== 5) errors.push("phase mirror mismatch");
  if (catalog.hostVmCapsMarker !== HOST_VM_CAPS_MARKER) errors.push("marker mismatch");
  if (fixture.hostVmCapsMarker !== HOST_VM_CAPS_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.viewModelMaxLines !== 1200) errors.push("viewModelMaxLines must be 1200");
  if (catalog.gameHostMaxLines !== 1100) errors.push("gameHostMaxLines must be 1100");
  if (catalog.extractedFileMin !== 4) errors.push("extractedFileMin must be 4");
  if ((catalog.requiredFiles as string[]).length !== 4) {
    errors.push("requiredFiles must list 4 Phase 5 modules");
  }
  if (catalog.closesGap !== "hostVmCapsIncomplete") {
    errors.push("closesGap must be hostVmCapsIncomplete");
  }

  const measure = measureHostVmCaps(root);
  if (!measure.viewModelSlim) {
    errors.push(
      `GameViewModel.kt has ${measure.viewModelLines} lines (max ${catalog.viewModelMaxLines})`,
    );
  }
  if (!measure.gameHostSlim) {
    errors.push(
      `GameHost.ts has ${measure.gameHostLines} lines (max ${catalog.gameHostMaxLines})`,
    );
  }
  if (measure.viewModelLines >= 1600) {
    errors.push(`GameViewModel did not shrink below Finish 4 max (${measure.viewModelLines})`);
  }
  if (measure.gameHostLines >= 1400) {
    errors.push(`GameHost did not shrink below Finish 4 max (${measure.gameHostLines})`);
  }
  if (!measure.extractedEnough) {
    errors.push(
      `extracted Phase 5 modules ${measure.extractedPresent} < min ${catalog.extractedFileMin}`,
    );
  }
  for (const f of measure.missingFiles) errors.push(`missing file ${f}`);
  for (const f of measure.missingPriorFiles) errors.push(`missing prior split file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);
  for (const d of measure.facadeStillDefines) errors.push(`facade still defines ${d}`);
  if (!measure.gapClosed) errors.push("kickoff.gaps.hostVmCapsIncomplete must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 5 must set id=host-vm-caps validate=hostvmcaps:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.hostVmCapsIncomplete !== false) {
    errors.push("kickoff gap hostVmCapsIncomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("hostVmCapsIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include hostVmCapsIncomplete after Phase 5");
  }

  const phase5 = (kickoff.phases as any[])?.find((p: any) => p.phase === 5);
  if (!phase5) errors.push("kickoff missing phase 5");
  else if (phase5.validate !== "hostvmcaps:validate") {
    errors.push("kickoff phase 5 validate must be hostvmcaps:validate");
  }
  if (phase5?.id !== "host-vm-caps") errors.push("kickoff phase 5 id must be host-vm-caps");

  if (listing.hostVmCapsPhase !== 5) errors.push("listing.hostVmCapsPhase must be 5");
  if (listing.hostVmCapsCatalog !== "shared/ship/host-vm-caps.json") {
    errors.push("listing.hostVmCapsCatalog mismatch");
  }
  if (pin.hostVmCaps !== "shared/ship/host-vm-caps.json") {
    errors.push("RELEASE_PIN.hostVmCaps path missing");
  }
  if (!pin.fixtures?.includes("parity-host-vm-caps.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-host-vm-caps.json");
  }

  const block = dod.hostVmCaps;
  if (!block) errors.push("DoD missing hostVmCaps block");
  else {
    if (block.phase !== 5) errors.push("DoD hostVmCaps.phase must be 5");
    if (block.plan !== "30_finish_6.0") errors.push("DoD hostVmCaps.plan mismatch");
    if (block.status !== "complete") errors.push("DoD hostVmCaps.status must be complete");
    if (block.hostVmCapsMarker !== HOST_VM_CAPS_MARKER) {
      errors.push("DoD hostVmCaps marker mismatch");
    }
  }

  if (!pkg.scripts?.["hostvmcaps:validate"]) errors.push("package.json missing hostvmcaps:validate");
  if (!pkg.scripts?.["hostvmcaps:smoke"]) errors.push("package.json missing hostvmcaps:smoke");
  if (!ci.includes("hostvmcaps:validate")) errors.push("ci.yml missing hostvmcaps:validate");
  if (!ci.includes("hostvmcaps:smoke")) errors.push("ci.yml missing hostvmcaps:smoke");
  if (!kotlin.includes("VIEW_MODEL_MAX_LINES")) {
    errors.push("Kotlin HostVmCaps missing VIEW_MODEL_MAX_LINES");
  }
  if (!kotlin.includes("GAME_HOST_MAX_LINES")) {
    errors.push("Kotlin HostVmCaps missing GAME_HOST_MAX_LINES");
  }
  if (!finish6Kt.includes("hostvmcaps:validate")) {
    errors.push("Finish6Kickoff.kt phase 5 missing hostvmcaps:validate");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("fun score"),
  );
  if (openBlock.includes("hostVmCapsIncomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop hostVmCapsIncomplete");
  }

  if (fixture.expect?.viewModelMaxLines !== 1200) {
    errors.push("parity viewModelMaxLines must be 1200");
  }
  if (fixture.expect?.gameHostMaxLines !== 1100) {
    errors.push("parity gameHostMaxLines must be 1100");
  }
  if (fixture.expect?.extractedFileMin !== 4) {
    errors.push("parity extractedFileMin must be 4");
  }
  if (fixture.expect?.gapClosed !== "hostVmCapsIncomplete") {
    errors.push("parity gapClosed mismatch");
  }

  if (!existsSync(resolve(root, catalog.priorViewModelSplit))) {
    errors.push("missing prior viewmodel-split catalog");
  }
  if (!existsSync(resolve(root, catalog.priorGameHostSplit))) {
    errors.push("missing prior gamehost-split catalog");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("hostvmcaps:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK hostvmcaps:validate — GameViewModel≤1200 + GameHost≤1100; hostVmCapsIncomplete closed",
);
