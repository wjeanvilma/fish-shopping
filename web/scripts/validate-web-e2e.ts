/**
 * Finish 3.0 Phase 22 — Web Playwright E2E smoke readiness.
 *
 * Usage:
 *   npm run webe2e:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH3_OPEN_GAP_FLAGS } from "../src/ship/finish3Kickoff";
import {
  WEB_E2E,
  WEB_E2E_CLOSES_GAP,
  WEB_E2E_MARKER,
  WEB_E2E_PHASE,
  WEB_E2E_SCHEMA,
  measureWebE2e,
} from "../src/ship/webE2e";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/web-e2e.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-web-e2e.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/WebE2e.kt"),
    "utf8",
  );
  const ids = readFileSync(resolve(root, catalog.idsModule), "utf8");
  const smoke = readFileSync(resolve(root, catalog.smokeSpec), "utf8");
  const config = readFileSync(resolve(root, catalog.playwrightConfig), "utf8");

  if (catalog.phase !== 22) errors.push(`phase expected 22, got ${catalog.phase}`);
  if (catalog.schema !== WEB_E2E_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (WEB_E2E_PHASE !== 22) errors.push("phase mirror mismatch");
  if (catalog.webE2eMarker !== WEB_E2E_MARKER) errors.push("marker mismatch");
  if (fixture.webE2eMarker !== WEB_E2E_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.closesGap !== "webE2eMissing") errors.push("closesGap mismatch");
  if (WEB_E2E_CLOSES_GAP !== "webE2eMissing") errors.push("closesGap mirror mismatch");

  const measure = measureWebE2e(root);
  if (measure.schemaVersion < 24) errors.push("measure schemaVersion must be >= 24");
  if (!measure.idsPresent) errors.push("webE2eIds incomplete");
  if (!measure.idCountOk) errors.push(`id count must be ≥ ${catalog.minIdCount}`);
  if (!measure.smokePresent) errors.push("e2e/smoke.spec.ts incomplete");
  if (!measure.configPresent) errors.push("playwright.config.ts incomplete");
  if (!measure.titleWired) errors.push("TitlePanels data-testid wiring incomplete");
  if (!measure.appWired) errors.push("App.tsx HUD data-testid wiring incomplete");
  if (!measure.packageWired) errors.push("package.json Playwright scripts/deps incomplete");
  if (!measure.gapClosed) errors.push("kickoff.gaps.webE2eMissing must be false");
  if (!measure.kickoffWired) {
    errors.push(
      "kickoff phase 22 must set validate=webe2e:validate, gap closed, measuredAtPhase≥22",
    );
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (WEB_E2E_ID_LIST.length < catalog.minIdCount) {
    errors.push(`WEB_E2E_ID_LIST length ${WEB_E2E_ID_LIST.length} < ${catalog.minIdCount}`);
  }

  for (const id of fixture.expect.requiredIds as string[]) {
    if (!ids.includes(`"${id}"`)) errors.push(`webE2eIds missing "${id}"`);
  }
  for (const needle of fixture.expect.idsSourceMustContain as string[]) {
    if (!ids.includes(needle)) errors.push(`webE2eIds missing ${needle}`);
  }
  for (const needle of fixture.expect.smokeMustContain as string[]) {
    if (!smoke.includes(needle)) errors.push(`smoke.spec missing "${needle}"`);
  }
  for (const needle of fixture.expect.configMustContain as string[]) {
    if (!config.includes(needle)) errors.push(`playwright.config missing "${needle}"`);
  }
  for (const needle of fixture.expect.packageMustContain as string[]) {
    const inPkg =
      JSON.stringify(pkg).includes(needle) ||
      pkg.scripts?.[needle] != null ||
      pkg.devDependencies?.[needle] != null;
    if (!inPkg && needle !== "@playwright/test") {
      // script names checked via scripts map
      if (!pkg.scripts?.[needle] && !JSON.stringify(pkg).includes(`"${needle}"`)) {
        errors.push(`package.json missing ${needle}`);
      }
    }
  }
  if (!pkg.devDependencies?.["@playwright/test"]) {
    errors.push("package.json missing @playwright/test");
  }

  // Finish 4.0 Phase 26 soft-floor: scenario list may grow past Finish 3.0's 2.
  if ((catalog.scenarios as string[]).length < 2) {
    errors.push("catalog must list ≥2 scenarios");
  }

  if (kickoff.gaps?.webE2eMissing !== false) {
    errors.push("kickoff gap webE2eMissing must be false");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("webE2eMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed webE2eMissing");
  }
  const phase22 = (kickoff.phases as any[])?.find((p: any) => p.phase === 22);
  if (!phase22 || phase22.validate !== "webe2e:validate") {
    errors.push("kickoff phase 22 validate must be webe2e:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 22) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 22");
  }

  if (listing.webE2ePhase !== 22) errors.push("listing.webE2ePhase must be 22");
  if (listing.webE2eCatalog !== "shared/ship/web-e2e.json") {
    errors.push("listing.webE2eCatalog mismatch");
  }
  if (pin.webE2e !== "shared/ship/web-e2e.json") errors.push("RELEASE_PIN.webE2e path missing");
  if (!pin.fixtures?.includes("parity-web-e2e.json")) {
    errors.push("RELEASE_PIN missing parity-web-e2e.json");
  }

  const block = dod.webE2e;
  if (!block) errors.push("DoD missing webE2e block");
  else {
    if (block.phase !== 22) errors.push("DoD webE2e.phase must be 22");
    if (block.plan !== "30_finish_3.0") errors.push("DoD webE2e.plan mismatch");
    if (block.status !== "complete") errors.push("DoD webE2e.status must be complete");
    if (block.webE2eMarker !== WEB_E2E_MARKER) errors.push("DoD webE2e marker mismatch");
  }

  if (!pkg.scripts?.["webe2e:validate"]) errors.push("package.json missing webe2e:validate");
  if (!ci.includes("webe2e:validate")) errors.push("ci.yml missing webe2e:validate");
  if (!ci.includes("e2e:smoke") && !ci.includes("playwright test")) {
    errors.push("ci.yml missing Playwright e2e:smoke gate");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("SMOKE_SPEC")) {
    errors.push("Kotlin WebE2e missing constants");
  }

  if (fixture.expect?.closesGap !== "webE2eMissing") {
    errors.push("parity expect.closesGap mismatch");
  }

  for (const gate of WEB_E2E.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("webe2e:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK webe2e:validate — Web Playwright E2E smoke locked");
