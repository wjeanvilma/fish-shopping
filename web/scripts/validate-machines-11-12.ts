/**
 * Finish 4.0 Phase 13 — machines 11–12 readiness.
 *
 * Usage:
 *   npm run machines1112:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  MACHINE_COUNT_1112,
  MACHINES_1112,
  MACHINES_1112_MARKER,
  MACHINES_1112_PHASE,
  MACHINES_1112_SCHEMA,
  measureMachines1112,
} from "../src/ship/machines1112";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/machines-11-12.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-machines-11-12.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines1112.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 13) errors.push(`phase expected 13, got ${catalog.phase}`);
  if (catalog.schema !== MACHINES_1112_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (MACHINES_1112_PHASE !== 13) errors.push("phase mirror mismatch");
  if (catalog.machines1112Marker !== MACHINES_1112_MARKER) errors.push("marker mismatch");
  if (fixture.machines1112Marker !== MACHINES_1112_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.machineCount !== 12 || MACHINE_COUNT_1112 !== 12) {
    errors.push("machineCount must be 12");
  }
  if (catalog.newMachineCount !== 2) errors.push("newMachineCount must be 2");
  if (catalog.newMachines?.length !== 2) errors.push("newMachines must list 2");

  const measure = measureMachines1112(root);
  if (measure.machineCount < 12) errors.push(`machines ${measure.machineCount} < 12`);
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
    errors.push("kickoff baseline.machines≥12 and machinesRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of MACHINES_1112.newMachines) {
    if (!en.strings?.[entry.id]) errors.push(`content-strings.en missing ${entry.id}`);
    if (!en.strings?.[entry.unlockUpgrade]) {
      errors.push(`content-strings.en missing ${entry.unlockUpgrade}`);
    }
    for (const productId of entry.products) {
      if (!en.strings?.[productId]) errors.push(`content-strings.en missing ${productId}`);
    }
  }

  const phase13 = (kickoff.phases as any[])?.find((p) => p.phase === 13);
  if (!phase13) errors.push("kickoff missing phase 13");
  else if (phase13.validate !== "machines1112:validate") {
    errors.push("kickoff phase 13 validate must be machines1112:validate");
  }
  if (phase13?.id !== "machines-11-12") errors.push("kickoff phase 13 id must be machines-11-12");
  if (kickoff.baseline?.machines !== 12) errors.push("kickoff.baseline.machines must be 12");
  if (kickoff.gaps?.machinesRemaining !== 0) {
    errors.push("kickoff.gaps.machinesRemaining must be 0");
  }
  if ((kickoff.gapTargets?.machinesMin ?? 0) < 12) {
    errors.push("kickoff.gapTargets.machinesMin must be ≥ 12");
  }

  if (listing.machines1112Phase !== 13) errors.push("listing.machines1112Phase must be 13");
  if (listing.machines1112Catalog !== "shared/ship/machines-11-12.json") {
    errors.push("listing.machines1112Catalog mismatch");
  }
  if (pin.machines1112 !== "shared/ship/machines-11-12.json") {
    errors.push("RELEASE_PIN.machines1112 path missing");
  }
  if (!pin.fixtures?.includes("parity-machines-11-12.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-machines-11-12.json");
  }

  const block = dod.machines1112;
  if (!block) errors.push("DoD missing machines1112 block");
  else {
    if (block.phase !== 13) errors.push("DoD machines1112.phase must be 13");
    if (block.plan !== "30_finish_4.0") errors.push("DoD machines1112.plan mismatch");
    if (block.status !== "complete") errors.push("DoD machines1112.status must be complete");
    if (block.machines1112Marker !== MACHINES_1112_MARKER) {
      errors.push("DoD machines1112 marker mismatch");
    }
  }
  if ((dod.quotas?.machineClasses ?? 0) < 12) {
    errors.push("DoD quotas.machineClasses must be ≥ 12");
  }

  if (!pkg.scripts?.["machines1112:validate"]) {
    errors.push("package.json missing machines1112:validate");
  }
  if (!ci.includes("machines1112:validate")) errors.push("ci.yml missing machines1112:validate");
  if (!kotlin.includes("NEW_MACHINE_IDS")) errors.push("Kotlin Machines1112 missing NEW_MACHINE_IDS");
  if (!existsSync(resolve(root, "shared/tools/author_machines_11_12.py"))) {
    errors.push("missing author_machines_11_12.py");
  }

  if (fixture.expectFinal?.machineCount !== 12) {
    errors.push("parity machineCount must be 12");
  }
  if (fixture.build?.plotId !== "plot.sunrise_braiser") {
    errors.push("fixture must build plot.sunrise_braiser");
  }
  if (fixture.expectFinal?.schemaVersion !== 24) {
    errors.push("fixture schemaVersion must stay 24");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("machines1112:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK machines1112:validate — machines 11–12 + recipes/UI pads wired");
