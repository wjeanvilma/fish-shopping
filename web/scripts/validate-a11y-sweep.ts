/**
 * Phase 16 (post-1.0) — accessibility & controls sweep gate.
 *
 * Usage:
 *   npm run a11y:validate
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  accessibilitySweep,
  contrastFailures,
  missingKeyboardActions,
  touchTargetMatchesTokens,
} from "../src/presenters/accessibilitySweep";
import { MIN_TOUCH_TARGET_DP } from "../src/presenters/controlQa";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function validate(): string[] {
  const errors: string[] = [];
  if (accessibilitySweep.phase !== 16) errors.push(`phase expected 16, got ${accessibilitySweep.phase}`);
  if (accessibilitySweep.schema !== "fish.a11y.accessibility_sweep.v1") errors.push("bad schema");
  if (!touchTargetMatchesTokens()) errors.push("touch target must be 48dp across tokens/ControlQa/sweep");
  if (MIN_TOUCH_TARGET_DP !== 48) errors.push("MIN_TOUCH_TARGET_DP ≠ 48");

  const fails = contrastFailures();
  for (const p of fails) {
    errors.push(`contrast ${p.id} below ${p.minRatio}`);
  }

  const missing = missingKeyboardActions();
  for (const a of missing) errors.push(`web keyboard missing action ${a}`);

  const css = readFileSync(resolve(root, "web/src/ui/styles.css"), "utf8");
  if (!css.includes("--touch: 48px") && !css.includes("--touch:48px")) {
    errors.push("styles.css missing --touch: 48px");
  }
  if (!css.includes(".button:focus-visible")) errors.push("missing :focus-visible outline");
  // Ghost must use ink (not action) for AA text on surface
  const ghostBlock = css.match(/\.button\.ghost\s*\{[^}]+\}/);
  if (!ghostBlock) errors.push("missing .button.ghost rule");
  else if (!ghostBlock[0].includes("var(--ink)") && !ghostBlock[0].includes("--ink")) {
    errors.push("Phase 16: .button.ghost must use ink color for AA contrast");
  }
  if (ghostBlock && /color:\s*var\(--action\)/.test(ghostBlock[0])) {
    errors.push(".button.ghost still uses action color on surface");
  }

  const controlQa = readFileSync(resolve(root, "web/src/presenters/controlQa.ts"), "utf8");
  if (!controlQa.includes("MIN_TOUCH_TARGET_DP = 48")) errors.push("web ControlQa touch pin");

  const androidControl = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ControlQa.kt"),
    "utf8",
  );
  if (!androidControl.includes("MIN_TOUCH_TARGET_DP = 48")) errors.push("Android ControlQa touch pin");
  for (const action of accessibilitySweep.controls.requiredActions) {
    if (action === "Close panel / pause") {
      if (!androidControl.includes("Close panel / pause")) {
        errors.push(`Android keyboard missing ${action}`);
      }
      continue;
    }
    if (!androidControl.includes(`"${action}"`) && !androidControl.includes(action)) {
      errors.push(`Android keyboard missing ${action}`);
    }
  }

  const joystick = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/Joystick.kt"),
    "utf8",
  );
  if (!joystick.includes(accessibilitySweep.talkBack.android.joystickContentDescription)) {
    errors.push("Joystick missing TalkBack contentDescription");
  }

  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  if (!app.includes(`aria-label="${accessibilitySweep.talkBack.web.harborCanvasAriaLabel}"`)
    && !app.includes("aria-label=\"Harbor\"")) {
    errors.push("Harbor canvas missing aria-label");
  }
  if (!app.includes("Harbor actions") && !app.includes('t("hud.toolbar")')) {
    errors.push("toolbar missing Harbor actions aria-label");
  }

  const tokens = JSON.parse(readFileSync(resolve(root, "shared/tokens/design-tokens.json"), "utf8"));
  if (tokens.size.minTouchTargetDp !== 48) errors.push("design-tokens minTouchTargetDp ≠ 48");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("a11y:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK a11y:validate — 48dp, keyboard, TalkBack hooks, HUD contrast AA");
