/**
 * Finish 4.0 Phase 12 — harbors 9–10 + travel/prestige readiness.
 *
 * Usage:
 *   npm run harbors910:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  HARBOR_COUNT_FLOOR_910,
  HARBORS_910,
  HARBORS_910_MARKER,
  HARBORS_910_PHASE,
  HARBORS_910_SCHEMA,
  measureHarbors910,
} from "../src/ship/harbors910";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbors-9-10.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbors-9-10.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Harbors910.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 12) errors.push(`phase expected 12, got ${catalog.phase}`);
  if (catalog.schema !== HARBORS_910_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (HARBORS_910_PHASE !== 12) errors.push("phase mirror mismatch");
  if (catalog.harbors910Marker !== HARBORS_910_MARKER) errors.push("marker mismatch");
  if (fixture.harbors910Marker !== HARBORS_910_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.harborCount !== 10 || HARBOR_COUNT_FLOOR_910 !== 10) {
    errors.push("harborCount must be 10");
  }
  if (catalog.newHarborCount !== 2) errors.push("newHarborCount must be 2");
  if ((catalog.newHarbors as unknown[]).length !== 2) errors.push("newHarbors must list 2");

  const measure = measureHarbors910(root);
  if (measure.harborCount < 10) errors.push(`harbors ${measure.harborCount} < 10`);
  if (!measure.newHarborsPresent) errors.push("mist_cove + prism_reach missing from content-pack");
  if (!measure.prestigePresent) errors.push("prestige nine/ten missing");
  if (!measure.questsPresent) errors.push("landing quests missing");
  if (!measure.galleriesPresent) errors.push("galleries missing");
  if (!measure.blockoutsPresent) {
    for (const b of measure.missingBlockouts) errors.push(`missing blockout ${b}`);
  }
  if (!measure.kickoffHarborMet) {
    errors.push("kickoff authoredHarbors=10 and authoredHarborsRemaining=0 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of HARBORS_910.newHarbors) {
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

  for (const id of HARBORS_910.circuitPrestige) {
    if (!content.prestigeMilestonesById.has(id)) {
      errors.push(`missing circuit prestige ${id}`);
    }
  }

  const phase12 = (kickoff.phases as any[])?.find((p) => p.phase === 12);
  if (!phase12) errors.push("kickoff missing phase 12");
  else if (phase12.validate !== "harbors910:validate") {
    errors.push("kickoff phase 12 validate must be harbors910:validate");
  }
  if (phase12?.id !== "harbors-9-10") errors.push("kickoff phase 12 id must be harbors-9-10");
  if (kickoff.baseline?.authoredHarbors !== 10) errors.push("kickoff baseline.authoredHarbors must be 10");
  if (kickoff.baseline?.harbors !== 10) errors.push("kickoff baseline.harbors must be 10");
  if (kickoff.gaps?.authoredHarborsRemaining !== 0) {
    errors.push("kickoff gaps.authoredHarborsRemaining must be 0");
  }

  if (listing.harbors910Phase !== 12) errors.push("listing.harbors910Phase must be 12");
  if (listing.harbors910Catalog !== "shared/ship/harbors-9-10.json") {
    errors.push("listing.harbors910Catalog mismatch");
  }
  if (pin.harbors910 !== "shared/ship/harbors-9-10.json") {
    errors.push("RELEASE_PIN.harbors910 path missing");
  }
  if (!pin.fixtures?.includes("parity-harbors-9-10.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbors-9-10.json");
  }

  const block = dod.harbors910;
  if (!block) errors.push("DoD missing harbors910 block");
  else {
    if (block.phase !== 12) errors.push("DoD harbors910.phase must be 12");
    if (block.plan !== "30_finish_4.0") errors.push("DoD harbors910.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harbors910.status must be complete");
    if (block.harbors910Marker !== HARBORS_910_MARKER) errors.push("DoD harbors910 marker mismatch");
  }
  if ((dod.quotas?.harbors ?? 0) < 10) errors.push("DoD quotas.harbors must be ≥ 10");
  if ((dod.quotas?.authoredHarborScenes ?? 0) < 10) {
    errors.push("DoD quotas.authoredHarborScenes must be ≥ 10");
  }

  if (!pkg.scripts?.["harbors910:validate"]) errors.push("package.json missing harbors910:validate");
  if (!ci.includes("harbors910:validate")) errors.push("ci.yml missing harbors910:validate");
  if (!kotlin.includes("NEW_HARBOR_IDS")) errors.push("Kotlin Harbors910 missing NEW_HARBOR_IDS");
  if (!app.includes("mist_cove_blockout.glb")) errors.push("App.tsx missing mist_cove blockout URL");
  if (!app.includes("prism_reach_blockout.glb")) errors.push("App.tsx missing prism_reach blockout URL");

  if (fixture.setup?.harborsTraveled !== 8) errors.push("fixture setup harborsTraveled must be 8");
  if ((fixture.travels as any[])?.length !== 2) errors.push("fixture travels must be 2");
  if (fixture.expectFinal?.harborId !== "harbor.prism_reach") {
    errors.push("fixture expectFinal harbor must be prism_reach");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harbors910:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK harbors910:validate — harbors 9–10 + nine/ten prestige + travel fixture ready");
