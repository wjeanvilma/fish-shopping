/**
 * Finish 3.0 Phase 4 — shared shell controller readiness.
 *
 * Usage:
 *   npm run shellctrl:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  measureShellController,
  SHELL_CONTROLLER,
  SHELL_CONTROLLER_MARKER,
  SHELL_CONTROLLER_PHASE,
  SHELL_CONTROLLER_SCHEMA,
} from "../src/ship/shellController";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/shell-controller.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-shell-controller.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ShellController.kt",
    ),
    "utf8",
  );
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 4) errors.push(`phase expected 4, got ${catalog.phase}`);
  if (catalog.schema !== SHELL_CONTROLLER_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (SHELL_CONTROLLER_PHASE !== 4) errors.push("phase mirror mismatch");
  if (catalog.shellControllerMarker !== SHELL_CONTROLLER_MARKER) errors.push("marker mismatch");
  if (fixture.shellControllerMarker !== SHELL_CONTROLLER_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.panelCount !== 12) errors.push("panelCount must be 12");
  if ((catalog.panelWires as string[]).length !== 12) errors.push("panelWires must list 12");

  const measure = measureShellController(root);
  if (!measure.panelWiresMatch) errors.push("panel wires ≠ SHELL_PANEL_IDS");
  if (!measure.hudIntervalMatch) errors.push("hud publish interval mismatch");
  if (!measure.androidHostSlim) {
    errors.push(
      `GameViewModel.kt has ${measure.androidHostLines} lines (max ${catalog.androidHostMaxLines})`,
    );
  }
  if (!measure.webHostSlim) {
    errors.push(`GameHost.ts has ${measure.webHostLines} lines (max ${catalog.webHostMaxLines})`);
  }
  for (const f of measure.missingFiles) errors.push(`missing file ${f}`);
  for (const s of measure.missingSymbols) errors.push(`missing symbol ${s}`);

  const android = readFileSync(resolve(root, catalog.androidHostPath), "utf8");
  const web = readFileSync(resolve(root, catalog.webHostPath), "utf8");
  if (android.includes("private enum class Panel")) {
    errors.push("GameViewModel still defines private Panel enum");
  }
  if (web.includes("type PanelId =")) {
    errors.push("GameHost still defines local PanelId type");
  }
  if (!android.includes("panels.open") && !android.includes("panels.close")) {
    errors.push("GameViewModel must use ShellPanelController open/close");
  }
  if (!web.includes("this.panels.open") && !web.includes("this.panels.close")) {
    errors.push("GameHost must use ShellPanelController open/close");
  }

  const phase4 = (kickoff.phases as any[])?.find((p) => p.phase === 4);
  if (!phase4) errors.push("kickoff missing phase 4");
  else if (phase4.validate !== "shellctrl:validate") {
    errors.push("kickoff phase 4 validate must be shellctrl:validate");
  }

  if (listing.shellControllerPhase !== 4) errors.push("listing.shellControllerPhase must be 4");
  if (listing.shellControllerCatalog !== "shared/ship/shell-controller.json") {
    errors.push("listing.shellControllerCatalog mismatch");
  }
  if (pin.shellController !== "shared/ship/shell-controller.json") {
    errors.push("RELEASE_PIN.shellController path missing");
  }
  if (!pin.fixtures?.includes("parity-shell-controller.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-shell-controller.json");
  }

  const block = dod.shellController;
  if (!block) errors.push("DoD missing shellController block");
  else {
    if (block.phase !== 4) errors.push("DoD shellController.phase must be 4");
    if (block.plan !== "30_finish_3.0") errors.push("DoD shellController.plan mismatch");
    if (block.status !== "complete") errors.push("DoD shellController.status must be complete");
    if (block.shellControllerMarker !== SHELL_CONTROLLER_MARKER) {
      errors.push("DoD shellController marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  if (!pkg.scripts?.["shellctrl:validate"]) {
    errors.push("package.json missing shellctrl:validate");
  }
  if (!ci.includes("shellctrl:validate")) errors.push("ci.yml missing shellctrl:validate");
  if (!kotlin.includes("PANEL_COUNT")) errors.push("Kotlin ShellController missing PANEL_COUNT");
  if (!kotlin.includes("PANEL_WIRES")) errors.push("Kotlin ShellController missing PANEL_WIRES");

  if (fixture.expect?.panelCount !== 12) errors.push("parity panelCount must be 12");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("shellctrl:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK shellctrl:validate — shared shell controller wired on Android + web");
