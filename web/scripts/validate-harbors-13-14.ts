/**
 * Finish 6.0 Phase 7 — harbors 13–14 + scenic art/prestige readiness.
 *
 * Usage:
 *   npm run harbors1314:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  FINISH6_OPEN_GAP_FLAGS,
} from "../src/ship/finish6Kickoff";
import {
  HARBOR_COUNT_FLOOR_1314,
  HARBORS_1314,
  HARBORS_1314_MARKER,
  HARBORS_1314_PHASE,
  HARBORS_1314_SCHEMA,
  measureHarbors1314,
} from "../src/ship/harbors1314";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/harbors-13-14.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-harbors-13-14.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const art = readJson(resolve(root, "shared/ship/harbor-art-pass.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Harbors1314.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 7) errors.push(`phase expected 7, got ${catalog.phase}`);
  if (catalog.schema !== HARBORS_1314_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (HARBORS_1314_PHASE !== 7) errors.push("phase mirror mismatch");
  if (catalog.harbors1314Marker !== HARBORS_1314_MARKER) errors.push("marker mismatch");
  if (fixture.harbors1314Marker !== HARBORS_1314_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (catalog.harborCount !== 14 || HARBOR_COUNT_FLOOR_1314 !== 14) {
    errors.push("harborCount must be 14");
  }
  if (catalog.newHarborCount !== 2) errors.push("newHarborCount must be 2");
  if ((catalog.newHarbors as unknown[]).length !== 2) errors.push("newHarbors must list 2");

  const measure = measureHarbors1314(root);
  if (measure.harborCount < 14) errors.push(`harbors ${measure.harborCount} < 14`);
  if (!measure.newHarborsPresent) errors.push("saffron_quay + cobalt_sound missing from content-pack");
  if (!measure.prestigePresent) errors.push("prestige thirteen/fourteen missing");
  if (!measure.questsPresent) errors.push("landing quests missing");
  if (!measure.galleriesPresent) errors.push("galleries missing");
  if (!measure.blockoutsPresent) {
    for (const b of measure.missingBlockouts) errors.push(`missing blockout ${b}`);
  }
  if (!measure.kickoffHarborMet) {
    errors.push(
      "kickoff baseline authoredHarbors=12, remaining=0, gapTargets.harborsMin≥14 required",
    );
  }
  if (!measure.harborArt6Closed) {
    errors.push("kickoff gaps.harborArt6Incomplete must be false after Phase 7");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const entry of HARBORS_1314.newHarbors) {
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

  for (const id of HARBORS_1314.circuitPrestige) {
    if (!content.prestigeMilestonesById.has(id)) {
      errors.push(`missing circuit prestige ${id}`);
    }
  }

  const phase7 = (kickoff.phases as any[])?.find((p) => p.phase === 7);
  if (!phase7) errors.push("kickoff missing phase 7");
  else if (phase7.validate !== "harbors1314:validate") {
    errors.push("kickoff phase 7 validate must be harbors1314:validate");
  }
  if (phase7?.id !== "harbors-13-14") errors.push("kickoff phase 7 id must be harbors-13-14");
  if (kickoff.baseline?.authoredHarbors !== 12) {
    errors.push("kickoff baseline.authoredHarbors must stay 12 (Phase 1 lock)");
  }
  if (kickoff.baseline?.harbors !== 12) {
    errors.push("kickoff baseline.harbors must stay 12 (Phase 1 lock)");
  }
  if (kickoff.gaps?.authoredHarborsRemaining !== 0) {
    errors.push("kickoff gaps.authoredHarborsRemaining must be 0");
  }
  if (kickoff.gaps?.harborArt6Incomplete !== false) {
    errors.push("kickoff gaps.harborArt6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("harborArt6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include harborArt6Incomplete after Phase 7");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  if ((art.authoredHarbors as unknown[])?.length < 14) {
    errors.push("harbor-art-pass authoredHarbors must be ≥ 14");
  }
  if ((art.authoredHarborMin ?? 0) < 14) errors.push("harbor-art-pass authoredHarborMin must be ≥ 14");
  if (!(art.allBlockoutAssets as string[])?.includes("saffron_quay_blockout.glb")) {
    errors.push("harbor-art-pass missing saffron_quay_blockout.glb");
  }
  if (!(art.allBlockoutAssets as string[])?.includes("cobalt_sound_blockout.glb")) {
    errors.push("harbor-art-pass missing cobalt_sound_blockout.glb");
  }

  if (listing.harbors1314Phase !== 7) errors.push("listing.harbors1314Phase must be 7");
  if (listing.harbors1314Catalog !== "shared/ship/harbors-13-14.json") {
    errors.push("listing.harbors1314Catalog mismatch");
  }
  if (pin.harbors1314 !== "shared/ship/harbors-13-14.json") {
    errors.push("RELEASE_PIN.harbors1314 path missing");
  }
  if (!pin.fixtures?.includes("parity-harbors-13-14.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-harbors-13-14.json");
  }

  const block = dod.harbors1314;
  if (!block) errors.push("DoD missing harbors1314 block");
  else {
    if (block.phase !== 7) errors.push("DoD harbors1314.phase must be 7");
    if (block.plan !== "30_finish_6.0") errors.push("DoD harbors1314.plan mismatch");
    if (block.status !== "complete") errors.push("DoD harbors1314.status must be complete");
    if (block.harbors1314Marker !== HARBORS_1314_MARKER) errors.push("DoD harbors1314 marker mismatch");
  }
  if ((dod.quotas?.harbors ?? 0) < 14) errors.push("DoD quotas.harbors must be ≥ 14");
  if ((dod.quotas?.authoredHarborScenes ?? 0) < 14) {
    errors.push("DoD quotas.authoredHarborScenes must be ≥ 14");
  }

  if (!pkg.scripts?.["harbors1314:validate"]) errors.push("package.json missing harbors1314:validate");
  if (!pkg.scripts?.["harbors1314:smoke"]) errors.push("package.json missing harbors1314:smoke");
  if (!ci.includes("harbors1314:validate")) errors.push("ci.yml missing harbors1314:validate");
  if (!kotlin.includes("NEW_HARBOR_IDS")) errors.push("Kotlin Harbors1314 missing NEW_HARBOR_IDS");
  if (!app.includes("saffron_quay_blockout.glb")) errors.push("App.tsx missing saffron_quay blockout URL");
  if (!app.includes("cobalt_sound_blockout.glb")) errors.push("App.tsx missing cobalt_sound blockout URL");

  if (fixture.setup?.harborsTraveled !== 12) errors.push("fixture setup harborsTraveled must be 12");
  if ((fixture.travels as any[])?.length !== 2) errors.push("fixture travels must be 2");
  if (fixture.expectFinal?.harborId !== "harbor.cobalt_sound") {
    errors.push("fixture expectFinal harbor must be cobalt_sound");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("harbors1314:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK harbors1314:validate — harbors 13–14 + thirteen/fourteen prestige + scenic art ready",
);
