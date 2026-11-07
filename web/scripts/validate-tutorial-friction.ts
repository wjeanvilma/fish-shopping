/**
 * Phase 22 (post-1.0) — tutorial friction readiness (copy + dwell nudges only).
 *
 * Usage:
 *   npm run tutorial:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function advanceKey(advance: Record<string, unknown>): string {
  const kind = String(advance.kind ?? "");
  if (kind === "enter_zone") return `enter_zone:${advance.zone}`;
  if (kind === "stat") return `stat:${advance.stat}:${advance.atLeast}`;
  return JSON.stringify(advance);
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/content/tutorial-friction.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const webHelper = readFileSync(resolve(root, "web/src/engine/tutorialFriction.ts"), "utf8");
  const kotlinHelper = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/TutorialFriction.kt"),
    "utf8",
  );
  const webCoach = readFileSync(resolve(root, "web/src/engine/coaching.ts"), "utf8");
  const kotlinCoach = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Coaching.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const hud = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 22) errors.push(`phase expected 22, got ${catalog.phase}`);
  if (catalog.schema !== "fish.content.tutorial_friction.v1") errors.push("bad schema");
  if (catalog.contentVersion !== "1.0.0") {
    errors.push("tutorial-friction catalog records Phase 22 freeze at content 1.0.0");
  }
  if (catalog.schemaVersion !== 20) errors.push("schemaVersion must stay 20");
  // Phase 23 may bump live pack/pin; Phase 22 only froze advanceOn + copy at 1.0.0.
  if (pack.contentVersion !== "1.0.0" && pack.contentVersion !== "1.0.1") {
    errors.push(`unexpected content-pack version ${pack.contentVersion}`);
  }
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  if (pin.schemaVersion !== 20) errors.push("RELEASE_PIN schemaVersion must stay 20");
  if (pin.contentVersion !== pack.contentVersion) {
    errors.push(`RELEASE_PIN contentVersion ${pin.contentVersion} ≠ pack ${pack.contentVersion}`);
  }

  const constraints = catalog.constraints ?? {};
  for (const key of [
    "noSchemaBreak",
    "noAdvanceOnChanges",
    "noStepIdChanges",
    "noContentVersionBump",
  ]) {
    if (constraints[key] !== true) errors.push(`constraints.${key} must be true`);
  }

  const tutorial = pack.tutorial as Array<{
    id: string;
    text: string;
    advanceOn: Record<string, unknown>;
  }>;
  if (!Array.isArray(tutorial) || tutorial.length < 8) {
    errors.push("content-pack tutorial missing or too short");
    return errors;
  }

  const byId = new Map(tutorial.map((s) => [s.id, s]));
  const patches = catalog.copyPatches as Array<{ stepId: string; text: string }>;
  if (patches.length !== tutorial.length) {
    errors.push(`copyPatches length ${patches.length} ≠ tutorial ${tutorial.length}`);
  }
  for (const p of patches) {
    const step = byId.get(p.stepId);
    if (!step) {
      errors.push(`copyPatch unknown step ${p.stepId}`);
      continue;
    }
    if (step.text !== p.text) {
      errors.push(`content-pack text mismatch for ${p.stepId}`);
    }
  }

  const frozen = catalog.frozenAdvanceOn as Record<string, Record<string, unknown>>;
  for (const step of tutorial) {
    const pin = frozen[step.id];
    if (!pin) {
      errors.push(`frozenAdvanceOn missing ${step.id}`);
      continue;
    }
    if (advanceKey(pin) !== advanceKey(step.advanceOn)) {
      errors.push(`advanceOn drifted for ${step.id} (Phase 22 forbids trigger changes)`);
    }
  }
  for (const id of Object.keys(frozen)) {
    if (!byId.has(id)) errors.push(`frozenAdvanceOn unknown step ${id}`);
  }

  const high = catalog.funnel?.highFrictionStepIds as string[];
  if (!Array.isArray(high) || high.length < 5) {
    errors.push("funnel.highFrictionStepIds need ≥5 steps");
  }
  const nudges = catalog.timing?.nudges as Array<{
    stepId: string;
    hintAfterMs: number;
    nudge: string;
  }>;
  if (!Array.isArray(nudges) || nudges.length < 5) {
    errors.push("timing.nudges need ≥5 entries");
  }
  for (const id of high ?? []) {
    if (!byId.has(id)) errors.push(`highFriction unknown step ${id}`);
    if (!(nudges ?? []).some((n) => n.stepId === id)) {
      errors.push(`missing dwell nudge for high-friction ${id}`);
    }
  }
  for (const n of nudges ?? []) {
    if (!n.nudge?.startsWith("Tip:")) errors.push(`nudge for ${n.stepId} should start with Tip:`);
    if (!(n.hintAfterMs > 0)) errors.push(`hintAfterMs for ${n.stepId}`);
    if (!kotlinHelper.includes(n.stepId) || !kotlinHelper.includes(n.nudge)) {
      errors.push(`TutorialFriction.kt missing nudge for ${n.stepId}`);
    }
  }

  if (!webHelper.includes("frictionNudgeText")) errors.push("web helper missing frictionNudgeText");
  if (!kotlinHelper.includes("fun nudgeText")) errors.push("Kotlin helper missing nudgeText");
  if (!webCoach.includes("tutorialStepId")) errors.push("web coaching missing tutorialStepId");
  if (!kotlinCoach.includes("tutorialStepId")) errors.push("Kotlin coaching missing tutorialStepId");
  if (!app.includes("frictionNudgeText") || !app.includes("tutorialDwellMs")) {
    errors.push("App.tsx must wire dwell friction nudges");
  }
  if (!hud.includes("TutorialFriction.nudgeText") || !hud.includes("tutorialDwellMs")) {
    errors.push("GameScreen.kt must wire dwell friction nudges");
  }
  if (!ci.includes("tutorial:validate")) errors.push("ci.yml missing tutorial:validate");

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("tutorial:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK tutorial:validate — copy/timing friction only; advanceOn frozen");
