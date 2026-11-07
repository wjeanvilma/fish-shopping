/**
 * Finish 2.0 Phase 22 — VFX/juice 2 readiness under the perf budget gate.
 *
 * Usage:
 *   npm run vfx2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  EVENT_BURST_FLOOR,
  EVENT_SHAKE_FLOOR,
  VFX_JUICE_2,
  VFX_JUICE_2_MARKER,
  VFX_JUICE_2_PHASE,
  VFX_JUICE_2_SCHEMA,
  WEATHER_AMBIENT_FLOOR,
} from "../src/ship/vfxJuice2";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import { WEATHER_AMBIENT_PATTERN_IDS, weatherAmbientIdForWeatherId } from "../src/render/weatherAmbient";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/vfx-juice-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-vfx-juice-2.json"));
  const gate = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const v1 = readJson(resolve(root, "shared/perf/vfx-juice.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const webPr = readFileSync(resolve(root, "web/src/render/presenters.ts"), "utf8");
  const androidPr = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Presenters.kt"),
    "utf8",
  );
  const webScene = readFileSync(resolve(root, "web/src/render/HarborScene.ts"), "utf8");
  const androidRenderer = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRenderer.kt"),
    "utf8",
  );
  const host = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const vm = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const ambientTs = readFileSync(resolve(root, "web/src/render/weatherAmbient.ts"), "utf8");
  const ambientKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/WeatherAmbient.kt"),
    "utf8",
  );

  if (catalog.phase !== 22) errors.push(`phase expected 22, got ${catalog.phase}`);
  if (catalog.schema !== VFX_JUICE_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (VFX_JUICE_2_PHASE !== 22) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.vfxJuice2Marker !== VFX_JUICE_2_MARKER) errors.push("marker mismatch");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsCatalog !== "shared/perf/vfx-juice.json") {
    errors.push("extendsCatalog must point at post-1.0 vfx-juice");
  }
  if (catalog.eventBurstMin !== 4 || EVENT_BURST_FLOOR !== 4) errors.push("eventBurstMin must be 4");
  if (catalog.eventShakeMin !== 2 || EVENT_SHAKE_FLOOR !== 2) errors.push("eventShakeMin must be 2");
  if (catalog.weatherAmbientMin !== 5 || WEATHER_AMBIENT_FLOOR !== 5) {
    errors.push("weatherAmbientMin must be 5");
  }

  // Post-1.0 catalogs keep their phase numbers.
  if (v1.phase !== 21) errors.push("vfx-juice.json phase must stay 21");
  if (gate.vfxJuicePhase !== 21) errors.push("budget-gate.vfxJuicePhase must stay 21");
  if (gate.vfxJuice2Phase !== 22) errors.push("budget-gate.vfxJuice2Phase must be 22");
  if (gate.vfxJuice2Catalog !== "shared/ship/vfx-juice-2.json") {
    errors.push("budget-gate.vfxJuice2Catalog mismatch");
  }
  if (gate.maxShakeAmplitudeM !== 0.12) errors.push("maxShakeAmplitudeM must stay 0.12");
  if (catalog.eventShake.maxAmplitudeM !== gate.maxShakeAmplitudeM) {
    errors.push("eventShake.maxAmplitudeM must match budget-gate");
  }
  for (const q of ["low", "medium", "high"] as const) {
    if (catalog.eventShake.scaleByQuality[q] !== gate.shakeScale[q]) {
      errors.push(`eventShake.scaleByQuality.${q} must match budget-gate`);
    }
    // Pack 2 must not change presenter caps.
    if (gate.presenterCaps.burst[q] !== v1.bursts.poolByQuality[q]) {
      errors.push(`presenterCaps.burst.${q} drifted from vfx-juice`);
    }
  }

  const burstKinds = catalog.eventBursts.kinds as string[];
  for (const need of fixture.expect.eventBursts as string[]) {
    if (!burstKinds.includes(need)) errors.push(`missing event burst kind ${need}`);
  }
  if (burstKinds.length < 4) errors.push("eventBursts.kinds must have ≥4");
  if (!catalog.eventBursts.sharesBurstPool) errors.push("sharesBurstPool must be true");
  if (catalog.ambientWeather.consumesBurstPool) {
    errors.push("ambientWeather must not consume burst pool");
  }

  const shakeKinds = catalog.eventShake.kinds as string[];
  for (const need of fixture.expect.eventShake as string[]) {
    if (!shakeKinds.includes(need)) errors.push(`missing event shake kind ${need}`);
  }

  const patterns = catalog.ambientWeather.patterns as string[];
  for (const need of fixture.expect.weatherPatterns as string[]) {
    if (!patterns.includes(need)) errors.push(`missing weather pattern ${need}`);
  }
  if (patterns.length < 5) errors.push("ambientWeather.patterns must have ≥5");
  for (const id of WEATHER_AMBIENT_PATTERN_IDS) {
    if (!patterns.includes(id)) errors.push(`runtime missing pattern ${id}`);
  }
  if (weatherAmbientIdForWeatherId("weather.rain") !== "rain") {
    errors.push("weatherAmbientIdForWeatherId(rain) mismatch");
  }
  if (weatherAmbientIdForWeatherId("weather.gale") !== "gale") {
    errors.push("weatherAmbientIdForWeatherId(gale) mismatch");
  }

  if ((dod.quotas?.vfxJuice2BurstKinds ?? 0) < 4) {
    errors.push("DoD quotas.vfxJuice2BurstKinds must be ≥ 4");
  }
  if ((dod.quotas?.vfxJuice2ShakeKinds ?? 0) < 2) {
    errors.push("DoD quotas.vfxJuice2ShakeKinds must be ≥ 2");
  }
  if ((dod.quotas?.weatherAmbientPatterns ?? 0) < 5) {
    errors.push("DoD quotas.weatherAmbientPatterns must be ≥ 5");
  }
  if (listing.vfxJuice2Phase !== 22) errors.push("listing.vfxJuice2Phase must be 22");
  if (listing.vfxJuice2Catalog !== "shared/ship/vfx-juice-2.json") {
    errors.push("listing.vfxJuice2Catalog mismatch");
  }
  if (!ci.includes("vfx2:validate")) errors.push("ci.yml missing vfx2:validate");
  if (!pin.fixtures?.includes("parity-vfx-juice-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-vfx-juice-2.json");
  }
  if (pin.vfxJuice2 !== "shared/ship/vfx-juice-2.json") {
    errors.push("RELEASE_PIN.vfxJuice2 path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  // Presenter + host wiring.
  for (const kind of ["achievement", "festival", "contract_done", "goal_claim"]) {
    if (!webPr.includes(`"${kind}"`)) errors.push(`web presenters missing burst kind ${kind}`);
  }
  if (!webPr.includes('"achievement"') || !webPr.includes("ShakeKind")) {
    errors.push("web presenters missing achievement shake");
  }
  if (!androidPr.includes("ACHIEVEMENT") || !androidPr.includes("FESTIVAL")) {
    errors.push("Android presenters missing ACHIEVEMENT/FESTIVAL");
  }
  if (!androidPr.includes("CONTRACT_DONE") || !androidPr.includes("GOAL_CLAIM")) {
    errors.push("Android presenters missing CONTRACT_DONE/GOAL_CLAIM");
  }
  if (!host.includes("resolveAchievementBurst") || !host.includes("resolveFestivalBurst")) {
    errors.push("GameHost must emit achievement/festival bursts");
  }
  if (!host.includes("resolveContractDoneBurst") || !host.includes("resolveGoalClaimBurst")) {
    errors.push("GameHost must emit contract/goal bursts");
  }
  if (!vm.includes("resolveAchievementBurst") || !vm.includes("resolveFestivalBurst")) {
    errors.push("GameViewModel must emit achievement/festival bursts");
  }
  if (!vm.includes("resolveContractDoneBurst") || !vm.includes("resolveGoalClaimBurst")) {
    errors.push("GameViewModel must emit contract/goal bursts");
  }
  if (!webScene.includes("weatherAmbientProfile")) {
    errors.push("HarborScene must apply weatherAmbientProfile");
  }
  if (!androidRenderer.includes("weatherAmbientProfile")) {
    errors.push("HarborRenderer must apply weatherAmbientProfile");
  }
  if (!ambientTs.includes("Finish 2.0 Phase 22")) {
    errors.push("weatherAmbient.ts missing Finish 2.0 Phase 22 marker");
  }
  if (!ambientKt.includes("Finish 2.0 Phase 22")) {
    errors.push("WeatherAmbient.kt missing Finish 2.0 Phase 22 marker");
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  // Event map parity.
  for (const [event, map] of Object.entries(fixture.expect.eventMap as Record<string, any>)) {
    const cat = catalog.eventMap[event];
    if (!cat) {
      errors.push(`catalog missing eventMap.${event}`);
      continue;
    }
    if (map.burst && cat.burst !== map.burst) errors.push(`eventMap.${event}.burst mismatch`);
    if (map.shake && cat.shake !== map.shake) errors.push(`eventMap.${event}.shake mismatch`);
  }

  if (VFX_JUICE_2.eventBursts.kinds.length < EVENT_BURST_FLOOR) {
    errors.push("VFX_JUICE_2 eventBursts below floor");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("vfx2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK vfx2:validate — weather/festival/achievement juice under budget-gate");
