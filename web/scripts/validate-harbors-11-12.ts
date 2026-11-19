/**
 * Finish 5.0 Phase 14 — harbors 11–12 + travel/prestige readiness.
 *
 * Usage:
 *   npm run harbors1112:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  HARBOR_COUNT_FLOOR_1112,
  HARBORS_1112,
  HARBORS_1112_MARKER,
  HARBORS_1112_PHASE,
  HARBORS_1112_SCHEMA,
  measureHarbors1112,
} from "../src/ship/harbors1112";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbors-11-12.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbors-11-12.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Harbors1112.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 14) errors.push(`phase expected 14, got ${catalog.phase}`);
  if (catalog.schema !== HARBORS_1112_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (HARBORS_1112_PHASE !== 14) errors.push("phase mirror mismatch");
  if (catalog.harbors1112Marker !== HARBORS_1112_MARKER) errors.push("marker mismatch");
  if (fixture.harbors1112Marker !== HARBORS_1112_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.harborCount !== 12 || HARBOR_COUNT_FLOOR_1112 !== 12) {
    errors.push("harborCount must be 12");
  }
  if (catalog.newHarborCount !== 2) errors.push("newHarborCount must be 2");
  if ((catalog.newHarbors as unknown[]).length !== 2) errors.push("newHarbors must list 2");

  const measure = measureHarbors1112(root);
  if (measure.harborCount < 12) errors.push(`harbors ${measure.harborCount} < 12`);
  if (!measure.newHarborsPresent) errors.push("aurora_inlet + tideglass_bay missing from content-pack");
  if (!measure.prestigePresent) errors.push("prestige eleven/twelve missing");
  if (!measure.questsPresent) errors.push("landing quests missing");
  if (!measure.galleriesPresent) errors.push("galleries missing");
  if (!measure.blockoutsPresent) {
    for (const b of measure.missingBlockouts) errors.push(`missing blockout ${b}`);
  }
  if (!measure.kickoffHarborMet) {
    errors.push("kickoff authoredHarbors=12 and authoredHarborsRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of HARBORS_1112.newHarbors) {
    const h = content.harborsById.get(entry.id);
    if (!h) {
      errors.push(`missing harbor ${entry.id}`);
      continue;
    }
    if (h.name !== entry.name) errors.push(`${entry.id} name mismatch`);
    if (JSON.stringify([...(h.requires ?? [])]) !== JSON.stringify(entry.requires)) {
      errors.push(`${entry.id} requires mismatch`);
    }
    if (h.specialization?.id !== entry.specialization) {
      errors.push(`${entry.id} specialization mismatch`);
    }
    if (!content.questsById.has(entry.landingQuest)) {
      errors.push(`missing landing quest ${entry.landingQuest}`);
    }
    if (!content.prestigeMilestonesById.has(entry.prestigeUnlock)) {
      errors.push(`missing prestige ${entry.prestigeUnlock}`);
    }
    if (!content.trophySetsById.has(entry.gallery)) {
      errors.push(`missing gallery ${entry.gallery}`);
    }
    if (!existsSync(resolve(root, entry.blockout))) {
      errors.push(`missing blockout ${entry.blockout}`);
    }
    if (h.zones.length < 15) errors.push(`${entry.id} needs a full zone layout`);
    if (h.fishingSpots.length < 3) errors.push(`${entry.id} needs ≥3 fishing spots`);
    if (h.stations.length < 6) errors.push(`${entry.id} needs marina-class stations`);
  }

  for (const id of HARBORS_1112.circuitPrestige) {
    if (!content.prestigeMilestonesById.has(id)) {
      errors.push(`missing circuit prestige ${id}`);
    }
  }

  const phase14 = (kickoff.phases as any[])?.find((p) => p.phase === 14);
  if (!phase14) errors.push("kickoff missing phase 14");
  else if (phase14.validate !== "harbors1112:validate") {
    errors.push("kickoff phase 14 validate must be harbors1112:validate");
  }
  if (phase14?.id !== "harbors-11-12") errors.push("kickoff phase 14 id must be harbors-11-12");
  if (kickoff.baseline?.authoredHarbors !== 12) errors.push("kickoff baseline.authoredHarbors must be 12");
  if (kickoff.baseline?.harbors !== 12) errors.push("kickoff baseline.harbors must be 12");
  if (kickoff.gaps?.authoredHarborsRemaining !== 0) {
    errors.push("kickoff gaps.authoredHarborsRemaining must be 0");
  }

  if (listing.harbors1112Phase !== 14) errors.push("listing.harbors1112Phase must be 14");
  if (listing.harbors1112Catalog !== "shared/ship/harbors-11-12.json") {
    errors.push("listing.harbors1112Catalog mismatch");
  }
  if (pin.harbors1112 !== "shared/ship/harbors-11-12.json") {
    errors.push("RELEASE_PIN.harbors1112 path missing");
  }
  if (!pin.fixtures?.includes("parity-harbors-11-12.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbors-11-12.json");
  }

  const block = dod.harbors1112;
  if (!block) errors.push("DoD missing harbors1112 block");
  else {
    if (block.phase !== 14) errors.push("DoD harbors1112.phase must be 14");
    if (block.plan !== "30_finish_5.0") errors.push("DoD harbors1112.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harbors1112.status must be complete");
    if (block.harbors1112Marker !== HARBORS_1112_MARKER) errors.push("DoD harbors1112 marker mismatch");
  }
  if ((dod.quotas?.harbors ?? 0) < 12) errors.push("DoD quotas.harbors must be ≥ 12");
  if ((dod.quotas?.authoredHarborScenes ?? 0) < 12) {
    errors.push("DoD quotas.authoredHarborScenes must be ≥ 12");
  }

  if (!pkg.scripts?.["harbors1112:validate"]) errors.push("package.json missing harbors1112:validate");
  if (!ci.includes("harbors1112:validate")) errors.push("ci.yml missing harbors1112:validate");
  if (!kotlin.includes("NEW_HARBOR_IDS")) errors.push("Kotlin Harbors1112 missing NEW_HARBOR_IDS");
  if (!app.includes("aurora_inlet_blockout.glb")) errors.push("App.tsx missing aurora_inlet blockout URL");
  if (!app.includes("tideglass_bay_blockout.glb")) errors.push("App.tsx missing tideglass_bay blockout URL");

  if (fixture.setup?.harborsTraveled !== 10) errors.push("fixture setup harborsTraveled must be 10");
  if ((fixture.travels as any[])?.length !== 2) errors.push("fixture travels must be 2");
  if (fixture.expectFinal?.harborId !== "harbor.tideglass_bay") {
    errors.push("fixture expectFinal harbor must be tideglass_bay");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harbors1112:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harbors1112:validate — harbors 11–12 + eleven/twelve prestige + travel fixture ready");
