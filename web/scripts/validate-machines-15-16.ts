/**
 * Finish 6.0 Phase 9 — machines 15–16 readiness.
 *
 * Usage:
 *   npm run machines1516:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  MACHINE_COUNT_1516,
  MACHINES_1516,
  MACHINES_1516_MARKER,
  MACHINES_1516_PHASE,
  MACHINES_1516_SCHEMA,
  measureMachines1516,
} from "../src/ship/machines1516";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/machines-15-16.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-machines-15-16.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines1516.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 9) errors.push(`phase expected 9, got ${catalog.phase}`);
  if (catalog.schema !== MACHINES_1516_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (MACHINES_1516_PHASE !== 9) errors.push("phase mirror mismatch");
  if (catalog.machines1516Marker !== MACHINES_1516_MARKER) errors.push("marker mismatch");
  if (fixture.machines1516Marker !== MACHINES_1516_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.machineCount !== 16 || MACHINE_COUNT_1516 !== 16) {
    errors.push("machineCount must be 16");
  }
  if (catalog.newMachineCount !== 2) errors.push("newMachineCount must be 2");
  if (catalog.newMachines?.length !== 2) errors.push("newMachines must list 2");

  const measure = measureMachines1516(root);
  if (measure.machineCount < 16) errors.push(`machines ${measure.machineCount} < 16`);
  if (!measure.newMachinesPresent) errors.push("new machines missing");
  if (!measure.recipesWired) errors.push("recipes not wired");
  if (!measure.productsPresent) errors.push("products missing");
  if (!measure.upgradesWired) errors.push("unlock upgrades missing");
  if (!measure.plotsWired) errors.push("plots missing on harbors");
  if (!measure.stationsWired) errors.push("stations missing on harbors");
  if (!measure.assetsPresent) {
    errors.push(`missing assets: ${measure.missingAssets.join(", ")}`);
  }
  if (!measure.kickoffMachinesMet) {
    errors.push("kickoff baseline.machines≥14 and machinesRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of MACHINES_1516.newMachines) {
    if (!en.strings?.[entry.id]) errors.push(`content-strings.en missing ${entry.id}`);
    if (!en.strings?.[entry.unlockUpgrade]) {
      errors.push(`content-strings.en missing ${entry.unlockUpgrade}`);
    }
    for (const productId of entry.products) {
      if (!en.strings?.[productId]) errors.push(`content-strings.en missing ${productId}`);
    }
  }

  const phase9 = (kickoff.phases as any[])?.find((p) => p.phase === 9);
  if (!phase9) errors.push("kickoff missing phase 9");
  else if (phase9.validate !== "machines1516:validate") {
    errors.push("kickoff phase 9 validate must be machines1516:validate");
  }
  if (phase9?.id !== "machines-15-16") errors.push("kickoff phase 9 id must be machines-15-16");
  if (kickoff.baseline?.machines !== 14) errors.push("kickoff.baseline.machines must stay 14");
  if (kickoff.gaps?.machinesRemaining !== 0) {
    errors.push("kickoff.gaps.machinesRemaining must be 0");
  }
  if ((kickoff.gapTargets?.machinesMin ?? 0) < 16) {
    errors.push("kickoff.gapTargets.machinesMin must be ≥ 16");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`open boolean gaps must stay 7, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.machines1516Phase !== 9) errors.push("listing.machines1516Phase must be 9");
  if (listing.machines1516Catalog !== "shared/ship/machines-15-16.json") {
    errors.push("listing.machines1516Catalog mismatch");
  }
  if (pin.machines1516 !== "shared/ship/machines-15-16.json") {
    errors.push("RELEASE_PIN.machines1516 path missing");
  }
  if (!pin.fixtures?.includes("parity-machines-15-16.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-machines-15-16.json");
  }

  const block = dod.machines1516;
  if (!block) errors.push("DoD missing machines1516 block");
  else {
    if (block.phase !== 9) errors.push("DoD machines1516.phase must be 9");
    if (block.plan !== "30_finish_6.0") errors.push("DoD machines1516.plan mismatch");
    if (block.status !== "complete") errors.push("DoD machines1516.status must be complete");
    if (block.machines1516Marker !== MACHINES_1516_MARKER) {
      errors.push("DoD machines1516 marker mismatch");
    }
  }
  if ((dod.quotas?.machineClasses ?? 0) < 16) {
    errors.push("DoD quotas.machineClasses must be ≥ 16");
  }

  if (!pkg.scripts?.["machines1516:validate"]) {
    errors.push("package.json missing machines1516:validate");
  }
  if (!pkg.scripts?.["machines1516:smoke"]) {
    errors.push("package.json missing machines1516:smoke");
  }
  if (!ci.includes("machines1516:validate")) errors.push("ci.yml missing machines1516:validate");
  if (!kotlin.includes("NEW_MACHINE_IDS")) errors.push("Kotlin Machines1516 missing NEW_MACHINE_IDS");
  if (!existsSync(resolve(root, "shared/tools/author_machines_15_16.py"))) {
    errors.push("missing author_machines_15_16.py");
  }

  if (fixture.expectFinal?.machineCount !== 16) {
    errors.push("parity machineCount must be 16");
  }
  if (fixture.build?.plotId !== "plot.sunrise_roaster") {
    errors.push("fixture must build plot.sunrise_roaster");
  }
  if (fixture.expectFinal?.schemaVersion !== 26) {
    errors.push("fixture schemaVersion must stay 26");
  }
  if (fixture.expectFinal?.machinesRemainingClosed !== 0) {
    errors.push("parity machinesRemainingClosed must be 0");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("machines1516:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK machines1516:validate — machines 15–16 + recipes/UI pads wired");
