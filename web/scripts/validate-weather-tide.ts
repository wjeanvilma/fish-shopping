/**
 * Finish 2.0 Phase 13 — weather + tide readiness.
 *
 * Usage:
 *   npm run weather:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, WeatherSystem } from "../src/engine";
import {
  TIDE_PHASE_FLOOR,
  WEATHER_PATTERN_FLOOR,
  WEATHER_TIDE,
  WEATHER_TIDE_PHASE,
  WEATHER_TIDE_SCHEMA,
} from "../src/ship/weatherTide";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/weather-tide.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-weather-tide.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 13) errors.push(`phase expected 13, got ${catalog.phase}`);
  if (catalog.schema !== WEATHER_TIDE_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (WEATHER_TIDE_PHASE !== 13) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must be 21");
  if (catalog.weatherPatternCount !== 5 || WEATHER_PATTERN_FLOOR !== 5) {
    errors.push("weatherPatternCount must be 5");
  }
  if (catalog.tidePhaseCount !== 4 || TIDE_PHASE_FLOOR !== 4) {
    errors.push("tidePhaseCount must be 4");
  }
  if (dod.quotas?.weatherPatterns !== 5) {
    errors.push("DoD quotas.weatherPatterns must be 5");
  }
  if (dod.quotas?.tidePhases !== 4) {
    errors.push("DoD quotas.tidePhases must be 4");
  }
  if (content.weather.patterns.length !== 5) {
    errors.push(`weather patterns ${content.weather.patterns.length} ≠ 5`);
  }
  if (content.weather.tide.phases.length !== 4) {
    errors.push(`tide phases ${content.weather.tide.phases.length} ≠ 4`);
  }

  if (listing.weatherTidePhase !== 13) errors.push("listing.weatherTidePhase must be 13");
  if (listing.weatherTideCatalog !== "shared/ship/weather-tide.json") {
    errors.push("listing.weatherTideCatalog mismatch");
  }
  if (!ci.includes("weather:validate")) errors.push("ci.yml missing weather:validate");
  if (!pin.fixtures?.includes("parity-weather-tide.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-weather-tide.json");
  }
  if (pin.weatherTide !== "shared/ship/weather-tide.json") {
    errors.push("RELEASE_PIN.weatherTide path mismatch");
  }

  for (const id of WEATHER_TIDE.patterns) {
    if (!content.weatherPatternsById.has(id)) errors.push(`missing weather ${id}`);
  }
  for (const id of WEATHER_TIDE.tidePhases) {
    if (!content.tidePhasesById.has(id)) errors.push(`missing tide ${id}`);
  }

  const at0 = WeatherSystem.weatherAt(content, 0);
  if (at0.id !== fixture.expectAtTick0.weatherId) {
    errors.push(`tick0 weather ${at0.id} ≠ ${fixture.expectAtTick0.weatherId}`);
  }
  const tide0 = WeatherSystem.tidePhaseAt(content, 0);
  if (tide0.id !== fixture.expectAtTick0.tidePhaseId) {
    errors.push(`tick0 tide ${tide0.id} ≠ ${fixture.expectAtTick0.tidePhaseId}`);
  }

  const weatherKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/world/Weather.kt"),
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
  if (!weatherKt.includes("object WeatherSystem")) errors.push("Kotlin WeatherSystem missing");
  if (!systemsTs.includes("WeatherSystem")) errors.push("web WeatherSystem missing");
  if (!hostTs.includes("weather_changed")) errors.push("GameHost missing weather toast");
  if (!vmKt.includes("WeatherChanged")) errors.push("GameViewModel missing WeatherChanged toast");
  if (!appTsx.includes("weatherName")) errors.push("web HUD missing weather");
  if (!screenKt.includes("weatherName")) errors.push("Android HUD missing weather");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("weather:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK weather:validate — weather + tide ready");
