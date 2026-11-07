/**
 * Finish 2.0 Phase 11 — achievements engine readiness.
 *
 * Usage:
 *   npm run achievements:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/engine";
import {
  ACHIEVEMENT_COUNT_FLOOR,
  ACHIEVEMENTS_SHIP,
  ACHIEVEMENTS_SHIP_PHASE,
  ACHIEVEMENTS_SHIP_SCHEMA,
} from "../src/ship/achievements";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/achievements.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-achievements.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 11) errors.push(`phase expected 11, got ${catalog.phase}`);
  if (catalog.schema !== ACHIEVEMENTS_SHIP_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (ACHIEVEMENTS_SHIP_PHASE !== 11) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must be 21");
  if (catalog.achievementCount !== 14 || ACHIEVEMENT_COUNT_FLOOR !== 14) {
    errors.push("achievementCount must be 14");
  }
  if (dod.quotas?.achievements !== 14) {
    errors.push("DoD quotas.achievements must be 14");
  }
  if (!Array.isArray(dod.screensPresent) || !dod.screensPresent.includes("achievements")) {
    errors.push("DoD screensPresent must include achievements");
  }
  if (content.achievements.entries.length !== 14) {
    errors.push(`content achievements ${content.achievements.entries.length} ≠ 14`);
  }

  if (listing.achievementsPhase !== 11) errors.push("listing.achievementsPhase must be 11");
  if (listing.achievementsCatalog !== "shared/ship/achievements.json") {
    errors.push("listing.achievementsCatalog mismatch");
  }
  if (!ci.includes("achievements:validate")) errors.push("ci.yml missing achievements:validate");
  if (!pin.fixtures?.includes("parity-achievements.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-achievements.json");
  }
  if (pin.achievements !== "shared/ship/achievements.json") {
    errors.push("RELEASE_PIN.achievements path mismatch");
  }

  const byId = new Map(content.achievements.entries.map((a) => [a.id, a]));
  for (const entry of ACHIEVEMENTS_SHIP.entries) {
    const a = byId.get(entry.id);
    if (!a) {
      errors.push(`missing achievement ${entry.id}`);
      continue;
    }
    if (a.category !== entry.category) errors.push(`${entry.id} category mismatch`);
    if (a.goal.stat !== entry.goalStat) errors.push(`${entry.id} goalStat mismatch`);
    if (a.goal.atLeast !== entry.goalAtLeast) errors.push(`${entry.id} goalAtLeast mismatch`);
    if (a.rewardCoins !== entry.rewardCoins) errors.push(`${entry.id} rewardCoins mismatch`);
  }

  if (fixture.expect?.achievementCount !== 14) {
    errors.push("fixture expect.achievementCount must be 14");
  }
  if (!Array.isArray(fixture.expect?.unlocked) || fixture.expect.unlocked.length < 2) {
    errors.push("fixture must unlock at least two achievements");
  }

  const systemsTs = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const achievementsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/Achievements.kt"),
    "utf8",
  );
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
  if (!systemsTs.includes("AchievementSystem")) errors.push("web systems missing AchievementSystem");
  if (!achievementsKt.includes("object AchievementSystem")) {
    errors.push("Kotlin AchievementSystem missing");
  }
  if (!hostTs.includes("achievement_unlocked")) errors.push("GameHost missing achievement toast");
  if (!vmKt.includes("AchievementUnlocked")) errors.push("GameViewModel missing AchievementUnlocked toast");
  if (!appTsx.includes("AchievementsPanel")) errors.push("web Settings achievements screen missing");
  if (!screenKt.includes("AchievementsPanel")) errors.push("Android Settings achievements screen missing");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("achievements:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK achievements:validate — achievements engine ready");
