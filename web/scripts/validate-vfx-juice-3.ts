/**
 * Finish 3.0 Phase 24 — VFX/juice 3 readiness under the perf budget gate.
 *
 * Usage:
 *   npm run vfx3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  EVENT_BURST_FLOOR_3,
  EVENT_SHAKE_FLOOR_3,
  TIDE_AMBIENT_FLOOR,
  VFX_JUICE_3,
  VFX_JUICE_3_MARKER,
  VFX_JUICE_3_PHASE,
  VFX_JUICE_3_SCHEMA,
} from "../src/ship/vfxJuice3";
import {
  TIDE_AMBIENT_PHASE_IDS,
  tideAmbientIdForPhaseId,
} from "../src/render/weatherAmbient";
import {
  MAX_SHAKE_AMPLITUDE_M,
  SHAKE_AMPLITUDE_M,
  cappedShakeAmplitudeM,
} from "../src/render/presenters";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/vfx-juice-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-vfx-juice-3.json"));
  const gate = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const v1 = readJson(resolve(root, "shared/perf/vfx-juice.json"));
  const juice2 = readJson(resolve(root, "shared/ship/vfx-juice-2.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
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
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/VfxJuice3.kt"),
    "utf8",
  );

  if (catalog.phase !== 24) errors.push(`phase expected 24, got ${catalog.phase}`);
  if (catalog.schema !== VFX_JUICE_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (VFX_JUICE_3_PHASE !== 24) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.vfxJuice3Marker !== VFX_JUICE_3_MARKER) errors.push("marker mismatch");
  if (fixture.vfxJuice3Marker !== VFX_JUICE_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.extendsCatalog !== "shared/perf/vfx-juice.json") {
    errors.push("extendsCatalog must point at post-1.0 vfx-juice");
  }
  if (catalog.extendsJuice2Catalog !== "shared/ship/vfx-juice-2.json") {
    errors.push("extendsJuice2Catalog mismatch");
  }
  if (catalog.eventBurstMin !== 6 || EVENT_BURST_FLOOR_3 !== 6) {
    errors.push("eventBurstMin must be 6");
  }
  if (catalog.eventShakeMin !== 2 || EVENT_SHAKE_FLOOR_3 !== 2) {
    errors.push("eventShakeMin must be 2");
  }
  if (catalog.tideAmbientMin !== 4 || TIDE_AMBIENT_FLOOR !== 4) {
    errors.push("tideAmbientMin must be 4");
  }

  if (v1.phase !== 21) errors.push("vfx-juice.json phase must stay 21");
  if (juice2.phase !== 22) errors.push("vfx-juice-2 phase must stay 22");
  if (gate.vfxJuicePhase !== 21) errors.push("budget-gate.vfxJuicePhase must stay 21");
  if (gate.vfxJuice2Phase !== 22) errors.push("budget-gate.vfxJuice2Phase must stay 22");
  if (gate.vfxJuice3Phase !== 24) errors.push("budget-gate.vfxJuice3Phase must be 24");
  if (gate.vfxJuice3Catalog !== "shared/ship/vfx-juice-3.json") {
    errors.push("budget-gate.vfxJuice3Catalog mismatch");
  }
  if (gate.maxShakeAmplitudeM !== 0.12) errors.push("maxShakeAmplitudeM must stay 0.12");
  if (catalog.eventShake.maxAmplitudeM !== gate.maxShakeAmplitudeM) {
    errors.push("eventShake.maxAmplitudeM must match budget-gate");
  }
  if (MAX_SHAKE_AMPLITUDE_M !== 0.12) errors.push("presenter MAX_SHAKE_AMPLITUDE_M drifted");
  for (const q of ["low", "medium", "high"] as const) {
    if (catalog.eventShake.scaleByQuality[q] !== gate.shakeScale[q]) {
      errors.push(`eventShake.scaleByQuality.${q} must match budget-gate`);
    }
    if (gate.presenterCaps.burst[q] !== v1.bursts.poolByQuality[q]) {
      errors.push(`presenterCaps.burst.${q} drifted from vfx-juice`);
    }
  }

  const burstKinds = catalog.eventBursts.kinds as string[];
  for (const need of fixture.expect.eventBursts as string[]) {
    if (!burstKinds.includes(need)) errors.push(`missing event burst kind ${need}`);
  }
  if (burstKinds.length < 6) errors.push("eventBursts.kinds must have ≥6");
  if (!catalog.eventBursts.sharesBurstPool) errors.push("sharesBurstPool must be true");
  if (catalog.ambientTide.consumesBurstPool) {
    errors.push("ambientTide must not consume burst pool");
  }

  const shakeKinds = catalog.eventShake.kinds as string[];
  for (const need of fixture.expect.eventShake as string[]) {
    if (!shakeKinds.includes(need)) errors.push(`missing event shake kind ${need}`);
    if ((SHAKE_AMPLITUDE_M as any)[need] == null) {
      errors.push(`presenter SHAKE_AMPLITUDE_M missing ${need}`);
    }
    if (cappedShakeAmplitudeM(need as any, "high") > MAX_SHAKE_AMPLITUDE_M) {
      errors.push(`${need} shake exceeds max under high quality`);
    }
  }

  const phases = catalog.ambientTide.phases as string[];
  for (const need of fixture.expect.tidePhases as string[]) {
    if (!phases.includes(need)) errors.push(`missing tide phase ${need}`);
  }
  if (phases.length < 4) errors.push("ambientTide.phases must have ≥4");
  for (const id of TIDE_AMBIENT_PHASE_IDS) {
    if (!phases.includes(id)) errors.push(`runtime missing tide phase ${id}`);
  }
  if (tideAmbientIdForPhaseId("night") !== "night") {
    errors.push("tideAmbientIdForPhaseId(night) mismatch");
  }
  if (tideAmbientIdForPhaseId("dusk") !== "dusk") {
    errors.push("tideAmbientIdForPhaseId(dusk) mismatch");
  }

  if ((dod.quotas?.vfxJuice3BurstKinds ?? 0) < 6) {
    errors.push("DoD quotas.vfxJuice3BurstKinds must be ≥ 6");
  }
  if ((dod.quotas?.vfxJuice3ShakeKinds ?? 0) < 2) {
    errors.push("DoD quotas.vfxJuice3ShakeKinds must be ≥ 2");
  }
  if ((dod.quotas?.tideAmbientPhases ?? 0) < 4) {
    errors.push("DoD quotas.tideAmbientPhases must be ≥ 4");
  }
  if (listing.vfxJuice3Phase !== 24) errors.push("listing.vfxJuice3Phase must be 24");
  if (listing.vfxJuice3Catalog !== "shared/ship/vfx-juice-3.json") {
    errors.push("listing.vfxJuice3Catalog mismatch");
  }
  if (!pkg.scripts?.["vfx3:validate"]) errors.push("package.json missing vfx3:validate");
  if (!ci.includes("vfx3:validate")) errors.push("ci.yml missing vfx3:validate");
  if (!pin.fixtures?.includes("parity-vfx-juice-3.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-vfx-juice-3.json");
  }
  if (pin.vfxJuice3 !== "shared/ship/vfx-juice-3.json") {
    errors.push("RELEASE_PIN.vfxJuice3 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be ≥ 24");

  for (const kind of [
    "rival_beat",
    "prestige",
    "trophy_set",
    "harbor_travel",
    "hire",
    "loan",
  ]) {
    if (!webPr.includes(`"${kind}"`)) errors.push(`web presenters missing burst kind ${kind}`);
  }
  if (!webPr.includes('"rival_beat"') || !webPr.includes('"prestige"')) {
    errors.push("web presenters missing pack-3 shake kinds");
  }
  for (const enumName of [
    "RIVAL_BEAT",
    "PRESTIGE",
    "TROPHY_SET",
    "HARBOR_TRAVEL",
    "HIRE",
    "LOAN",
  ]) {
    if (!androidPr.includes(enumName)) {
      errors.push(`Android presenters missing ${enumName}`);
    }
  }
  if (!host.includes("resolveRivalBeatBurst") || !host.includes("resolvePrestigeBurst")) {
    errors.push("GameHost must emit rival/prestige bursts");
  }
  if (!host.includes("resolveTrophySetBurst") || !host.includes("resolveHarborTravelBurst")) {
    errors.push("GameHost must emit trophy/travel bursts");
  }
  if (!host.includes("resolveHireBurst") || !host.includes("resolveLoanBurst")) {
    errors.push("GameHost must emit hire/loan bursts");
  }
  if (!vm.includes("resolveRivalBeatBurst") || !vm.includes("resolvePrestigeBurst")) {
    errors.push("GameViewModel must emit rival/prestige bursts");
  }
  if (!vm.includes("resolveTrophySetBurst") || !vm.includes("resolveHarborTravelBurst")) {
    errors.push("GameViewModel must emit trophy/travel bursts");
  }
  if (!vm.includes("resolveHireBurst") || !vm.includes("resolveLoanBurst")) {
    errors.push("GameViewModel must emit hire/loan bursts");
  }
  if (!webScene.includes("tidePhaseId") || !webScene.includes("rivalPressureActive")) {
    errors.push("HarborScene must pass tide/rival into weatherAmbientProfile");
  }
  if (!androidRenderer.includes("tidePhaseId") || !androidRenderer.includes("rivalPressureActive")) {
    errors.push("HarborRenderer must pass tide/rival into weatherAmbientProfile");
  }
  if (!ambientTs.includes("Finish 3.0 Phase 24") || !ambientTs.includes("TIDE_AMBIENT_PHASE_IDS")) {
    errors.push("weatherAmbient.ts missing Finish 3.0 Phase 24 tide ambient");
  }
  if (!ambientKt.includes("Finish 3.0 Phase 24") || !ambientKt.includes("TIDE_AMBIENT_PHASE_IDS")) {
    errors.push("WeatherAmbient.kt missing Finish 3.0 Phase 24 tide ambient");
  }

  const phase24 = (kickoff.phases as any[])?.find((p: any) => p.phase === 24);
  if (!phase24 || phase24.validate !== "vfx3:validate") {
    errors.push("kickoff phase 24 validate must be vfx3:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 24) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 24");
  }
  if (!finish3Kt.includes("vfx3:validate")) {
    errors.push("Finish3Kickoff.kt phase 24 missing vfx3:validate");
  }
  if (!kotlin.includes("EVENT_BURST_MIN") || !kotlin.includes("TIDE_PHASES")) {
    errors.push("Kotlin VfxJuice3 missing constants");
  }

  const block = dod.vfxJuice3;
  if (!block) errors.push("DoD missing vfxJuice3 block");
  else {
    if (block.phase !== 24) errors.push("DoD vfxJuice3.phase must be 24");
    if (block.plan !== "30_finish_3.0") errors.push("DoD vfxJuice3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD vfxJuice3.status must be complete");
    if (block.vfxJuice3Marker !== VFX_JUICE_3_MARKER) {
      errors.push("DoD vfxJuice3 marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  for (const [event, map] of Object.entries(fixture.expect.eventMap as Record<string, any>)) {
    const cat = catalog.eventMap[event];
    if (!cat) {
      errors.push(`catalog missing eventMap.${event}`);
      continue;
    }
    if (map.burst && cat.burst !== map.burst) errors.push(`eventMap.${event}.burst mismatch`);
    if (map.shake && cat.shake !== map.shake) errors.push(`eventMap.${event}.shake mismatch`);
  }

  if (VFX_JUICE_3.eventBursts.kinds.length < EVENT_BURST_FLOOR_3) {
    errors.push("VFX_JUICE_3 eventBursts below floor");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("vfx3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK vfx3:validate — Finish 3.0 juice under budget-gate");
