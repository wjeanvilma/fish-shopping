/**
 * Finish 2.0 Phase 14 — fishing mastery readiness.
 *
 * Usage:
 *   npm run mastery:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, MasterySystem, SCHEMA_VERSION } from "../src/engine";
import {
  FISHING_MASTERY,
  FISHING_MASTERY_PHASE,
  FISHING_MASTERY_SCHEMA,
  MASTERY_COACHING_TIP_FLOOR,
  MASTERY_TECHNIQUE_FLOOR,
} from "../src/ship/fishingMastery";
import { SCHEMA_22_VERSION } from "../src/ship/schema22";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/fishing-mastery.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-fishing-mastery.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 14) errors.push(`phase expected 14, got ${catalog.phase}`);
  if (catalog.schema !== FISHING_MASTERY_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (FISHING_MASTERY_PHASE !== 14) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 22) errors.push("catalog schemaVersion must be 22");
  if (SCHEMA_VERSION < 22) errors.push("engine SCHEMA_VERSION must be >= 22");
  if (SCHEMA_22_VERSION !== 22) errors.push("SCHEMA_22_VERSION mismatch");
  if (catalog.techniqueCount !== 3 || MASTERY_TECHNIQUE_FLOOR !== 3) {
    errors.push("techniqueCount must be 3");
  }
  if (catalog.coachingTipCount !== 5 || MASTERY_COACHING_TIP_FLOOR !== 5) {
    errors.push("coachingTipCount must be 5");
  }
  if (dod.quotas?.masteryTechniques !== 3) errors.push("DoD quotas.masteryTechniques must be 3");
  if (dod.quotas?.masteryCoachingTips !== 5) errors.push("DoD quotas.masteryCoachingTips must be 5");
  if (content.fishingMastery.techniques.length < 3) {
    errors.push(`techniques ${content.fishingMastery.techniques.length} < 3`);
  }
  if (content.fishingMastery.coachingTips.length < 5) {
    errors.push(`coachingTips ${content.fishingMastery.coachingTips.length} < 5`);
  }

  if (listing.fishingMasteryPhase !== 14) errors.push("listing.fishingMasteryPhase must be 14");
  if (listing.fishingMasteryCatalog !== "shared/ship/fishing-mastery.json") {
    errors.push("listing.fishingMasteryCatalog mismatch");
  }
  if (!ci.includes("mastery:validate")) errors.push("ci.yml missing mastery:validate");
  if (!ci.includes("schema22:validate")) errors.push("ci.yml missing schema22:validate");
  if (!pin.fixtures?.includes("parity-fishing-mastery.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-fishing-mastery.json");
  }
  if (pin.fishingMastery !== "shared/ship/fishing-mastery.json") {
    errors.push("RELEASE_PIN.fishingMastery path mismatch");
  }
  if (pin.schemaVersion < 22) errors.push("RELEASE_PIN.schemaVersion must be >= 22");

  for (const id of FISHING_MASTERY.techniques) {
    if (!content.techniquesById.has(id)) errors.push(`missing technique ${id}`);
  }
  for (const id of FISHING_MASTERY.coachingTips) {
    if (!content.fishingMastery.coachingTips.some((t) => t.id === id)) {
      errors.push(`missing coaching tip ${id}`);
    }
  }

  const defaultTech = content.fishingMastery.techniques.find((t) => t.requiresMasteryLevel === 0);
  if (!defaultTech || defaultTech.id !== fixture.expectAfterCatch.techniqueId) {
    errors.push(`default technique ≠ ${fixture.expectAfterCatch.techniqueId}`);
  }
  if (MasterySystem.levelForXp(content, 0) < 1) {
    errors.push("levelForXp(0) must be >= 1");
  }

  const masteryKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/fishing/Mastery.kt"),
    "utf8",
  );
  const systemsTs = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const hostTs = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const vmKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const screenKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  if (!masteryKt.includes("object MasterySystem")) errors.push("Kotlin MasterySystem missing");
  if (!systemsTs.includes("export const MasterySystem")) errors.push("web MasterySystem missing");
  if (!hostTs.includes("mastery_level_up")) errors.push("GameHost missing mastery toast");
  if (!vmKt.includes("MasteryLevelUp")) errors.push("GameViewModel missing MasteryLevelUp toast");
  if (!appTsx.includes("masteryLevel")) errors.push("web journal missing mastery");
  if (!screenKt.includes("masteryLevel")) errors.push("Android journal missing mastery");
  if (!appTsx.includes("onSelectTechnique")) errors.push("web missing technique select UI");
  if (!vmKt.includes("fun selectTechnique")) errors.push("Android missing selectTechnique");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("mastery:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK mastery:validate — fishing mastery ready");
