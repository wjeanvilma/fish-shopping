/**
 * Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness readiness.
 *
 * Usage:
 *   npm run presenterharness:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { PRESENTER_CPU_STAGES, PresenterCpuHarness, presenterCpuSnapshotFrom } from "../src/render/presenterCpuSnapshot";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PRESENTER_HARNESS,
  PRESENTER_HARNESS_MARKER,
  PRESENTER_HARNESS_PHASE,
  PRESENTER_HARNESS_SCHEMA,
  measurePresenterHarness,
} from "../src/ship/presenterHarness";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/presenter-harness.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-presenter-harness.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/PresenterHarness.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const androidHarness = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresenterCpuSnapshot.kt"),
    "utf8",
  );

  if (catalog.phase !== 21) errors.push(`phase expected 21, got ${catalog.phase}`);
  if (catalog.schema !== PRESENTER_HARNESS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (PRESENTER_HARNESS_PHASE !== 21) errors.push("phase mirror mismatch");
  if (catalog.presenterHarnessMarker !== PRESENTER_HARNESS_MARKER) errors.push("marker mismatch");
  if (fixture.presenterHarnessMarker !== PRESENTER_HARNESS_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");

  const measure = measurePresenterHarness(root);
  if (measure.stageCount < PRESENTER_HARNESS.stageMin) {
    errors.push(`stages ${measure.stageCount} < ${PRESENTER_HARNESS.stageMin}`);
  }
  if (measure.snapshotFieldCount < PRESENTER_HARNESS.snapshotFieldMin) {
    errors.push(`snapshot fields ${measure.snapshotFieldCount} < ${PRESENTER_HARNESS.snapshotFieldMin}`);
  }
  if (!measure.requiredFilesPresent) errors.push("required harness files missing");
  if (!measure.symbolsPresent) {
    for (const s of measure.missingSymbols.slice(0, 12)) errors.push(`missing symbol ${s}`);
  }
  if (!measure.nestStagePresent) errors.push("nestHud stage missing from catalog/runtime");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 21 must set id=presenter-harness validate=presenterharness:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.presenterHarnessMissing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (PRESENTER_CPU_STAGES.length < 6) errors.push("PRESENTER_CPU_STAGES must list ≥6");
  if (!PRESENTER_CPU_STAGES.includes("nestHud")) errors.push("PRESENTER_CPU_STAGES missing nestHud");

  // Live harness smoke (pure, no GL).
  const harness = new PresenterCpuHarness({ nowMs: (() => {
    let t = 0;
    return () => {
      t += 1;
      return t;
    };
  })() });
  harness.beginStage("crowd");
  harness.endStage("crowd");
  harness.recordStageMs("nestHud", 0.4);
  harness.setNestHudPressurePermille(250);
  harness.sampleFrame(0.02, "medium");
  const snap = harness.snapshot();
  if (snap.sampleCount < 1) errors.push("harness sampleCount must grow");
  if (snap.nestHudPressurePermille !== 250) errors.push("nestHudPressurePermille not applied");
  if (snap.stageMs.nestHud < 0.4) errors.push("nestHud stage ms not recorded");
  if (snap.harborCacheLimit < 3) errors.push("snapshot harborCacheLimit soft-floor ≥3");
  const pure = presenterCpuSnapshotFrom({
    lastFrameMs: 20,
    emaFrameMs: 18,
    targetMs: 16.7,
    budgetAction: "hold",
    quality: "high",
    sampleCount: 2,
    stageMs: { nestHud: 1 },
    nestHudPressurePermille: 100,
  });
  if (!pure.overBudget) errors.push("pure snapshot should flag overBudget for 20ms@16.7");
  if (pure.caps.fly < 4) errors.push("pure snapshot caps.fly soft-floor");

  if (!androidHarness.includes("NEST_HUD")) errors.push("Android harness missing NEST_HUD");
  if (!androidHarness.includes("PresenterCpuHarness")) {
    errors.push("Android PresenterCpuHarness missing");
  }

  if (kickoff.gaps?.presenterHarnessMissing !== false) {
    errors.push("kickoff.gaps.presenterHarnessMissing must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("presenterHarnessMissing")) {
    errors.push("OPEN_GAP_FLAGS must drop presenterHarnessMissing after Phase 21");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("presenterHarnessMissing")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop presenterHarnessMissing");
  }
  const phase21 = (kickoff.phases as any[])?.find((p) => p.phase === 21);
  if (!phase21) errors.push("kickoff missing phase 21");
  else if (phase21.validate !== "presenterharness:validate") {
    errors.push("kickoff phase 21 validate must be presenterharness:validate");
  }
  if (phase21?.id !== "presenter-harness") errors.push("kickoff phase 21 id mismatch");

  if (listing.presenterHarnessPhase !== 21) {
    errors.push("listing.presenterHarnessPhase must be 21");
  }
  if (listing.presenterHarnessCatalog !== "shared/ship/presenter-harness.json") {
    errors.push("listing.presenterHarnessCatalog mismatch");
  }

  const block = dod.presenterHarness;
  if (!block) errors.push("DoD missing presenterHarness block");
  else {
    if (block.phase !== 21) errors.push("DoD presenterHarness.phase must be 21");
    if (block.status !== "complete") errors.push("DoD presenterHarness.status must be complete");
    if (block.presenterHarnessMarker !== PRESENTER_HARNESS_MARKER) {
      errors.push("DoD presenterHarness marker mismatch");
    }
  }

  if (!pkg.scripts?.["presenterharness:validate"]) {
    errors.push("package.json missing presenterharness:validate");
  }
  if (!ci.includes("presenterharness:validate")) {
    errors.push("ci.yml missing presenterharness:validate");
  }
  if (!kotlin.includes("STAGES")) errors.push("Kotlin PresenterHarness missing STAGES");
  if (!kotlin.includes("nestHud")) errors.push("Kotlin PresenterHarness missing nestHud");
  if (!finish6Kt.includes("presenterharness:validate")) {
    errors.push("Finish6Kickoff.kt phase 21 missing presenterharness:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_presenter_harness.py"))) {
    errors.push("missing author_presenter_harness.py");
  }
  if (pin.presenterHarness !== "shared/ship/presenter-harness.json") {
    errors.push("RELEASE_PIN.presenterHarness path mismatch");
  }
  if (!pin.fixtures?.includes("parity-presenter-harness.json")) {
    errors.push("RELEASE_PIN missing parity-presenter-harness.json");
  }
  if (fixture.expect?.stageMin !== 6) errors.push("parity stageMin must be 6");
  if (fixture.expect?.snapshotFieldMin !== 11) errors.push("parity snapshotFieldMin must be 11");
  if (fixture.expect?.presenterHarnessMissing !== false) {
    errors.push("parity presenterHarnessMissing must be false");
  }
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 21");
  }
  if ((catalog.stages?.length ?? 0) < 6) errors.push("catalog stages must list ≥6");
  if ((catalog.snapshotFields?.length ?? 0) < 11) {
    errors.push("catalog snapshotFields must list ≥11");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("presenterharness:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK presenterharness:validate — presenter/render CPU snapshot harness wired");
